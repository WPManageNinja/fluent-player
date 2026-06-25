/**
 * MuteButton component for Fluent Player
 */

const MuteButton = () => {
    return (
        <media-tooltip>
            <media-tooltip-trigger>
                <media-mute-button class="fp-media-button">
                    <media-icon class="fp-media-mute-icon" type="mute"></media-icon>
                    <media-icon class="fp-media-volume-low-icon" type="volume-low"></media-icon>
                    <media-icon class="fp-media-volume-high-icon" type="volume-high"></media-icon>
                </media-mute-button>
            </media-tooltip-trigger>
            <media-tooltip-content class="fp-media-tooltip" placement="top">
                <span className="fp-media-mute-tooltip-text">Unmute</span>
                <span className="fp-media-unmute-tooltip-text">Mute</span>
            </media-tooltip-content>
        </media-tooltip>
    );
};

export default MuteButton;