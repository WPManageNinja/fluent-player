/**
 * PipButton component for Fluent Player
 * Based on player/controls/pip-button.php
 */

const PipButton = () => {
    return (
        <media-tooltip>
            <media-tooltip-trigger>
                <media-pip-button class="fp-media-button">
                    <media-icon class="fp-media-pip-enter-icon" type="picture-in-picture"></media-icon>
                    <media-icon class="fp-media-pip-exit-icon" type="picture-in-picture-exit"></media-icon>
                </media-pip-button>
            </media-tooltip-trigger>
            <media-tooltip-content class="fp-media-tooltip" placement="top">
                <span className="fp-media-pip-enter-tooltip-text">Enter PiP</span>
                <span className="fp-media-pip-exit-tooltip-text">Exit PiP</span>
            </media-tooltip-content>
        </media-tooltip>
    );
};

export default PipButton;