export function seekPreviewPlayer(player, time) {
    if (!player || typeof time !== 'number' || Number.isNaN(time)) return;
    if (!document.contains(player)) return;
    player.currentTime = time;
    player.pause?.();
}
