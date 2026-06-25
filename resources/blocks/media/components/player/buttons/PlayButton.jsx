/**
 * PlayButton component for Fluent Player
 * Based on player/controls/play-button.php
 */

const PlayButton = () => {
    return (
        <media-tooltip>
            <media-tooltip-trigger>
                <media-play-button class="fp-media-button">
                    <media-icon class="fp-media-play-icon" type="play"></media-icon>
                    <media-icon class="fp-media-pause-icon" type="pause"></media-icon>
                </media-play-button>
            </media-tooltip-trigger>
            <media-tooltip-content class="fp-media-tooltip" placement="top">
                <span className="fp-media-play-tooltip-text">Play</span>
                <span className="fp-media-pause-tooltip-text">Pause</span>
            </media-tooltip-content>
        </media-tooltip>
    );
};

export default PlayButton;