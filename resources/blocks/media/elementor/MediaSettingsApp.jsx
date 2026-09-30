/**
 * Host-agnostic Fluent Player media settings app.
 *
 * Reuses the block's standalone settings panels (they take mediaData/setMediaData
 * + attributes/setAttributes) and edits the SELECTED MEDIA itself — persisting to
 * the media via the same REST endpoint + payload shape the block uses
 * (PUT /media/{id} with { title, settings, tags }). This makes the Elementor
 * widget's settings behave exactly like the block: one source of truth (the
 * media), shared by every placement.
 *
 * Full block-panel parity: General, Branding, Preset, Chapters, Overlays,
 * Interactive Layers, Subtitles, Tags, Multi-Language, Timed Content.
 * Note: the in-editor "pick timestamp from the video" modal (onVideoModalOpen) is
 * a no-op in this host — timestamps are entered manually; the block canvas owns
 * that modal.
 */
const { __ } = wp.i18n;
const { useState, useEffect, useRef, useCallback, useMemo } = wp.element;
const { PanelBody, Spinner, Notice } = wp.components;
const { apiFetch } = wp;

import { ensureMediaUploadReady } from './ensureMediaUpload.js'; // MediaUpload Slot + underscore compat
import { NotificationProvider } from '../components/common/NotificationContext.jsx';
import NotificationContainer from '../components/common/NotificationContainer.jsx';
import GeneralSettings from '../components/settings/GeneralSettings.jsx';
import BrandingSettings from '../components/settings/BrandingSettings.jsx';
import PresetSelector from '../components/PresetSelector';
import ChapterSettings from '../components/settings/ChapterSettings.jsx';
import OverlaySettings from '../components/settings/OverlaySettings.jsx';
import LayersSettings from '../components/settings/LayersSettings.jsx';
import SubtitleSettings from '../components/settings/SubtitleSettings.jsx';
import TagSettings from '../components/settings/TagSettings.jsx';
import LanguageSwitcher from '../components/settings/LanguageSwitcher.jsx';
import TimedContentStylePanel from '../components/settings/TimedContentStylePanel.jsx';
import TimestampShortcode from '../components/settings/TimestampShortcode.jsx';
import { buildMediaPayload } from './payload.js';
import { createMediaSaver } from './mediaPersister.js';

const restBase = () => {
    const rest = window.fluentPlayerBlockVars?.rest || {};
    return `/${rest.namespace || 'fluent-player'}/${rest.version || 'v2'}`;
};

const noop = () => {};

