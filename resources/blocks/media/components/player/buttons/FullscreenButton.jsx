/**
 * FullscreenButton component for Fluent Player
 * Based on player/controls/fullscreen-button.php
 */

const FullscreenButton = () => {
    return (
        <media-tooltip>
            <media-tooltip-trigger>
                <media-fullscreen-button class="fp-media-button">
                    <media-icon class="fp-media-fs-enter-icon" type="fullscreen"></media-icon>
                    <media-icon class="fp-media-fs-exit-icon" type="fullscreen-exit"></media-icon>
                </media-fullscreen-button>
            </media-tooltip-trigger>
            <media-tooltip-content class="fp-media-tooltip" placement="top">
                <span className="fp-media-fs-enter-tooltip-text">Enter Fullscreen</span>
                <span className="fp-media-fs-exit-tooltip-text">Exit Fullscreen</span>
            </media-tooltip-content>
        </media-tooltip>
    );
};

export default FullscreenButton;