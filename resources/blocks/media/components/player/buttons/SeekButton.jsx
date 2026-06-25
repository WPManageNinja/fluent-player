/**
 * CaptionButton component for Fluent Player
 * Based on player/controls/caption-button.php
 */

const SeekButton = ({type, seconds}) => {
    return (
        <media-tooltip>
            <media-tooltip-trigger>
                <media-seek-button class="fp-media-button" seconds={seconds}>
                    <media-icon class={`fp-${type}`} type={type}></media-icon>
                </media-seek-button>
            </media-tooltip-trigger>
            <media-tooltip-content class="fp-media-tooltip" placement="top">
                <span className="fp-media-play-tooltip-text">{ seconds > 0 ? 'Forward' : 'Backward' } 10s</span>
            </media-tooltip-content>
        </media-tooltip>
    );
};

export default SeekButton;