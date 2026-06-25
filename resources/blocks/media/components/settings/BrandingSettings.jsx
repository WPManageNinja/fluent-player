const {__} = wp.i18n;
const {useState, useRef} = wp.element;
const {Button, SelectControl, BaseControl, TextControl} = wp.components;
const {MediaUpload, MediaUploadCheck} = wp.blockEditor || wp.editor;
import CustomToggle from '../common/CustomToggle.jsx';
import CustomRangeSlider from '../common/CustomRangeSlider.jsx';
import ColorPickerInput from '../common/ColorPickerInput.jsx';
import PositionGrid from '../common/PositionGrid.jsx';
import TooltipPortal from '../common/TooltipPortal.jsx';
import {DeleteIconSVG, InfoIconSVG} from '../common/Icons.jsx';

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

    const [showColorHelp, setShowColorHelp] = useState(false);
    const colorHelpIconRef = useRef(null);

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
                                <span
                                    ref={colorHelpIconRef}
                                    className="custom-range-control-info-icon"
                                    onClick={() => setShowColorHelp(!showColorHelp)}
                                    onMouseEnter={() => setShowColorHelp(true)}
                                    onMouseLeave={() => setShowColorHelp(false)}
                                >
                                    <InfoIconSVG />
                                </span>
                                <TooltipPortal isOpen={showColorHelp} anchorRef={colorHelpIconRef}>
                                    {__('Background color of the player controls. Use transparency for blur effect.', 'fluent-player')}
                                </TooltipPortal>
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
