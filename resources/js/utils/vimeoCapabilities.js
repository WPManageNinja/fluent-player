/**
 * Show/hide the Vimeo speed + quality menus per video. Speed is a per-video capability
 * (not an account tier) that Vidstack exposes as `player.canSetPlaybackRate`; when false,
 * asking a Vimeo iframe to change rate is a no-op, so hide the menu. Quality shows only
 * when the video has more than one resolution (switching itself is done in vimeoQuality.js).
 */

/** Whether the Vimeo speed menu should be visible, given the provider capability. */
export function vimeoSpeedSupported({ canSetPlaybackRate } = {}) {
    return !!canSetPlaybackRate;
}

/** Whether the Vimeo quality menu should be visible (more than one selectable quality). */
export function vimeoQualityMenuVisible(qualityCount) {
    return Number(qualityCount) > 1;
}

function toggleMenuFor(player, radioGroupSelector, visible) {
    const group = player.querySelector(radioGroupSelector);
    const menu = group?.closest('media-menu');
    if (menu) {
        menu.style.display = visible ? '' : 'none';
    }
}

/**
 * Show the Vimeo speed menu only when the video allows playback-rate control, and the
 * quality menu only when the video exposes multiple resolutions. No-op for non-Vimeo
 * providers (their menus follow the normal server-side gates).
 */
export function applyVimeoMenuCapabilities(player) {
    if (!player || player.provider?.type !== 'vimeo') {
        return;
    }

    const canSetPlaybackRate = player.canSetPlaybackRate ?? player.state?.canSetPlaybackRate;
    toggleMenuFor(player, 'media-speed-radio-group', vimeoSpeedSupported({ canSetPlaybackRate }));

    const qualityCount = [...(player.qualities || [])].length;
    toggleMenuFor(player, 'media-quality-radio-group', vimeoQualityMenuVisible(qualityCount));
}
