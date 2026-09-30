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
export function buildGumletMediaData(asset = {}, options = {}) {
    const {
        presetSlug = 'course',
        untitledLabel = 'Untitled Gumlet Video',
        assetType = 'vod',
    } = options;

    const isLive = assetType === 'live';
    const title = (asset.title && String(asset.title).trim()) || untitledLabel;
    const duration = Number(asset.duration) || 0;
    const thumbnail = asset.thumbnail || '';

    return {
        title,
        settings: {
            provider: isLive ? 'gumlet_live' : 'gumlet',
            src: asset.playback_url || '',
            posterSrc: thumbnail,
            title,
            post_status: 'publish',
            viewType: 'video',
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
            },
            streamType: isLive ? 'live' : 'on-demand',
            mediaType: 'video',
            duration,
        },
    };
}

export default buildGumletMediaData;
