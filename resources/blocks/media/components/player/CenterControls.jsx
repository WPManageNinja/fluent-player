/**
 * CenterControls component for Fluent Player
 * Based on player/center-controls.php
 */

const CenterControls = ({ skin, alwaysVisible = false }) => {
    return (
        <media-controls
            class={`fp-media-controls-center fp-skin-${skin}`}
            {...(alwaysVisible ? { 'data-visible': '' } : {})}
        >
            <media-controls-group>
                <media-tooltip>
                    <media-tooltip-trigger>
                        <media-play-button class="fp-media-button fp-media-button-large">
                            <media-icon class="fp-media-play-icon" type="play"></media-icon>
                            <media-icon class="fp-media-pause-icon" type="pause"></media-icon>
                        </media-play-button>
                    </media-tooltip-trigger>
                    <media-tooltip-content class="fp-media-tooltip" placement="top">
                        <span className="fp-media-play-tooltip-text">Play</span>
                        <span className="fp-media-pause-tooltip-text">Pause</span>
                    </media-tooltip-content>
                </media-tooltip>
            </media-controls-group>
        </media-controls>
    );
};

export default CenterControls;
