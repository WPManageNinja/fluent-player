/**
 * Build the media payload for a Cloudflare Stream video (uploaded or browsed),
 * ready to POST to the free /media endpoint via saveMediaToServer.
 *
 * Pure (no wp globals) so it can be unit-tested. Playback is adaptive HLS: prefer
 * the video's own playback.hls, else construct it from the account's customer
 * subdomain + uid.
 *
 * @param {Object} video   Cloudflare Stream video object
 *                         { uid, meta:{name}, duration, thumbnail, playback:{hls},
 *                           readyToStream, requireSignedURLs }
 * @param {Object} options { presetSlug, untitledLabel, customerSubdomain }
 * @returns {Object} { title, settings }
 */
export function buildStreamMediaData(video = {}, options = {}) {
    const presetSlug = options.presetSlug || 'course';
    const untitledLabel = options.untitledLabel || 'Untitled Stream Video';

    const title = (video.meta && video.meta.name) || untitledLabel;

    const hls = (video.playback && video.playback.hls)
        || (options.customerSubdomain && video.uid
            ? `https://${options.customerSubdomain.replace(/\/$/, '')}/${video.uid}/manifest/video.m3u8`
            : '');

    return {
        title,
        settings: {
            provider: 'cloudflare_stream',
            src: hls,
            posterSrc: video.thumbnail || '',
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
            stream: {
                uid: video.uid || '',
                ready: video.readyToStream === true,
                status: (video.status && video.status.state) || (video.readyToStream ? 'ready' : 'queued'),
                require_signed_urls: video.requireSignedURLs === true,
            },
            streamType: 'on-demand',
            mediaType: 'video',
            duration: video.duration || 0,
        },
    };
}
