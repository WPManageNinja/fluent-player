/**
 * CaptionsMenu component for Fluent Player
 *
 * Standalone track picker used when settings are disabled.
 */

const { __ } = wp.i18n;

const CaptionsMenu = () => {
    return (
        <media-menu>
            <media-tooltip>
                <media-tooltip-trigger>
                    <media-menu-button class="fp-media-button" aria-label={__('Captions', 'fluent-player')}>
                        <media-icon type="subtitles"></media-icon>
                    </media-menu-button>
                </media-tooltip-trigger>
                <media-tooltip-content class="fp-media-tooltip" placement="top">
                    <span>{__('Captions', 'fluent-player')}</span>
                </media-tooltip-content>
            </media-tooltip>
            <media-menu-items placement="top end">
                <media-captions-radio-group class="fp-media-radio-group" off-label={__('Off', 'fluent-player')}>
                    <template>
                        <media-radio>
                            <div className="fp-media-radio-check"></div>
                            <span className="fp-media-radio-label" data-part="label"></span>
                        </media-radio>
                    </template>
                </media-captions-radio-group>
            </media-menu-items>
        </media-menu>
    );
};

export default CaptionsMenu;
