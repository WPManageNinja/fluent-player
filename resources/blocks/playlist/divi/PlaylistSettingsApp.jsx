/**
 * Playlist settings app for the Divi 5 sidebar. Reuses the block's General/Layout/
 * Appearance panels and edits the SELECTED PLAYLIST via the same REST shape the block
 * uses (PUT /playlist/{id} with { id, settings }) — one source of truth, shared by every
 * placement. Media management stays in the standalone playlist editor. The playlist REST
 * lives in Pro; without it the fetch fails and the app shows an unavailable notice.
 */
const { __ } = wp.i18n;
const { useState, useEffect, useRef, useCallback, useMemo } = wp.element;
const { PanelBody, Spinner, Notice } = wp.components;
const { apiFetch } = wp;

import GeneralSettings from '../components/settings/GeneralSettings.jsx';
import LayoutSettings from '../components/settings/LayoutSettings.jsx';
import AppearanceSettings from '../components/settings/AppearanceSettings.jsx';
import { NotificationProvider } from '../../media/components/common/NotificationContext.jsx';
import NotificationContainer from '../../media/components/common/NotificationContainer.jsx';
import { createMediaSaver } from '../../media/elementor/mediaPersister.js';
import { mergePlaylistSettings } from '../utils/settings.js';
import { buildPlaylistSavePayload } from './helpers';

const restBase = () => {
    const rest = window.fluentPlayerBlockVars?.rest || {};
    return `/${rest.namespace || 'fluent-player'}/${rest.version || 'v2'}`;
};

const noop = () => {};