function SettingsInner({ mediaId, onSaved, debounceMs }) {
    const [mediaData, setMediaData] = useState(null);
    const [presets, setPresets] = useState([]);
    const [status, setStatus] = useState('idle'); // idle | loading | ready | error
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const mediaRef = useRef(null);
    // Kept in a ref so the saver's callbacks stay stable while always invoking
    // the latest host handler (Elementor's preview refresher).
    const onSavedRef = useRef(onSaved);

    useEffect(() => { mediaRef.current = mediaData; }, [mediaData]);
    useEffect(() => { onSavedRef.current = onSaved; }, [onSaved]);

    const loadPresets = useCallback(async () => {
        const res = await apiFetch({ path: `${restBase()}/presets` }).catch(() => []);
        const list = Array.isArray(res) ? res : (res?.presets || []);
        setPresets(list);
        return list;
    }, []);

    // Fetch the selected media + presets when the id changes.
    useEffect(() => {
        let cancelled = false;
        if (!mediaId) { setMediaData(null); setStatus('idle'); return; }
        setStatus('loading');
        Promise.all([
            apiFetch({ path: `${restBase()}/media/${mediaId}` }),
            loadPresets(),
        ]).then(([mediaRes]) => {
            if (cancelled) return;
            setMediaData(mediaRes?.media || mediaRes || null);
            setStatus('ready');
        }).catch(() => { if (!cancelled) setStatus('error'); });
        return () => { cancelled = true; };
    }, [mediaId, loadPresets]);

    // One serializing, debounced saver per media. It guarantees at most one PUT
    // in flight, coalesces overlapping edits to the latest snapshot (so a slow
    // older save can't revert newer settings), and surfaces failures instead of
    // swallowing them. Rebuilt when the media id changes.
    const saver = useMemo(() => createMediaSaver({
        apiFetch,
        buildPayload: buildMediaPayload,
        getPath: () => `${restBase()}/media/${mediaId}`,
        // Hosts that re-fetch a server-rendered preview on save (Divi) can pass a
        // shorter debounce so edits reflect sooner; defaults to createMediaSaver's.
        ...(debounceMs ? { debounceMs } : {}),
        onSaved: () => { setSaveError(false); if (onSavedRef.current) onSavedRef.current(); },
        onError: () => setSaveError(true),
        onSaving: setSaving,
    }), [mediaId, debounceMs]);

    // Flush (not cancel) any pending debounced save when the media changes or the
    // app unmounts, so an edit made just before switching media isn't silently
    // dropped. flush() sends the latest snapshot to the OLD media (the saver's
    // getPath closes over the old id) and never rejects.
    useEffect(() => () => saver.flush(), [saver]);

    // Debounced background persist (same endpoint + shape as the block).
    const persist = useCallback((data) => {
        if (!data || !mediaId) return;
        saver.schedule(data);
    }, [saver, mediaId]);

    const updateMediaData = useCallback((next) => {
        setMediaData((prev) => {
            const resolved = typeof next === 'function' ? next(prev) : next;
            persist(resolved);
            // Live preview: tell the canvas player to apply branding colours NOW, before the
            // debounced save + HTML re-fetch — so a colour change has immediate effect. The
            // per-builder bridge forwards this to the canvas document when they differ.
            if (resolved && resolved.settings && mediaId) {
                document.dispatchEvent(new CustomEvent('fluentPlayer/settingsPreview', {
                    detail: {
                        mediaId: String(mediaId),
                        settings: resolved.settings,
                        defaultSettings: (window.fluentPlayerBlockVars && window.fluentPlayerBlockVars.defaultSettings) || {},
                    },
                }));
            }
            return resolved;
        });
    }, [persist, mediaId]);

    // Imperative save for panels that need the saved media back (e.g. subtitles).
    // Cancels any pending debounce and persists the newest snapshot immediately.
    const saveMediaToServer = useCallback(async () => {
        const data = mediaRef.current;
        if (!data || !mediaId) return null;
        return saver.flush(data);
    }, [saver, mediaId]);

    // Panels also accept attributes/setAttributes (block shape); media id is fixed here.
    const attributes = { mediaId };
    const setAttributes = noop;
    const defaultSettings = window.fluentPlayerBlockVars?.defaultSettings || {};

    if (!mediaId) {
        return <div className="fp-el-settings-empty" style={{ padding: '12px' }}>{__('Select a media to configure its player.', 'fluent-player')}</div>;
    }
    if (status === 'loading') {
        return <div className="fp-el-settings-loading" style={{ padding: '12px' }}><Spinner /> {__('Loading player settings…', 'fluent-player')}</div>;
    }
    if (status === 'error' || !mediaData) {
        return <Notice status="error" isDismissible={false}>{__('Could not load this media.', 'fluent-player')}</Notice>;
    }

    const timedStyle = (mediaData.settings || {}).timedContentStyle || {};
    const onTimedStyleChange = (style) => updateMediaData((prev) => ({
        ...prev,
        settings: { ...(prev.settings || {}), timedContentStyle: style },
    }));

    return (
        <div className="fp-el-settings">
            {saving && <div className="fp-el-settings-saving" style={{ padding: '4px 12px', fontSize: '11px', opacity: 0.7 }}>{__('Saving…', 'fluent-player')}</div>}
            {saveError && (
                <Notice
                    status="error"
                    isDismissible={false}
                    className="fp-el-settings-save-error"
                    actions={[{ label: __('Retry', 'fluent-player'), onClick: () => saver.flush(mediaRef.current) }]}
                >
                    {__('Couldn’t save your changes. They’re still here — retry, or they may be lost if you leave the editor.', 'fluent-player')}
                </Notice>
            )}

            <PanelBody className="fluent-player-block-panel" title={__('General Settings', 'fluent-player')} initialOpen={true}>
                <GeneralSettings attributes={attributes} setAttributes={setAttributes} mediaData={mediaData} setMediaData={updateMediaData} />
            </PanelBody>

            <PanelBody className="fluent-player-block-panel" title={__('Branding', 'fluent-player')} initialOpen={false}>
                <BrandingSettings mediaData={mediaData} setMediaData={updateMediaData} />
            </PanelBody>

            <PanelBody className="fluent-player-block-panel" title={__('Preset', 'fluent-player')} initialOpen={false}>
                <PresetSelector
                    presets={presets}
                    fetchPresets={loadPresets}
                    defaultSettings={defaultSettings}
                    mediaData={mediaData}
                    setMediaData={updateMediaData}
                    requestPath={restBase()}
                    onVideoModalOpen={noop}
                />
            </PanelBody>

            <PanelBody className="fluent-player-block-panel" title={__('Chapters', 'fluent-player')} initialOpen={false}>
                <ChapterSettings mediaData={mediaData} setMediaData={updateMediaData} presets={presets} onVideoModalOpen={noop} />
            </PanelBody>

            <PanelBody className="fluent-player-block-panel" title={__('Text/Button Overlays', 'fluent-player')} initialOpen={false}>
                <OverlaySettings mediaData={mediaData} setMediaData={updateMediaData} presets={presets} onVideoModalOpen={noop} />
            </PanelBody>

            <PanelBody className="fluent-player-block-panel" title={__('Interactive Layers', 'fluent-player')} initialOpen={false}>
                <LayersSettings mediaData={mediaData} setMediaData={updateMediaData} requestPath={restBase()} presets={presets} onVideoModalOpen={noop} />
            </PanelBody>

            <PanelBody className="fluent-player-block-panel" title={__('Subtitles', 'fluent-player')} initialOpen={false}>
                <SubtitleSettings mediaData={mediaData} setMediaData={updateMediaData} setPersistedMediaData={updateMediaData} saveMediaToServer={saveMediaToServer} />
            </PanelBody>

            <PanelBody className="fluent-player-block-panel" title={__('Tags', 'fluent-player')} initialOpen={false}>
                <TagSettings mediaData={mediaData} setMediaData={updateMediaData} />
            </PanelBody>

            <PanelBody className="fluent-player-block-panel" title={__('Multi-Language', 'fluent-player')} initialOpen={false}>
                <LanguageSwitcher mediaData={mediaData} setMediaData={updateMediaData} />
            </PanelBody>

            <PanelBody className="fluent-player-block-panel" title={__('Timed Content Area', 'fluent-player')} initialOpen={false}>
                <TimedContentStylePanel style={timedStyle} onChange={onTimedStyleChange} />
            </PanelBody>

            <PanelBody className="fluent-player-block-panel" title={__('Timestamp Links', 'fluent-player')} initialOpen={false}>
                <TimestampShortcode mediaData={mediaData} />
            </PanelBody>
        </div>
    );
}

export default function MediaSettingsApp(props) {
    // Run after mount (client, once all builder scripts have settled) so the MediaUpload
    // Slot fill + the Underscore/Lodash media-library compat shim apply against the final
    // window._ — running them at import time is too early in a page-builder window.
    useEffect(() => { ensureMediaUploadReady(); }, []);

    return (
        <NotificationProvider>
            <SettingsInner {...props} />
            <NotificationContainer />
        </NotificationProvider>
    );
}
