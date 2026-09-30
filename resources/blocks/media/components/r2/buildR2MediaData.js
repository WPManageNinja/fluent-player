/**
 * Build the media payload for a Cloudflare R2 object (uploaded or browsed),
 * ready to POST to the free /media endpoint via saveMediaToServer.
 *
 * Pure (no wp globals) so it can be unit-tested. The component localizes the
 * fallback label and passes it in as `untitledLabel`.
 *
 * @param {Object} object  { key, name, size, public_url, duration }
 * @param {Object} options { presetSlug, untitledLabel }
 * @returns {Object} { title, settings }
 */
export function buildR2MediaData(object = {}, options = {}) {
    const presetSlug = options.presetSlug || 'course';
    const untitledLabel = options.untitledLabel || 'Untitled R2 Video';

    const title = object.name || untitledLabel;
    // Public-only: the public URL is the directly-playable delivery address.
    const src = object.public_url || '';

    return {
        title,
        settings: {
            provider: 'cloudflare_r2',
            src,
            posterSrc: '',
            title,
            post_status: options.postStatus || 'publish',
            viewType: 'video',
            playsInline: true,
            mutedAutoplay: false,
            autoplay: false,
            loadStrategy: 'visible',
            aspectRatio: 'default',
            save_play_position: false,
            preset_slug: presetSlug,
            r2: {
                key: object.key || '',
                size: object.size || 0,
            },
            streamType: 'on-demand',
            mediaType: 'video',
            duration: object.duration || 0,
        },
    };
}
