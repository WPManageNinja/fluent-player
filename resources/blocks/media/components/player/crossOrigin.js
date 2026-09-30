/**
 * Decide whether the player should set the `crossorigin` attribute.
 *
 * Forcing crossorigin makes the browser do a CORS-mode media fetch, which needs
 * an Access-Control-Allow-Origin response header. Some hosts don't return it
 * reliably (the Cloudflare r2.dev public cache; YouTube storyboard sprites), so
 * playback breaks. Plain MP4 playback needs no CORS — only canvas/track features
 * do — so we opt out for those sources unless the media explicitly opts in.
 *
 * @param {Object} mediaData May carry `crossorigin` (explicit override) + `provider`.
 * @param {string} videoSrc  The resolved playback URL.
 * @returns {boolean}
 */
export function resolveCrossOrigin(mediaData = {}, videoSrc = '') {
    if (mediaData && mediaData.crossorigin !== undefined && mediaData.crossorigin !== null) {
        return !!mediaData.crossorigin;
    }

    // Cloudflare R2 (r2.dev public cache does not reliably return ACAO).
    if (mediaData && mediaData.provider === 'cloudflare_r2') {
        return false;
    }

    const src = String(videoSrc || '');
    const isYouTubeSource =
        src.includes('youtube.com') ||
        src.includes('youtu.be') ||
        src.includes('youtube-nocookie.com');

    return !isYouTubeSource;
}
