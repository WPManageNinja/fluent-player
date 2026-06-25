/**
 * Format seconds as H:MM:SS for display (e.g. duration badges, UI).
 * @param {number|null|undefined} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
    if (seconds == null || isNaN(seconds) || seconds < 0) return '0:00:00';
    const h = Math.floor(Number(seconds) / 3600);
    const m = Math.floor((Number(seconds) % 3600) / 60);
    const s = Math.floor(Number(seconds) % 60);
    const pad = (n) => String(n).padStart(2, '0');
    return `${h}:${pad(m)}:${pad(s)}`;
}
