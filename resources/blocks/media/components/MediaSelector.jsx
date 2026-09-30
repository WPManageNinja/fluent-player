const { __, sprintf } = wp.i18n;
const { Button, Placeholder, TextControl, Notice } = wp.components;
const { useState, useEffect, useRef, useCallback } = wp.element;
const apiFetch = wp.apiFetch;
import BunnyCDN from './BunnyCDN';
import BunnyStorage from './BunnyStorage';
import MuxProvider from './MuxProvider';
import MuxStream from './MuxStream';
import GumletProvider from './GumletProvider';
import GumletStream from './GumletStream';
import { isProProviderUsable, shouldOfferProProvider } from './common/providerAvailability.js';
import R2 from './R2';
import CloudflareStream from './CloudflareStream';
import { BackArrowSmallSVG, PlusIconSVG, FluentPlayerBlockIconSVG, LockIconSVG, GeneralSettingsIconSVG } from './common/Icons';
import MediaSelectDropdown from './common/MediaSelectDropdown';
import { mediaLoadPage } from './common/mediaSearch.js';
import ProModal from './common/ProModal';

// Block source key -> Storage integration key, for routing to a provider's setup page.
const PROVIDER_SETTINGS_KEY = {
    bunnycdn:          'bunnycdn_stream',
    bunny_storage:     'bunnycdn_storage',
    mux:               'mux',
    mux_stream:        'mux',
    gumlet:            'gumlet',
    gumlet_live:       'gumlet',
    cloudflare_r2:     'cloudflare_r2',
    cloudflare_stream: 'cloudflare_stream',
};

const getMediaSourceLabel = (mediaSource) => {
    switch (mediaSource) {
        case 'youtube':      return __('YouTube', 'fluent-player');
        case 'vimeo':        return __('Vimeo', 'fluent-player');
        case 'bunnycdn':     return __('Bunny Stream', 'fluent-player');
        case 'bunny_storage':return __('BunnyCDN Storage', 'fluent-player');
        case 'mux':          return __('Mux', 'fluent-player');
        case 'mux_stream':     return __('Mux Live', 'fluent-player');
        case 'gumlet':       return __('Gumlet', 'fluent-player');
        case 'gumlet_live':  return __('Gumlet Live', 'fluent-player');
        case 'cloudflare_r2':return __('Cloudflare R2', 'fluent-player');
        case 'cloudflare_stream': return __('Cloudflare Stream', 'fluent-player');
        case 'audio':        return __('Audio', 'fluent-player');
        default:             return __('Media', 'fluent-player');
    }
};

const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav', 'aac', 'ogg', 'oga', 'flac'];

