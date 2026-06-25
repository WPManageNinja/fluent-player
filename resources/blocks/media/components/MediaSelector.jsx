const { __ } = wp.i18n;
const { Button, Placeholder, TextControl, Notice } = wp.components;
const { useState } = wp.element;
import BunnyCDN from './BunnyCDN';
import BunnyStorage from './BunnyStorage';
import MuxProvider from './MuxProvider';
import MuxStream from './MuxStream';
import { BackArrowSmallSVG, PlusIconSVG, FluentPlayerBlockIconSVG, LockIconSVG } from './common/Icons';
import MediaSelectDropdown from './common/MediaSelectDropdown';
import ProModal from './common/ProModal';

const getMediaSourceLabel = (mediaSource) => {
    switch (mediaSource) {
        case 'youtube':      return __('YouTube', 'fluent-player');
        case 'vimeo':        return __('Vimeo', 'fluent-player');
        case 'bunnycdn':     return __('Bunny Stream', 'fluent-player');
        case 'bunny_storage':return __('BunnyCDN Storage', 'fluent-player');
        case 'mux':          return __('Mux', 'fluent-player');
        case 'mux_stream':     return __('Mux Live', 'fluent-player');
        case 'audio':        return __('Audio', 'fluent-player');
        default:             return __('Media', 'fluent-player');
    }
};

const detectProviderFromUrl = (url) => {
    if (!url) return null;
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
    if (lower.includes('vimeo.com')) return 'vimeo';
    return null;
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
    const [proModalFeature, setProModalFeature] = useState(null);
    const handleProSource = (sourceKey, label) => {
        if (hasPro) {
            setMediaSource(sourceKey);
        } else {
            setProModalFeature(label);
        }
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
                            style={!hasPro ? { opacity: 0.5 } : {}}
                            onClick={() => handleProSource('bunnycdn', __('Bunny Stream', 'fluent-player'))}
                        >
                            {!hasPro && <LockIconSVG size={14} />}
                            {__('Bunny Stream', 'fluent-player')}
                        </Button>
                        <Button
                            className="components-button fp-btn-secondary"
                            style={!hasPro ? { opacity: 0.5 } : {}}
                            onClick={() => handleProSource('bunny_storage', __('BunnyCDN Storage', 'fluent-player'))}
                        >
                            {!hasPro && <LockIconSVG size={14} />}
                            {__('BunnyCDN Storage', 'fluent-player')}
                        </Button>
                        <Button
                            className="components-button fp-btn-secondary"
                            style={!hasPro ? { opacity: 0.5 } : {}}
                            onClick={() => handleProSource('mux', __('Mux', 'fluent-player'))}
                        >
                            {!hasPro && <LockIconSVG size={14} />}
                            {__('Mux', 'fluent-player')}
                        </Button>
                        <Button
                            className="components-button fp-btn-secondary"
                            style={!hasPro ? { opacity: 0.5 } : {}}
                            onClick={() => handleProSource('mux_stream', __('Mux Live', 'fluent-player'))}
                        >
                            {!hasPro && <LockIconSVG size={14} />}
                            {__('Mux Live', 'fluent-player')}
                        </Button>
                        <Button
                            className="components-button fp-btn-secondary"
                            onClick={openAudioLibrary}
                        >
                            {__('Audio', 'fluent-player')}
                        </Button>
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
                                    placeholder={__('Select a media', 'fluent-player')}
                                    searchPlaceholder={__('Search media…', 'fluent-player')}
                                    emptyText={__('No media found', 'fluent-player')}
                                />
                            </div>
                        </>
                    )
                }
            </div>
            {proModalFeature && (
                <ProModal feature={proModalFeature} onClose={() => setProModalFeature(null)} />
            )}
        </Placeholder>
    );
};

export default MediaSelector;
