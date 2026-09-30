/**
 * Build the PUT /media/{id} payload the Elementor settings host sends to persist
 * a media's settings. Mirrors the block's saveMediaToServer shape exactly
 * ({ title, settings, tags } with an aspectRatio fallback) so the two hosts write
 * the media identically. Kept pure + wp-free so it can be unit-tested.
 *
 * @param {Object} mediaData
 * @returns {{title: any, settings: Object, tags: any[]}}
 */
export function buildMediaPayload(mediaData) {
    const data = mediaData || {};
    const settings = data.settings || {};
    return {
        title: data.title,
        settings: { ...settings, aspectRatio: settings.aspectRatio || 'default' },
        tags: data.tags || [],
    };
}
