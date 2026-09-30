/**
 * Lean media-creation helpers for the page-builder canvas picker. The Gutenberg block owns a
 * large media-state engine; the canvas picker only needs to CREATE a media from a chosen
 * source and hand back its id, so these mirror the block's create/metadata REST calls without
 * its editor-store coupling.
 */

/** REST base path, e.g. "fluent-player/v2", from the localized blockVars. */
export function apiBasePath() {
    const rest = (window.fluentPlayerBlockVars && window.fluentPlayerBlockVars.rest) || {};
    return `${rest.namespace || 'fluent-player'}/${rest.version || 'v2'}`;
}

/** Fetch oEmbed/metadata for a pasted or provider URL. Returns the metadata object or null. */
export function fetchMediaMetaData(apiFetch, url) {
    return apiFetch({ path: `${apiBasePath()}/media/metadata?url=${encodeURIComponent(url)}` })
        .catch(() => null);
}

/**
 * Create a fluent_player_media from a chosen source and return the created record (with ID).
 * Mirrors the block's saveMediaToServer create branch: a published media with sensible
 * defaults, caller settings merged last.
 *
 * @param {Function} apiFetch  wp.apiFetch
 * @param {{title?:string, src:string, provider:string, viewType?:string, posterSrc?:string, attachment_id?:number, settings?:object, tags?:array}} media
 * @returns {Promise<object>} the created media (has ID)
 */
export async function createMediaFromSource(apiFetch, media) {
    const d = (window.fluentPlayerBlockVars && window.fluentPlayerBlockVars.defaultSettings) || {};

    const settings = {
        title: media.title || 'Untitled Media',
        post_status: 'publish',
        src: media.src,
        provider: media.provider,
        posterSrc: media.posterSrc || '',
        viewType: media.viewType || 'video',
        attachment_id: media.attachment_id,
        preset_slug: d.defaultPresetSlug || 'course',
        playsInline: true,
        mutedAutoplay: false,
        autoplay: false,
        loadStrategy: 'visible',
        preload: d.preload || 'metadata',
        aspectRatio: d.aspectRatio || d.default_aspect_ratio || 'default',
        brandingColor: d.brandColor,
        video_end_option: d.video_end_option || 'default',
        ...(media.settings || {}),
    };

    const res = await apiFetch({
        path: `${apiBasePath()}/media`,
        method: 'POST',
        data: { settings, tags: media.tags || [] },
    });

    return (res && res.media) || res;
}