// Mirrors DynamicMediaSourceResolver::classify() for instant feedback;
// the server re-classifies on save, so this is display-only.
const classifyUrl = (url) => {
    const trimmed = (url || '').trim();
    if (!/^https?:\/\//i.test(trimmed)) return null;
    const lower = trimmed.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return { provider: 'youtube', mediaType: 'video' };
    if (lower.includes('vimeo.com')) return { provider: 'vimeo', mediaType: 'video' };
    let extension = '';
    try {
        const path = new URL(trimmed).pathname;
        const dot = path.lastIndexOf('.');
        if (dot !== -1) extension = path.slice(dot + 1).toLowerCase();
    } catch {
        return null;
    }
    return {
        provider: 'external',
        mediaType: AUDIO_EXTENSIONS.includes(extension) ? 'audio' : 'video',
        isHls: extension === 'm3u8',
    };
};

const getDetectionLabel = (detection) => {
    if (detection.provider === 'youtube') return __('Detected: YouTube video', 'fluent-player');
    if (detection.provider === 'vimeo') return __('Detected: Vimeo video', 'fluent-player');
    if (detection.isHls) return __('Detected: HLS stream', 'fluent-player');
    if (detection.mediaType === 'audio') return __('Detected: audio file', 'fluent-player');
    return __('Detected: video URL', 'fluent-player');
};

/**
 * Enhanced Media Selector component that handles both media selection and media source forms
 */
const MediaSelector = ({
    mediaItems,
    selectedMedia,
    handleMediaSelect,
    setMediaSource,
    openMediaLibrary,
    mediaSource,
    url,
    setUrl,
    processAndLoadVideo,
    openAudioLibrary,
    error,
    attributes,
    setAttributes,
    mediaData,
    setMediaData,
    defaultSettings,
    isDedicatedPlayer,
    setSelectedMedia,
    saveMediaToServer
}) => {
    const hasPro = !!window.fluentPlayerBlockVars?.hasPro;
    // Contract: pro_providers and connected_providers are keyed by this
    // picker's SOURCE keys (bunnycdn, mux_stream, ...) — not service-layer
    // provider slugs ('bunny') nor integration keys ('bunnycdn_stream').
    // Providers the running Pro build actually supports (has REST routes for).
    // Guards the free-first merge window: newer free + older Pro must not offer
    // providers whose endpoints don't exist yet.
    const proProviders = window.fluentPlayerBlockVars?.pro_providers || [];
    // Providers whose integration is enabled (connected). A Pro-active but
    // disconnected provider is dimmed and routed to its setup page instead of
    // opening a form that can't work yet. `connectionAware` distinguishes a Pro
    // that reports connection state (key present, even if empty) from an older
    // Pro that doesn't (key absent) — without it, older Pro would mark every
    // provider "Not connected".
    const connectionAware = Array.isArray(window.fluentPlayerBlockVars?.connected_providers);
    const connectedProviders = window.fluentPlayerBlockVars?.connected_providers || [];
    const storageConfigBaseUrl = window.fluentPlayerBlockVars?.storageConfigBaseUrl || '';
    const [proModalFeature, setProModalFeature] = useState(null);
    const [showMoreSources, setShowMoreSources] = useState(false);

    // Server-side, paged media search for the dropdown.
    const loadMediaPage = useCallback(({ query, page }) => mediaLoadPage(apiFetch, { query, page }), []);

    // On a fresh dedicated-media editor, land the caret in the URL field so
    // paste-to-create needs zero clicks. Delayed past Gutenberg's own title focus.
    const urlFormRef = useRef(null);
    useEffect(() => {
        if (!isDedicatedPlayer || !wp.data?.select('core/editor')?.isCleanNewPost()) {
            return;
        }
        const timer = setTimeout(() => urlFormRef.current?.querySelector('input')?.focus(), 150);
        return () => clearTimeout(timer);
    }, []);

    // Gumlet keys stay gated on Pro advertising them (free-first merge window);
    // legacy providers predate pro_providers and are always offered.
    const offeredProSources = [
        ['bunnycdn', __('Bunny Stream', 'fluent-player')],
        ['bunny_storage', __('BunnyCDN Storage', 'fluent-player')],
        ['mux', __('Mux', 'fluent-player')],
        ['mux_stream', __('Mux Live', 'fluent-player')],
        ['gumlet', __('Gumlet', 'fluent-player')],
        ['gumlet_live', __('Gumlet Live', 'fluent-player')],
        ['cloudflare_r2', __('Cloudflare R2', 'fluent-player')],
        ['cloudflare_stream', __('Cloudflare Stream', 'fluent-player')],
    ].filter(([key]) =>
        (key !== 'gumlet' && key !== 'gumlet_live') || shouldOfferProProvider(key, hasPro, proProviders)
    );
    const connectedProSources = offeredProSources.filter(([key]) => connectedProviders.includes(key));
    const unconnectedProSources = offeredProSources.filter(([key]) => !connectedProviders.includes(key));

    const openProviderSetup = (sourceKey) => {
        const settingsKey = PROVIDER_SETTINGS_KEY[sourceKey];
        if (storageConfigBaseUrl && settingsKey) {
            window.open(storageConfigBaseUrl + settingsKey, '_blank', 'noopener');
        }
    };

    // Inlined (not a nested component) so React doesn't remount the buttons on
    // every render.
    const renderProSource = (sourceKey, label) => {
        const locked = !hasPro;
        const notConnected = hasPro && connectionAware && !connectedProviders.includes(sourceKey);
        // Pro only sends the settings deep-link to users who can open the
        // settings page; without it the button informs instead of navigating.
        const canOpenSetup = !!(storageConfigBaseUrl && PROVIDER_SETTINGS_KEY[sourceKey]);
        const onClick = () => {
            if (locked) return setProModalFeature(label);
            if (notConnected) return canOpenSetup ? openProviderSetup(sourceKey) : undefined;
            return setMediaSource(sourceKey);
        };
        let ariaLabel;
        let title;
        if (locked) {
            ariaLabel = sprintf(__('%s — available in Pro', 'fluent-player'), label);
            title = __('Available in Pro', 'fluent-player');
        } else if (notConnected) {
            ariaLabel = canOpenSetup
                ? sprintf(__('%s — not connected, opens setup', 'fluent-player'), label)
                : sprintf(__('%s — not connected, ask an administrator to set it up', 'fluent-player'), label);
            title = canOpenSetup
                ? __('Not connected — click to set it up', 'fluent-player')
                : __('Not connected — ask an administrator to set it up', 'fluent-player');
        }
        return (
            <Button
                key={sourceKey}
                className="components-button fp-btn-secondary"
                style={(locked || notConnected) ? { opacity: 0.6 } : {}}
                onClick={onClick}
                aria-label={ariaLabel}
                title={title}
            >
                {locked && <LockIconSVG size={14} />}
                {label}
                {notConnected && (
                    <span className="fluent-player-provider-status" aria-hidden="true">
                        <GeneralSettingsIconSVG />
                    </span>
                )}
            </Button>
        );
    };

    // If a media source is selected, show the appropriate form
    if (mediaSource) {
        return (
            <Placeholder
                icon={<FluentPlayerBlockIconSVG />}
                label={__('FluentPlayer Media', 'fluent-player')}
                instructions={__(`Add ${getMediaSourceLabel(mediaSource)} media`, 'fluent-player')}
            >

                {mediaSource === 'youtube' && (
                    <form className="fluent-player-youtube-form" onSubmit={(e) => { e.preventDefault(); processAndLoadVideo(); }}>
                        <TextControl
                            label={__('YouTube URL', 'fluent-player')}
                            value={url}
                            onChange={setUrl}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="fluent-player-full-width-input"
                            help={__('Enter a YouTube video URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)', 'fluent-player')}
                            autoFocus
                        />
                        {error && <Notice status="error" isDismissible={false}>{error}</Notice>}
                        <div className="fluent-player-form-actions">
                            <Button
                                className="components-button fp-btn-secondary"
                                onClick={() => { setUrl(''); setMediaSource(null); }}
                            >
                                <BackArrowSmallSVG />
                                {__('Back to Media Selector', 'fluent-player')}
                            </Button>
                            <Button
                                type="submit"
                                className="components-button fp-btn-primary"
                            >
                                <PlusIconSVG />
                                {__('Add YouTube Video', 'fluent-player')}
                            </Button>
                        </div>
                    </form>
                )}

                {mediaSource === 'vimeo' && (
                    <form className="fluent-player-vimeo-form" onSubmit={(e) => { e.preventDefault(); processAndLoadVideo(); }}>
                        <TextControl
                            label={__('Vimeo URL', 'fluent-player')}
                            value={url}
                            onChange={setUrl}
                            placeholder="https://vimeo.com/..."
                            className="fluent-player-full-width-input"
                            help={__('Enter a Vimeo video URL (e.g., https://vimeo.com/VIDEO_ID)', 'fluent-player')}
                            autoFocus
                        />
                        {error && <Notice status="error" isDismissible={false}>{error}</Notice>}
                        <div className="fluent-player-form-actions">
                            <Button
                                className="components-button fp-btn-secondary"
                                onClick={() => { setUrl(''); setMediaSource(null); }}
                            >
                                <BackArrowSmallSVG />
                                {__('Back to Media Selector', 'fluent-player')}
                            </Button>
                            <Button
                                type="submit"
                                className="components-button fp-btn-primary"
                            >
                                <PlusIconSVG />
                                {__('Add Vimeo Video', 'fluent-player')}
                            </Button>
                        </div>
                    </form>
                )}

                {mediaSource === 'bunnycdn' && (
                    <BunnyCDN
                        attributes={attributes}
                        setAttributes={setAttributes}
                        mediaData={mediaData}
                        setMediaData={setMediaData}
                        onCancel={() => setMediaSource(null)}
                        setSelectedMedia={setSelectedMedia}
                        defaultSettings={defaultSettings}
                        saveMediaToServer={saveMediaToServer}
                    />
                )}

                {mediaSource === 'bunny_storage' && (
                    <BunnyStorage
                        attributes={attributes}
                        setAttributes={setAttributes}
                        mediaData={mediaData}
                        setMediaData={setMediaData}
                        onCancel={() => setMediaSource(null)}
                        setSelectedMedia={setSelectedMedia}
                        defaultSettings={defaultSettings}
                        saveMediaToServer={saveMediaToServer}
                    />
                )}

                {hasPro && mediaSource === 'mux' && (
                    <MuxProvider
                        attributes={attributes}
                        setAttributes={setAttributes}
                        mediaData={mediaData}
                        setMediaData={setMediaData}
                        onCancel={() => setMediaSource(null)}
                        setSelectedMedia={setSelectedMedia}
                        defaultSettings={defaultSettings}
                        saveMediaToServer={saveMediaToServer}
                    />
                )}

                {hasPro && mediaSource === 'mux_stream' && (
                    <MuxStream
                        attributes={attributes}
                        setAttributes={setAttributes}
                        mediaData={mediaData}
                        setMediaData={setMediaData}
                        onCancel={() => setMediaSource(null)}
                        setSelectedMedia={setSelectedMedia}
                        defaultSettings={defaultSettings}
                        saveMediaToServer={saveMediaToServer}
                    />
                )}

                {isProProviderUsable('gumlet', hasPro, proProviders) && mediaSource === 'gumlet' && (
                    <GumletProvider
                        attributes={attributes}
                        setAttributes={setAttributes}
                        mediaData={mediaData}
                        setMediaData={setMediaData}
                        onCancel={() => setMediaSource(null)}
                        setSelectedMedia={setSelectedMedia}
                        defaultSettings={defaultSettings}
                        saveMediaToServer={saveMediaToServer}
                    />
                )}

                {hasPro && mediaSource === 'cloudflare_r2' && (
                    <R2
                        attributes={attributes}
                        setAttributes={setAttributes}
                        mediaData={mediaData}
                        setMediaData={setMediaData}
                        onCancel={() => setMediaSource(null)}
                        setSelectedMedia={setSelectedMedia}
                        defaultSettings={defaultSettings}
                        saveMediaToServer={saveMediaToServer}
                    />
                )}

                {isProProviderUsable('gumlet_live', hasPro, proProviders) && mediaSource === 'gumlet_live' && (
                    <GumletStream
                        attributes={attributes}
                        setAttributes={setAttributes}
                        mediaData={mediaData}
                        setMediaData={setMediaData}
                        onCancel={() => setMediaSource(null)}
                        setSelectedMedia={setSelectedMedia}
                        defaultSettings={defaultSettings}
                        saveMediaToServer={saveMediaToServer}
                    />
                )}

                {hasPro && mediaSource === 'cloudflare_stream' && (
                    <CloudflareStream
                        defaultSettings={defaultSettings}
                        saveMediaToServer={saveMediaToServer}
                        onCancel={() => setMediaSource(null)}
                    />
                )}
            </Placeholder>
        );
    }

    // Otherwise show the main media selection options
    return (
        <Placeholder
            icon={<FluentPlayerBlockIconSVG />}
            label={ __('FluentPlayer Media', 'fluent-player') }
            instructions={
                isDedicatedPlayer ?
                    __('Add a new media from different sources', 'fluent-player') :
                    __('Select an existing media or add a new one from different sources', 'fluent-player')
            }
        >
            <div className="fluent-player-media-options">
                <div>
                    <div className="fluent-player-media-buttons">
                        <Button
                            className="components-button fp-btn-secondary"
                            onClick={openMediaLibrary}
                        >
                            {__('Media Library', 'fluent-player')}
                        </Button>
                        <Button
                            className="components-button fp-btn-secondary"
                            onClick={() => setMediaSource('youtube')}
                        >
                            {__('YouTube', 'fluent-player')}
                        </Button>
                        <Button
                            className="components-button fp-btn-secondary"
                            onClick={() => setMediaSource('vimeo')}
                        >
                            {__('Vimeo', 'fluent-player')}
                        </Button>
                        <Button
                            className="components-button fp-btn-secondary"
                            onClick={openAudioLibrary}
                        >
                            {__('Audio', 'fluent-player')}
                        </Button>
                        {hasPro ? (
                            connectionAware ? (
                                <>
                                    {connectedProSources.map(([key, label]) => renderProSource(key, label))}
                                    {showMoreSources && unconnectedProSources.map(([key, label]) => renderProSource(key, label))}
                                    {unconnectedProSources.length > 0 && (
                                        <Button
                                            variant="link"
                                            className="components-button fluent-player-more-sources"
                                            aria-expanded={showMoreSources}
                                            onClick={() => setShowMoreSources(!showMoreSources)}
                                        >
                                            {showMoreSources
                                                ? __('Show fewer sources', 'fluent-player')
                                                : sprintf(__('More sources (%d)', 'fluent-player'), unconnectedProSources.length)}
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <>
                                    {offeredProSources.map(([key, label]) => renderProSource(key, label))}
                                </>
                            )
                        ) : (
                            <>
                                {renderProSource('bunnycdn', __('Bunny Stream', 'fluent-player'))}
                                {renderProSource('mux', __('Mux', 'fluent-player'))}
                                <Button
                                    variant="link"
                                    className="components-button fluent-player-more-sources"
                                    onClick={() => setProModalFeature(__('premium video sources', 'fluent-player'))}
                                >
                                    {__('More sources in Pro →', 'fluent-player')}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
                {
                    !isDedicatedPlayer && (
                        <>
                            <div className="fluent-player-media-separator">
                                <span>{ __('OR', 'fluent-player') }</span>
                            </div>
                            <div className="fluent-player-existing-media">
                                <h4>{ __('Select Existing Media', 'fluent-player') }</h4>
                                <MediaSelectDropdown
                                    items={mediaItems}
                                    value={selectedMedia || ''}
                                    onChange={handleMediaSelect}
                                    loadPage={loadMediaPage}
                                    placeholder={__('Select a media', 'fluent-player')}
                                    searchPlaceholder={__('Search media…', 'fluent-player')}
                                    emptyText={__('No media found', 'fluent-player')}
                                />
                            </div>
                        </>
                    )
                }
                <div className="fluent-player-media-separator">
                    <span>{ __('OR', 'fluent-player') }</span>
                </div>
                {(() => {
                    const detection = classifyUrl(url);
                    return (
                        <form
                            ref={urlFormRef}
                            className="fluent-player-url-paste"
                            onSubmit={(e) => { e.preventDefault(); if (detection) processAndLoadVideo('url'); }}
                        >
                            <TextControl
                                label={__('Paste a media URL', 'fluent-player')}
                                value={url}
                                onChange={setUrl}
                                placeholder="https://example.com/video.mp4"
                                className="fluent-player-full-width-input"
                                help={__('YouTube, Vimeo, or a direct video, audio, or HLS file — the source is detected automatically.', 'fluent-player')}
                            />
                            {error && <Notice status="error" isDismissible={false}>{error}</Notice>}
                            {url && (
                                <div className="fluent-player-url-detection">
                                    <span role="status" aria-live="polite">
                                        {detection
                                            ? getDetectionLabel(detection)
                                            : __('Enter a full URL starting with http:// or https://', 'fluent-player')}
                                    </span>
                                    <Button
                                        type="submit"
                                        className="components-button fp-btn-primary"
                                        disabled={!detection}
                                    >
                                        <PlusIconSVG />
                                        {__('Add Media', 'fluent-player')}
                                    </Button>
                                </div>
                            )}
                        </form>
                    );
                })()}
            </div>
            {proModalFeature && (
                <ProModal feature={proModalFeature} onClose={() => setProModalFeature(null)} />
            )}
        </Placeholder>
    );
};

export default MediaSelector;
