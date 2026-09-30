const {__} = wp.i18n;
const {Button, SelectControl, BaseControl, TextControl} = wp.components;
const {MediaUpload, MediaUploadCheck} = wp.blockEditor || wp.editor;
import CustomToggle from '../common/CustomToggle.jsx';
import CustomRangeSlider from '../common/CustomRangeSlider.jsx';
import ColorPickerInput from '../common/ColorPickerInput.jsx';
import PositionGrid from '../common/PositionGrid.jsx';
import InfoIcon from '../common/InfoIcon.jsx';
import {DeleteIconSVG} from '../common/Icons.jsx';
import {colorHasAlpha, DEFAULT_PLAY_BUTTON_BG} from '@share/color.js';

/**
 * Branding settings component for media
 */
const BrandingSettings = ({mediaData, setMediaData}) => {
    if (!mediaData) return null;

    // Get global branding settings from localized vars
    const blockVars = window.fluentPlayerBlockVars || {};
    const globalBrandColor = blockVars.defaultSettings?.brandColor || '#2597D0';

    // Check if using custom branding
    const isUsingCustomBranding = mediaData.settings?.useCustomBranding || false;

    const playBtnBgDefault = blockVars.defaultSettings?.playButtonBgColor || DEFAULT_PLAY_BUTTON_BG;
    const playBtnBg = mediaData.settings?.playButtonBgColor;
    const showBlurHint = mediaData.settings?.provider === 'youtube'
        && colorHasAlpha(playBtnBg === undefined || playBtnBg === null ? playBtnBgDefault : playBtnBg);

    const toggleCustomBranding = (value) => {
        setMediaData({
            ...mediaData,
            settings: {
                ...mediaData.settings,
                useCustomBranding: value,
                // Only reset values if explicitly requested, not when toggling off
            }
        });
    };

    const handleColorChange = (value) => {
        setMediaData({
            ...mediaData,
            settings: {
                ...mediaData.settings,
                brandingColor: value
            }
        });
    };

    const onSelectLogo = (media) => {
        setMediaData({
            ...mediaData,
            settings: {
                ...mediaData.settings,
                logo: media.url
            }
        });
    };

    const removeLogo = () => {
        setMediaData({
            ...mediaData,
            settings: {
                ...mediaData.settings,
                logo: ''
            }
        });
    };

    const handleLogoLinkChange = (value) => {
        setMediaData({
            ...mediaData,
            settings: {
                ...mediaData.settings,
                logoLink: value
            }
        });
    };

    return (
        <BaseControl>
            <div className="fluent-player-branding-settings">
                <CustomToggle
                    label={__('Use Custom Branding', 'fluent-player')}
                    checked={isUsingCustomBranding}
                    onChange={toggleCustomBranding}
                    help={isUsingCustomBranding
                        ? __('Using custom branding settings for this media', 'fluent-player')
                        : __('Using global branding settings from plugin settings', 'fluent-player')}
                />

                {isUsingCustomBranding && (
                    <>
                        <div className="content-divider"></div>

                        <div className="fluent-player-form-row">
                            <label className="components-base-control__label">
                                {__('Logo', 'fluent-player')}
                            </label>
                            <MediaUploadCheck>
                                <MediaUpload
                                    onSelect={onSelectLogo}
                                    allowedTypes={['image']}
                                    value={mediaData.settings?.logo}
                                    render={({open}) => (
                                        <div className={`image-upload-container ${mediaData.settings?.logo ? 'has-image' : ''}`}>
                                            {mediaData.settings?.logo ? (
                                                <>
                                                    <div className="image-upload-preview">
                                                        <img src={mediaData.settings.logo} alt="" />
                                                    </div>
                                                    <Button className="image-upload-change-btn fp-btn-secondary" onClick={open}>
                                                        {__('Change', 'fluent-player')}
                                                    </Button>
                                                    <Button
                                                        className="fp-delete-button fp-icon-btn fp-icon-btn--danger"
                                                        onClick={removeLogo}
                                                        aria-label={__('Delete logo', 'fluent-player')}
                                                    >
                                                        <DeleteIconSVG />
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button className="fp-btn-primary" onClick={open}>
                                                    {__('Upload', 'fluent-player')}
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                />
                            </MediaUploadCheck>
                        </div>

                    {mediaData.settings?.logo && (
                        <>
                            <div className="fluent-player-form-row">
                                <TextControl
                                    label={__('Logo Link', 'fluent-player')}
                                    value={mediaData.settings?.logoLink || ''}
                                    onChange={handleLogoLinkChange}
                                />
                            </div>

                            <div className="fluent-player-form-row">
                                <CustomRangeSlider
                                    label={__('Logo Width (PX)', 'fluent-player')}
                                    value={mediaData.settings?.logoWidth || 24}
                                    min={2}
                                    max={120}
                                    step={1}
                                    onChange={(value) => setMediaData({
                                        ...mediaData,
                                        settings: {...mediaData.settings, logoWidth: value}
                                    })}
                                />
                            </div>

                            <PositionGrid
                                label={__('Logo Position', 'fluent-player')}
                                value={mediaData.settings?.logoPosition || 'position-top-right'}
                                onChange={(value) => setMediaData({
                                    ...mediaData,
                                    settings: {...mediaData.settings, logoPosition: value}
                                })}
                            />
                        </>
                    )}

                    <div className="fluent-player-form-row">
                        <div className="fp-color-section">
                            <label className="fp-color-section-label components-base-control__label custom-range-control-label">
                                {__('Color', 'fluent-player')}
                                <InfoIcon tooltip={__('Background color of the player controls. Use transparency for blur effect.', 'fluent-player')} />
                            </label>
                            <div className="fp-color-trigger-list">
                                <ColorPickerInput
                                    asTrigger
                                    label={__('Brand Color', 'fluent-player')}
                                    value={mediaData.settings?.brandingColor || ''}
                                    defaultValue={globalBrandColor}
                                    onChange={handleColorChange}
                                />
                                <ColorPickerInput
                                    asTrigger
                                    label={__('Control Bar Color', 'fluent-player')}
                                    value={mediaData.settings?.controlBarColor || ''}
                                    defaultValue="#0E121BB3"
                                    onChange={(value) => setMediaData({
                                        ...mediaData,
                                        settings: {...mediaData.settings, controlBarColor: value}
                                    })}
                                    enableAlpha={true}
                                />
                                <ColorPickerInput
                                    asTrigger
                                    label={__('Play Button Color', 'fluent-player')}
                                    value={mediaData.settings?.playButtonColor || ''}
                                    defaultValue={blockVars.defaultSettings?.playButtonColor || '#DD1F13'}
                                    onChange={(value) => setMediaData({
                                        ...mediaData,
                                        settings: {...mediaData.settings, playButtonColor: value}
                                    })}
                                />
                                <ColorPickerInput
                                    asTrigger
                                    label={__('Play Button Background Color', 'fluent-player')}
                                    help={showBlurHint ? __('Transparency in this color appears as a frosted blur while paused', 'fluent-player') : undefined}
                                    value={mediaData.settings?.playButtonBgColor || ''}
                                    defaultValue={playBtnBgDefault}
                                    onChange={(value) => setMediaData({
                                        ...mediaData,
                                        settings: {...mediaData.settings, playButtonBgColor: value}
                                    })}
                                    enableAlpha={true}
                                />
                            </div>
                        </div>
                    </div>
                </>
                )}
            </div>
        </BaseControl>
    );
};

export default BrandingSettings;
