/**
 * Shared video source utilities for FluentPlayer frontend.
 * Used by FluentPlaylist and GridPlaylistManager.
 */

/**
 * Get the best video source URL for a media item.
 * Uses direct CDN URL for Bunny Storage instead of proxied URL.
 * @param {Object} settings - Media settings object
 * @returns {string} The best available video source URL
 */
export function getBestVideoSrc(settings) {
    if (settings.provider === 'bunny_storage') {
        const cdnUrl = settings.bunny_storage?.url;
        if (cdnUrl) {
            return cdnUrl;
        }
    }
    return settings.src || '';
}

/**
 * Apply YouTube Privacy-Enhanced Mode to a Vidstack YouTube provider.
 *
 * Vidstack derives the embed host from `provider.cookies`
 * (false → www.youtube-nocookie.com, true → www.youtube.com) and IGNORES the host
 * in the source URL — it only extracts the video id. Privacy mode must therefore be
 * toggled via this flag, not by rewriting the URL (which Vidstack discards). `cookies`
 * has to be set synchronously on the `provider-change` event, before Vidstack's
 * reactive effect builds the embed URL; setting it afterwards does not re-trigger the
 * host because `cookies` is a plain field, not a signal.
 *
 * privacy_mode ON  → cookies=false → youtube-nocookie.com
 * privacy_mode OFF → cookies=true  → youtube.com (matches the plugin default)
 *
 * @param {object} provider - Vidstack media provider (from the provider-change event)
 */
export function applyYouTubePrivacyMode(provider) {
    if (!provider || provider.type !== 'youtube') return;

    const privacyMode = window.fluent_player?.youtube?.privacy_mode || false;
    provider.cookies = !privacyMode;
}

/**
 * Privacy-Enhanced Mode for YouTube poster thumbnails (runtime / media-switch path).
 *
 * YouTube thumbnails are stored on img.youtube.com, which is contacted on load and can
 * set cookies. When privacy mode is on, swap that host for the cookieless static CDN
 * i.ytimg.com (same path, same image). Non-YouTube posters and already-cookieless URLs
 * pass through untouched. The initial server render applies the same rewrite via
 * Helper::privacyEnhanceYouTubePoster (PHP); this covers posters set when the player
 * swaps media (single-player dynamic source, playlist navigation).
 *
 * @param {string} url - Poster URL.
 * @returns {string} Rewritten URL when privacy mode is on and host is img.youtube.com.
 */
export function privacyEnhanceYouTubePoster(url) {
    if (!url) return url;

    const privacyMode = window.fluent_player?.youtube?.privacy_mode || false;
    if (!privacyMode) return url;

    return url.replace(/^https?:\/\/img\.youtube\.com\//i, 'https://i.ytimg.com/');
}