function SettingsInner({ playlistId, onSaved, debounceMs = 400 }) {
    const [playlistData, setPlaylistData] = useState(null);
    const [medias, setMedias] = useState([]);
    const [status, setStatus] = useState('idle'); // idle | loading | ready | error
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const dataRef = useRef(null);
    const onSavedRef = useRef(onSaved);

    useEffect(() => { dataRef.current = playlistData; }, [playlistData]);
    useEffect(() => { onSavedRef.current = onSaved; }, [onSaved]);

    useEffect(() => {
        let cancelled = false;
        if (!playlistId) { setPlaylistData(null); setStatus('idle'); return undefined; }
        setStatus('loading');
        apiFetch({ path: `${restBase()}/playlist/${playlistId}` })
            .then((res) => {
                if (cancelled) return;
                const settings = mergePlaylistSettings(res?.settings || {});
                setPlaylistData({ ...(res || {}), ID: (res && res.ID) || playlistId, settings });
                setStatus('ready');
            })
            .catch(() => { if (!cancelled) setStatus('error'); });
        return () => { cancelled = true; };
    }, [playlistId]);

    // The canvas owns media add/remove/reorder; keep this app's media snapshot in sync so a
    // settings save doesn't overwrite canvas media edits with a stale list. setPlaylistData
    // directly (not updatePlaylistData) so this sync never schedules a save.
    useEffect(() => {
        const onMediasChanged = (e) => {
            const d = e.detail || {};
            if (String(d.playlistId) !== String(playlistId)) return;
            setPlaylistData((prev) => (prev ? {
                ...prev,
                settings: { ...prev.settings, medias: Array.isArray(d.medias) ? d.medias : (prev.settings?.medias || []) },
            } : prev));
        };
        document.addEventListener('fluentPlayer/playlistMediasChanged', onMediasChanged);
        return () => document.removeEventListener('fluentPlayer/playlistMediasChanged', onMediasChanged);
    }, [playlistId]);

    // Fetch the playlist's media objects so General Settings can render Preset Source /
    // Source Video (both gate on a non-empty medias array — without this the Divi sidebar
    // hardcoded [] and those controls were permanently hidden).
    const mediaIds = playlistData?.settings?.medias;
    const mediaIdsKey = Array.isArray(mediaIds) ? mediaIds.join(',') : '';
    useEffect(() => {
        let cancelled = false;
        if (!mediaIdsKey) { setMedias([]); return undefined; }
        apiFetch({ path: `${restBase()}/media/search?medias=${encodeURIComponent(JSON.stringify(mediaIdsKey.split(',').map(Number)))}` })
            .then((res) => { if (!cancelled && Array.isArray(res)) setMedias(res); })
            .catch(() => { if (!cancelled) setMedias([]); });
        return () => { cancelled = true; };
    }, [mediaIdsKey]);

    // One serializing, debounced saver per playlist: at most one PUT in flight,
    // overlapping edits coalesce to the LATEST snapshot (so a slow older save can't
    // revert newer settings), and failures surface via onError instead of being
    // swallowed. Same guard the media panel uses. Rebuilt when the playlist id changes.
    const saver = useMemo(() => createMediaSaver({
        apiFetch,
        buildPayload: (data) => buildPlaylistSavePayload(playlistId, data),
        getPath: () => `${restBase()}/playlist/${playlistId}`,
        debounceMs,
        onSaved: () => {
            setSaveError(false);
            // Tell the canvas to re-fetch its server-rendered preview.
            document.dispatchEvent(new CustomEvent('fluentPlayer/playlistUpdated', { detail: { playlistId: String(playlistId) } }));
            if (onSavedRef.current) onSavedRef.current();
        },
        onError: () => setSaveError(true),
        onSaving: setSaving,
    }), [playlistId, debounceMs]);

    // Flush (not cancel) a pending save when the id changes or the app unmounts, so an
    // edit made just before switching isn't dropped. flush() never rejects.
    useEffect(() => () => saver.flush(), [saver]);

    const save = useCallback((data) => saver.flush(data), [saver]);

    const updatePlaylistData = useCallback((next) => {
        setPlaylistData((prev) => {
            const resolved = typeof next === 'function' ? next(prev) : next;
            if (resolved && playlistId) {
                saver.schedule(resolved);
                // Push the change to the canvas NOW so it reflects immediately, instead of
                // waiting for the debounced save + a full editor remount.
                document.dispatchEvent(new CustomEvent('fluentPlayer/playlistLivePreview', {
                    detail: { playlistId: String(playlistId), settings: resolved.settings },
                }));
            }
            return resolved;
        });
    }, [saver, playlistId]);

    const updatePlaylistSetting = useCallback((key, value) => {
        updatePlaylistData((prev) => ({
            ...prev,
            settings: { ...(prev?.settings || {}), [key]: value },
        }));
    }, [updatePlaylistData]);

    const onTitleChange = useCallback((value) => updatePlaylistSetting('title', value), [updatePlaylistSetting]);

    if (!playlistId) {
        return <div style={{ padding: 12 }}>{__('Select a playlist to configure it.', 'fluent-player')}</div>;
    }
    if (status === 'loading') {
        return <div style={{ padding: 12 }}><Spinner /> {__('Loading playlist settings…', 'fluent-player')}</div>;
    }
    if (status === 'error' || !playlistData) {
        return (
            <Notice status="error" isDismissible={false}>
                {__('Could not load this playlist. The playlist feature requires Fluent Player Pro.', 'fluent-player')}
            </Notice>
        );
    }

    return (
        <div className="fp-d5-playlist-settings">
            {saving && <div style={{ padding: '4px 12px', fontSize: '11px', opacity: 0.7 }}>{__('Saving…', 'fluent-player')}</div>}
            {saveError && (
                <Notice
                    status="error"
                    isDismissible={false}
                    actions={[{ label: __('Retry', 'fluent-player'), onClick: () => save(dataRef.current) }]}
                >
                    {__('Couldn’t save your changes. Retry, or they may be lost if you leave the editor.', 'fluent-player')}
                </Notice>
            )}

            <PanelBody className="fluent-player-block-panel" title={__('General Settings', 'fluent-player')} initialOpen={true}>
                <GeneralSettings
                    playlistData={playlistData}
                    updatePlaylistData={updatePlaylistData}
                    onTitleChange={onTitleChange}
                    medias={medias}
                    sourceType="playlist"
                    tags={[]}
                    query={{}}
                    onTagsChange={noop}
                    onQueryChange={noop}
                />
            </PanelBody>

            <PanelBody className="fluent-player-block-panel" title={__('Layout', 'fluent-player')} initialOpen={false}>
                <LayoutSettings playlistData={playlistData} updatePlaylistData={updatePlaylistData} />
            </PanelBody>

            <PanelBody className="fluent-player-block-panel" title={__('Appearance', 'fluent-player')} initialOpen={false}>
                <AppearanceSettings
                    playlistData={playlistData}
                    updatePlaylistData={updatePlaylistData}
                    updatePlaylistSetting={updatePlaylistSetting}
                />
            </PanelBody>
        </div>
    );
}

export default function PlaylistSettingsApp(props) {
    return (
        <NotificationProvider>
            <SettingsInner {...props} />
            <NotificationContainer />
        </NotificationProvider>
    );
}
