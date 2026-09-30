/**
 * Vimeo caption sync. Imported subtitles drive the native menu, but Vidstack can't paint
 * <track> cues over a Vimeo iframe, so a menu selection tells the iframe to render that
 * language natively (enableTextTrack) instead.
 */

const CAPTION_KINDS = ['subtitles', 'captions'];

export const VIMEO_EMBED_ORIGIN = 'https://player.vimeo.com';

export function buildVimeoCommand(method, value) {
    return JSON.stringify(value === undefined ? { method } : { method, value });
}

/** Language of the currently-showing caption/subtitle track, or '' when captions are off. */
export function selectedCaptionLanguage(textTracks) {
    for (const track of textTracks || []) {
        if (CAPTION_KINDS.includes(track.kind) && track.mode === 'showing') {
            return track.language || '';
        }
    }
    return '';
}

export function findVimeoIframe(player) {
    return player?.querySelector?.('iframe[src*="vimeo.com"]') || null;
}

/** Enable a Vimeo caption track by language, or disable captions when language is ''. */
export function setVimeoTextTrack(iframe, language, kind = 'subtitles') {
    if (!iframe?.contentWindow) {
        return;
    }

    if (language) {
        iframe.contentWindow.postMessage(buildVimeoCommand('enableTextTrack', { language, kind }), VIMEO_EMBED_ORIGIN);
    } else {
        iframe.contentWindow.postMessage(buildVimeoCommand('disableTextTrack'), VIMEO_EMBED_ORIGIN);
    }
}

/**
 * Keep the Vimeo iframe's native captions in sync with the menu selection. Captions are a
 * Pro feature (subtitle-tracks.php only emits <track>s under Pro).
 */
export function syncVimeoCaptions(player, {
    findIframe = findVimeoIframe,
    hasPro = (typeof window !== 'undefined' ? window.fluent_player?.has_pro : false),
} = {}) {
    if (!hasPro || !player?.textTracks) {
        return;
    }

    // Returns true once the iframe exists (the first mode-change can fire before it does).
    const sync = () => {
        const iframe = findIframe(player);
        if (!iframe) {
            return false;
        }
        setVimeoTextTrack(iframe, selectedCaptionLanguage(player.textTracks));
        return true;
    };

    // Attach the listener once per element, but run the initial sync on every
    // provider-change so a default caption shows on the 2nd+ Vimeo item in a playlist.
    if (player.dataset?.fpVimeoCaptionSync !== 'done') {
        if (player.dataset) {
            player.dataset.fpVimeoCaptionSync = 'done';
        }
        player.textTracks.addEventListener('mode-change', sync);
    }

    if (!sync() && typeof setInterval === 'function') {
        let tries = 0;
        const timer = setInterval(() => {
            if (sync() || ++tries >= 15) {
                clearInterval(timer);
            }
        }, 1000);
    }
}
