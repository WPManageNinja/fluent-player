/**
 * Shared video source utilities for FluentPlayer frontend.
 * Used by FluentPlaylist and GridPlaylistManager.
 */

/**
 * Built-in audio file extensions. Keep in parity with the PHP default in
 * Helper::AUDIO_EXTENSIONS (app/Helpers/Helper.php). The effective list is resolved
 * at call time via resolveAudioExtensions() so the filterable server list
 * (`fluent_player/audio_extensions`), localized to JS, applies here too.
 */
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'flac', 'opus', 'weba'];

// The PHP-filtered list is localized onto the frontend global (fluent_player) and the
// editor block vars (fluentPlayerBlockVars). Fall back to the built-in list otherwise.
function resolveAudioExtensions() {
    if (typeof window !== 'undefined') {
        const fromFrontend = window.fluent_player?.audio_extensions;
        if (Array.isArray(fromFrontend) && fromFrontend.length) return fromFrontend;
        const fromEditor = window.fluentPlayerBlockVars?.audioExtensions;
        if (Array.isArray(fromEditor) && fromEditor.length) return fromEditor;
    }
    return AUDIO_EXTENSIONS;
}

// Mirror of PHP filter_var(FILTER_VALIDATE_BOOLEAN) so a serialized string hint
// ("false"/"0") coerces identically on both sides.
function isTruthyFlag(value) {
    if (typeof value === 'string') {
        const s = value.trim().toLowerCase();
        return s === '1' || s === 'true' || s === 'yes' || s === 'on';
    }
    return value === true || value === 1;
}

function hasAudioExtension(src) {
    if (!src) return false;
    const path = String(src).split(/[?#]/)[0];
    const dot = path.lastIndexOf('.');
    if (dot === -1) return false;
    return resolveAudioExtensions().includes(path.slice(dot + 1).toLowerCase());
}

/**
 * Decide whether a media should render in the audio player. Single source of
 * truth mirrored server-side by Helper::isAudioSource() (PHP). Used by the
 * editor preview and the frontend so that CDN-hosted audio (Cloudflare R2,
 * Bunny Storage/Stream, Mux, Gumlet) renders as audio like a native upload.
 *
 * Detection order:
 *   1. explicit viewType === 'audio' (already normalized / native upload)
 *   2. youtube / vimeo are never audio
 *   3. a provider-captured audio hint (extension-less HLS streams)
 *   4. an audio file extension on the source URL (file-storage providers)
 *
 * @param {Object} settings - Media settings object
 * @returns {boolean}
 */
export function isAudioSource(settings) {
    if (!settings || typeof settings !== 'object') return false;

    const viewType = settings.viewType || '';
    if (viewType === 'audio') return true;
    if (viewType === 'youtube' || viewType === 'vimeo') return false;

    const provider = settings.provider || '';
    if (provider === 'youtube' || provider === 'vimeo') return false;

    const hint = isTruthyFlag(settings.is_audio)
        || isTruthyFlag(settings.mux?.is_audio)
        || isTruthyFlag(settings.gumlet?.is_audio)
        || isTruthyFlag(settings.bunny?.is_audio)
        || isTruthyFlag(settings.bunny_storage?.is_audio)
        || isTruthyFlag(settings.cloudflare?.is_audio)
        || isTruthyFlag(settings.cloudflare_r2?.is_audio);
    if (hint) return true;

    // Playable src extension (file providers) OR an original filename a stream
    // provider preserved. Bunny Stream transcodes uploaded audio into an
    // extension-less HLS manifest but keeps the source filename as bunny.title.
    const filenameCandidates = [
        settings.src,
        settings.original_filename,
        settings.bunny?.title,
        settings.bunny_storage?.file_path,
    ];
    return filenameCandidates.some((candidate) => hasAudioExtension(candidate || ''));
}

/**
 * Whether an audio media should render its poster image rather than the default
 * music-note poster. True only when the user explicitly picked a poster
 * (poster_is_custom) and it is non-empty — provider auto-thumbnails have no flag and
 * fall back to the default. Mirrors Helper::shouldShowAudioPoster() (PHP).
 *
 * @param {Object} settings
 * @returns {boolean}
 */
// Stream providers that auto-generate a (blank) thumbnail for transcoded audio. Keep
// in parity with Helper::AUDIO_AUTO_THUMBNAIL_PROVIDERS (PHP).
const AUDIO_AUTO_THUMBNAIL_PROVIDERS = ['bunny', 'mux', 'mux_stream', 'gumlet', 'gumlet_live', 'cloudflare_stream'];

export function shouldShowAudioPoster(settings) {
    if (!settings || !settings.posterSrc) return false;
    if (isTruthyFlag(settings.poster_is_custom)) return true;
    // Otherwise show it unless the provider auto-generates a blank thumbnail — preserves
    // posters on pre-existing native/file-provider audio saved before the flag existed.
    return !AUDIO_AUTO_THUMBNAIL_PROVIDERS.includes(settings.provider || '');
}

/**
 * Editor variant of isAudioSource(). The block editor's `mediaData` may carry
 * fields at the top level and/or under a nested `settings` object, and the
 * resolved playback src (e.g. the Bunny Storage CDN url) is computed separately.
 * Normalizes both shapes onto one settings object before detecting.
 *
 * @param {Object} mediaData - Editor media data.
 * @param {string} [resolvedSrc] - Resolved playback src, preferred over mediaData.src.
 * @returns {boolean}
 */
export function isAudioMediaData(mediaData, resolvedSrc) {
    if (!mediaData || typeof mediaData !== 'object') return false;
    const settings = (mediaData.settings && typeof mediaData.settings === 'object') ? mediaData.settings : {};
    return isAudioSource({
        ...settings,
        ...mediaData,
        src: resolvedSrc || mediaData.src || settings.src || '',
    });
}

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
