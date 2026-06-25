/**
 * CaptionButton component for Fluent Player
 * Based on player/controls/caption-button.php
 */

const CaptionButton = () => {
    return (
        <media-tooltip>
            <media-tooltip-trigger>
                <media-caption-button class="fp-media-button">
                    <media-icon class="fp-media-cc-on-icon" type="closed-captions-on"></media-icon>
                    <media-icon class="fp-media-cc-off-icon" type="closed-captions"></media-icon>
                </media-caption-button>
            </media-tooltip-trigger>
            <media-tooltip-content class="fp-media-tooltip" placement="top">
                <span className="fp-media-cc-on-tooltip-text">Closed-Captions Off</span>
                <span className="fp-media-cc-off-tooltip-text">Closed-Captions On</span>
            </media-tooltip-content>
        </media-tooltip>
    );
};

export default CaptionButton;