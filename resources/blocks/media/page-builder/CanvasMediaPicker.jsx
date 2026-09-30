/**
 * Media picker for the page-builder editor CANVAS (Elementor / Divi). A thin adapter around
 * the block's real MediaSelector, so it gets the full experience — all free sources, the real
 * Pro sources (when Pro is active), and the "Select Existing Media" dropdown. Instead of the
 * block's editor-store engine it supplies a lean saveMediaToServer (create over REST) and
 * reports the chosen/created id through onSelected, which the host writes to the element.
 */
const { __ } = wp.i18n;
const { useState } = wp.element;
const apiFetch = wp.apiFetch;

import MediaSelector from '../components/MediaSelector.jsx';
import { createMediaFromSource, fetchMediaMetaData } from './canvasMediaCreate.js';

export default function CanvasMediaPicker({ onSelected }) {
    const [url, setUrl] = useState('');
    const [mediaSource, setMediaSource] = useState(null);
    const [error, setError] = useState(null);

    const pick = (id) => { if (id) onSelected(String(id)); };

    // Create a media from a chosen source (free OR Pro) and report its id. Pro provider forms
    // call this with their prepared media object, so real Pro sources work with no extra glue.
    const saveMediaToServer = async (mediaToSave) => {
        if (!mediaToSave) return null;
        setError(null);
        try {
            const media = await createMediaFromSource(apiFetch, mediaToSave);
            pick(media && (media.ID || media.id));
            return media;
        } catch (e) {
            setError((e && e.message) || __('Failed to create the media. Please try again.', 'fluent-player'));
            return null;
        }
    };

    // Paste-a-URL / YouTube / Vimeo: resolve metadata, then create.
    const processAndLoadVideo = async (sourceOverride) => {
        if (!url) return;
        const source = typeof sourceOverride === 'string' ? sourceOverride : mediaSource;
        setError(null);
        try {
            const meta = (await fetchMediaMetaData(apiFetch, url)) || {};
            const isUrl = source === 'url' || !source;
            const provider = !isUrl ? source
                : meta.provider ? meta.provider
                : meta.provider_name === 'YouTube' ? 'youtube'
                : meta.provider_name === 'Vimeo' ? 'vimeo'
                : 'external';
            const isAudio = isUrl && (meta.media_type || meta.type) === 'audio';
            await saveMediaToServer({
                title: meta.title || __('Untitled media', 'fluent-player'),
                src: meta.url || url,
                provider,
                ...(meta.attachment_id ? { attachment_id: meta.attachment_id } : {}),
                posterSrc: meta.thumbnail_url || '',
                viewType: isAudio ? 'audio' : 'video',
                settings: {
                    duration: meta.duration || 0,
                    ...(isAudio ? { mediaType: 'audio' } : {}),
                    ...(/youtube\.com\/shorts\//.test(url) ? { is_short: true, aspectRatio: '9:16' } : {}),
                },
            });
        } catch (e) {
            setError((e && e.message) || __('Failed to fetch media metadata.', 'fluent-player'));
        }
    };

    const openLibrary = (type) => {
        try {
            const frame = window.wp.media({
                title: type === 'audio' ? __('Select or Upload Audio', 'fluent-player') : __('Select or Upload Video', 'fluent-player'),
                button: { text: type === 'audio' ? __('Use this audio', 'fluent-player') : __('Use this video', 'fluent-player') },
                multiple: false,
                library: { type },
            });
            frame.on('select', () => {
                const a = frame.state().get('selection').first().toJSON();
                saveMediaToServer({
                    title: a.title || __('Untitled Media', 'fluent-player'),
                    provider: 'wordpress',
                    src: a.url,
                    attachment_id: a.id,
                    viewType: type === 'audio' ? 'audio' : 'video',
                });
            });
            frame.open();
        } catch (e) {
            setError(__('There was an error opening the media library. Please try again.', 'fluent-player'));
        }
    };

    return (
        <MediaSelector
            mediaItems={[]}
            selectedMedia={''}
            handleMediaSelect={pick}
            setMediaSource={setMediaSource}
            openMediaLibrary={() => openLibrary('video')}
            mediaSource={mediaSource}
            url={url}
            setUrl={setUrl}
            processAndLoadVideo={processAndLoadVideo}
            openAudioLibrary={() => openLibrary('audio')}
            error={error}
            attributes={{}}
            setAttributes={() => {}}
            mediaData={null}
            setMediaData={() => {}}
            defaultSettings={(window.fluentPlayerBlockVars && window.fluentPlayerBlockVars.defaultSettings) || {}}
            isDedicatedPlayer={false}
            setSelectedMedia={pick}
            saveMediaToServer={saveMediaToServer}
        />
    );
}
