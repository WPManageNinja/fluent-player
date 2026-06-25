/**
 * SpeedMenu component for Fluent Player
 */

const SpeedMenu = () => {
    return (
        <media-menu>
            <media-tooltip>
                <media-tooltip-trigger>
                    <media-menu-button class="fp-media-button">
                        <media-icon type="odometer"></media-icon>
                    </media-menu-button>
                </media-tooltip-trigger>
                <media-tooltip-content class="fp-media-tooltip" placement="top">
                    <span>Speed</span>
                </media-tooltip-content>
            </media-tooltip>
            <media-menu-items placement="top end">
                <media-speed-radio-group class="fp-media-radio-group">
                    <template>
                        <media-radio>
                            <div className="fp-media-radio-check"></div>
                            <span className="fp-media-radio-label" data-part="label"></span>
                        </media-radio>
                    </template>
                </media-speed-radio-group>
            </media-menu-items>
        </media-menu>
    );
};

export default SpeedMenu;