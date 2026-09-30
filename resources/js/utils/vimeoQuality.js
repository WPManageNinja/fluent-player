/**
 * Vimeo quality bridge. Vidstack drives its native quality menu; we forward each selection
 * to the iframe SDK, which performs the switch.
 *
 * Vimeo lists some renditions it cannot actually deliver (e.g. a 1080p entry on a video whose
 * real encode tops out at 720p): setQuality is silently rejected, leaving the menu showing a
 * quality that never plays. After each switch we confirm Vimeo accepted it and, if not, drop
 * that phantom rendition from the menu and fall back to auto (which only ever resolves to a
 * real rendition).
 */

import { buildVimeoCommand, findVimeoIframe, VIMEO_EMBED_ORIGIN } from './vimeoTracks.js';

/** Map the player's selected quality to a Vimeo setQuality id ('auto' or e.g. '720p'). */
export function vimeoQualityId({ auto, height } = {}) {
    if (auto) {
        return 'auto';
    }
    return height ? `${height}p` : 'auto';
}

/** Ask Vimeo which quality it actually settled on; resolves null if it never answers. */
export function readVimeoQuality(iframe, timeout = 1500) {
    return new Promise((resolve) => {
        let settled = false;
        let timer = null;
        const finish = (value) => {
            if (settled) {
                return;
            }
            settled = true;
            window.removeEventListener('message', onMessage);
            clearTimeout(timer);
            resolve(value);
        };
        const onMessage = (event) => {
            // Every Vimeo embed shares the origin, so a sibling player's reply would
            // resolve this read and prune a rendition that is valid here.
            if (event.origin !== VIMEO_EMBED_ORIGIN || event.source !== iframe.contentWindow) {
                return;
            }
            try {
                const data = JSON.parse(event.data);
                if (data?.method === 'getQuality') {
                    finish(data.value);
                }
            } catch (e) {
                // not a message we can parse
            }
        };
        window.addEventListener('message', onMessage);
        iframe.contentWindow.postMessage(buildVimeoCommand('getQuality'), VIMEO_EMBED_ORIGIN);
        timer = setTimeout(() => finish(null), timeout);
    });
}

/** Hide a rejected rendition's radio so it can't be chosen again. */
function hidePhantomQualityRadio(player, height) {
    player.querySelectorAll('media-quality-radio-group media-radio').forEach((radio) => {
        if (radio.textContent?.trim().startsWith(`${height}p`)) {
            radio.style.display = 'none';
        }
    });
}

/** Forward native quality-menu selections to the Vimeo iframe. Idempotent per player. */
export function bridgeVimeoQuality(player, { findIframe = findVimeoIframe } = {}) {
    if (!player?.qualities || player.provider?.type !== 'vimeo' || player.dataset?.fpVimeoQuality === 'done') {
        return;
    }

    if (player.dataset) {
        player.dataset.fpVimeoQuality = 'done';
    }

    let readEpoch = 0;
    let pendingRead = Promise.resolve();

    const onQualityChange = async () => {
        const iframe = findIframe(player);
        if (!iframe?.contentWindow) {
            return;
        }

        const auto = !!player.qualities?.auto;
        const height = player.qualities?.selected?.height;
        const id = vimeoQualityId({ auto, height });
        iframe.contentWindow.postMessage(buildVimeoCommand('setQuality', id), VIMEO_EMBED_ORIGIN);

        // Every selection invalidates a pending read, Auto included — otherwise a
        // manual read still in flight resolves as 'auto', reads that as a rejected
        // switch, and hides a valid rendition for the rest of the session.
        const epoch = ++readEpoch;

        if (auto) {
            return;
        }

        // Vimeo's postMessage API carries no request id, so a reply cannot be
        // matched to its request. Reads are serialized: overlapping listeners
        // would let the newest read adopt an older reply and prune a valid
        // rendition — the epoch alone cannot catch that.
        const previous = pendingRead;
        const run = (async () => {
            await previous;
            if (epoch !== readEpoch) {
                return;
            }

            const accepted = await readVimeoQuality(iframe);
            if (epoch !== readEpoch) {
                return;
            }

            if (accepted && accepted !== id) {
                hidePhantomQualityRadio(player, height);
                player.qualities?.autoSelect?.();
            }
        })();

        pendingRead = run;
        await run;
    };

    player.addEventListener('quality-change', onQualityChange);
}
