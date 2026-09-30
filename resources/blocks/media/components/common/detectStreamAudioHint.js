/**
 * Best-effort audio-only detection for a stream provider's API asset, evaluated at
 * selection time in the block editor.
 *
 * Extension-less HLS (stream.mux.com/ID.m3u8, video.gumlet.io/.../main.m3u8) gives
 * the render/save contract (Helper::isAudioSource / isAudioSource) no signal to work
 * with, so we persist an `is_audio` hint alongside the provider settings here.
 *
 * Conservative by design: returns true ONLY on a positive provider signal, never a
 * guess. A wrong "audio" verdict is worse than a missed one (it hides the video), so
 * unknown/ambiguous cases fall through to false and the media stays video.
 *
 * Coverage:
 *   - Mux: definitive — an audio-only asset has no `video` track (or
 *     max_stored_resolution === 'Audio only').
 *   - Gumlet: honored if the asset exposes an explicit audio type/flag. Gumlet's
 *     normalized asset does not currently carry one, so this is future-proofing.
 *   - Cloudflare Stream / Bunny Stream: video-only platforms — no audio-only concept,
 *     so always false. (Bunny Storage / Cloudflare R2 are file-based and handled by
 *     the src extension in isAudioSource, not here.)
 *
 * @param {string} provider Provider slug (mux, mux_stream, gumlet, ...).
 * @param {object} asset    Provider API asset.
 * @returns {boolean}
 */
import { isAudioSource } from '../../../../js/utils/videoSrc.js';

export function detectStreamAudioHint(provider, asset) {
    if (!asset || typeof asset !== 'object') return false;

    switch (provider) {
        case 'mux':
        case 'mux_stream': {
            if (asset.max_stored_resolution === 'Audio only') return true;
            const tracks = Array.isArray(asset.tracks) ? asset.tracks : [];
            const hasMediaTrack = tracks.some((t) => t && (t.type === 'video' || t.type === 'audio'));
            return hasMediaTrack && !tracks.some((t) => t && t.type === 'video');
        }

        case 'gumlet':
        case 'gumlet_live': {
            if (asset.is_audio === true) return true;
            const type = (asset.type || asset.format || asset.source_type || '').toString().toLowerCase();
            return type === 'audio';
        }

        case 'bunny':
        case 'bunny_stream': {
            // Bunny Stream exposes no audio-only flag and transcodes audio into a real
            // video, so the authoritative signal is the source MIME captured at upload
            // and stored as an `fp_media_type` metaTag. Fall back to the (possibly
            // extension-stripped) title only when no metaTag is present.
            const tags = Array.isArray(asset.metaTags) ? asset.metaTags : [];
            const mediaTypeTag = tags.find((t) => t && t.property === 'fp_media_type');
            if (mediaTypeTag) {
                return String(mediaTypeTag.value).toLowerCase() === 'audio';
            }
            return isAudioSource({ src: (asset.title || '').toString() });
        }

        default:
            return false;
    }
}

export default detectStreamAudioHint;
