/**
 * Build the media-data envelope for a selected Gumlet asset.
 *
 * Pure function (no wp.* / window globals) so it is unit-testable and shared by
 * the block picker. `settings.gumlet` is persisted so the Pro render filter
 * (GumletService::filterPlayerSettings) can sign private assets at play time.
 *
 * @param {object} asset   Normalized Gumlet asset (id, title, playback_url, thumbnail, duration, status, is_private).
 * @param {object} options { presetSlug, untitledLabel, assetType: 'vod'|'live' }
 * @returns {object} { title, settings }
 */
import { detectStreamAudioHint } from './detectStreamAudioHint.js';

export function buildGumletMediaData(asset = {}, options = {}) {
    const {
        presetSlug = 'course',
        untitledLabel = 'Untitled Gumlet Video',
        assetType = 'vod',
        isAudio: isAudioOverride,
    } = options;

    const isLive = assetType === 'live';
    const title = (asset.title && String(asset.title).trim()) || untitledLabel;
    const duration = Number(asset.duration) || 0;
    const thumbnail = asset.thumbnail || '';
    const provider = isLive ? 'gumlet_live' : 'gumlet';
    // Prefer the source MIME captured at upload (Gumlet transcodes audio into an
    // extension-less HLS stream, so the src alone can't tell); fall back to the asset.
    const isAudio = (typeof isAudioOverride !== 'undefined')
        ? !!isAudioOverride
        : detectStreamAudioHint(provider, asset);

    return {
        title,
        settings: {
            provider,
            src: asset.playback_url || '',
            posterSrc: thumbnail,
            title,
            post_status: options.postStatus || 'publish',
            viewType: isAudio ? 'audio' : 'video',
            playsInline: true,
            mutedAutoplay: false,
            autoplay: false,
            loadStrategy: 'visible',
            aspectRatio: 'default',
            save_play_position: false,
            preset_slug: presetSlug,
            gumlet: {
                asset_id: asset.id || '',
                playback_url: asset.playback_url || '',
                thumbnail,
                duration,
                status: asset.status || 'ready',
                is_private: !!asset.is_private,
                is_audio: isAudio,
            },
            streamType: isLive ? 'live' : 'on-demand',
            mediaType: isAudio ? 'audio' : 'video',
            duration,
        },
    };
}

export default buildGumletMediaData;
