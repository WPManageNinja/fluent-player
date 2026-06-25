/**
 * Shared DOM helpers for enabling/disabling vidstack player controls (e.g. when overlays are shown).
 * @param {HTMLElement} player - The media-player element
 */
export function enablePlayerControlsDOM(player) {
    if (!player) return;
    const controls = player.querySelectorAll('media-play-button, media-mute-button, media-fullscreen-button, media-seek-button');
    controls.forEach((control) => {
        control.removeAttribute('disabled');
        control.setAttribute('tabindex', '0');
    });
    const progressBar = player.querySelector('media-time-slider');
    if (progressBar) {
        progressBar.removeAttribute('disabled');
        progressBar.setAttribute('tabindex', '0');
        progressBar.style.pointerEvents = 'auto';
    }
}

/**
 * Disable player controls (set disabled and tabindex -1, disable progress bar).
 * @param {HTMLElement} player - The media-player element
 */
export function disablePlayerControlsDOM(player) {
    if (!player) return;
    const controls = player.querySelectorAll('media-play-button, media-mute-button, media-fullscreen-button, media-seek-button');
    controls.forEach((control) => {
        control.setAttribute('disabled', 'true');
        control.setAttribute('tabindex', '-1');
    });
    const progressBar = player.querySelector('media-time-slider');
    if (progressBar) {
        progressBar.setAttribute('disabled', 'true');
        progressBar.setAttribute('tabindex', '-1');
        progressBar.style.pointerEvents = 'none';
    }
}
