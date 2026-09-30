const { __ } = wp.i18n;
const { SelectControl, BaseControl } = wp.components;
import CustomToggle from '../../../media/components/common/CustomToggle.jsx';
import CustomRangeSlider from '../../../media/components/common/CustomRangeSlider.jsx';
import CustomRadioGroup from '../../../media/components/common/CustomRadioGroup.jsx';
import ColorPickerInput from '../../../media/components/common/ColorPickerInput.jsx';
import CollapsiblePanel from '../../../media/components/common/CollapsiblePanel.jsx';

/**
 * Appearance Settings panel for playlist block
 */
const AppearanceSettings = ({ playlistData, updatePlaylistData }) => {
    const settings = playlistData?.settings || {};
    const appearance = settings.appearance || {};
    const typography = settings.typography || {};
    const isCarousel = settings.layout?.type === 'carousel';
    const separator = appearance.separator || { type: 'line', size: { value: 1, unit: 'px' } };
    const updateSeparator = (patch) => updateAppearance('separator', { ...separator, ...patch });

    const updateAppearance = (key, value) => {
        updatePlaylistData({
            ...playlistData,
            settings: {
                ...settings,
                appearance: {
                    ...appearance,
                    [key]: value
                }
            }
        });
    };

    const updateTypography = (key, value) => {
        updatePlaylistData({
            ...playlistData,
            settings: {
                ...settings,
                typography: {
                    ...typography,
                    [key]: value
                }
            }
        });
    };

    const updateBoxShadow = (key, value) => {
        updatePlaylistData({
            ...playlistData,
            settings: {
                ...settings,
                appearance: {
                    ...appearance,
                    boxShadow: {
                        ...appearance.boxShadow,
                        [key]: value
                    }
                }
            }
        });
    };

    return (
        <BaseControl>
            <div className="fluent-player-general-settings playlist-appearance-settings">
                <div className="fluent-player-form-row">
                    <div className="fp-color-section">
                        <label className="fp-color-section-label components-base-control__label">
                            {__('Colors', 'fluent-player')}
                        </label>
                        <div className="fp-color-trigger-list fp-color-trigger-list--side-by-side">
                            <ColorPickerInput
                                asTrigger
                                label={__('Background Color', 'fluent-player')}
                                value={appearance.backgroundColor ?? ''}
                                defaultValue="#ffffff"
                                onChange={(value) => updateAppearance('backgroundColor', value)}
                            />
                            <ColorPickerInput
                                asTrigger
                                label={__('Text Color', 'fluent-player')}
                                value={appearance.textColor ?? ''}
                                defaultValue="#333333"
                                onChange={(value) => updateAppearance('textColor', value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="fluent-player-form-row">
                    <SelectControl
                        label={__('Brand Color', 'fluent-player')}
                        help={__('Auto matches the chosen Preset Source media. Global uses the plugin-wide brand color.', 'fluent-player')}
                        value={appearance.brandColor?.mode || 'auto'}
                        options={[
                            { label: __('Auto (match preset source media)', 'fluent-player'), value: 'auto' },
                            { label: __('Use Global Setting', 'fluent-player'), value: 'global' },
                            { label: __('Custom Color', 'fluent-player'), value: 'custom' }
                        ]}
                        onChange={(value) => updateAppearance('brandColor', {
                            ...appearance.brandColor,
                            mode: value
                        })}
                    />
                </div>

                {appearance.brandColor?.mode === 'custom' && (
                    <div className="fluent-player-form-row">
                        <div className="fp-color-section">
                            <label className="fp-color-section-label components-base-control__label">
                                {__('Brand Color', 'fluent-player')}
                            </label>
                            <div className="fp-color-trigger-list">
                                <ColorPickerInput
                                    asTrigger
                                    label={__('Brand Color', 'fluent-player')}
                                    value={appearance.brandColor?.value ?? ''}
                                    defaultValue="#DD1F13"
                                    onChange={(value) => updateAppearance('brandColor', {
                                        ...appearance.brandColor,
                                        value
                                    })}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="fluent-player-form-row">
                    <CustomRangeSlider
                        label={__('Border Radius (PX)', 'fluent-player')}
                        value={appearance.borderRadius?.value || 8}
                        onChange={(value) => updateAppearance('borderRadius', {
                            ...appearance.borderRadius,
                            value
                        })}
                        min={0}
                        max={50}
                    />
                </div>

                {!isCarousel && (
                    <>
                        <div className="fluent-player-form-row">
                            <div className="fp-color-section">
                                <label className="fp-color-section-label components-base-control__label">
                                    {__('Border Color', 'fluent-player')}
                                </label>
                                <div className="fp-color-trigger-list">
                                    <ColorPickerInput
                                        asTrigger
                                        label={__('Border Color', 'fluent-player')}
                                        value={appearance.borderColor ?? ''}
                                        defaultValue="#e1e5e9"
                                        onChange={(value) => updateAppearance('borderColor', value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="fluent-player-form-row">
                            <CustomRangeSlider
                                label={__('Border Width (PX)', 'fluent-player')}
                                value={appearance.borderWidth?.value || 0}
                                onChange={(value) => updateAppearance('borderWidth', {
                                    ...appearance.borderWidth,
                                    value,
                                    unit: appearance.borderWidth?.unit || 'px'
                                })}
                                min={0}
                                max={10}
                            />
                        </div>

                        <div className="fluent-player-form-row">
                            <CustomRadioGroup
                                label={__('Player / Playlist Separator', 'fluent-player')}
                                options={[
                                    { value: 'none', label: __('None', 'fluent-player') },
                                    { value: 'line', label: __('Line', 'fluent-player') },
                                    { value: 'space', label: __('Space', 'fluent-player') }
                                ]}
                                selected={separator.type || 'line'}
                                onChange={(value) => {
                                    const max = value === 'space' ? 40 : 8;
                                    const size = separator.size || { value: 1, unit: 'px' };
                                    updateSeparator({
                                        type: value,
                                        size: { ...size, value: Math.min(size.value ?? 1, max), unit: size.unit || 'px' }
                                    });
                                }}
                            />
                        </div>

                        {separator.type !== 'none' && (
                            <div className="fluent-player-form-row">
                                <CustomRangeSlider
                                    label={separator.type === 'space'
                                        ? __('Spacing (PX)', 'fluent-player')
                                        : __('Line Width (PX)', 'fluent-player')}
                                    value={separator.size?.value ?? 1}
                                    onChange={(value) => updateSeparator({
                                        size: {
                                            ...separator.size,
                                            value,
                                            unit: separator.size?.unit || 'px'
                                        }
                                    })}
                                    min={0}
                                    max={separator.type === 'space' ? 40 : 8}
                                />
                            </div>
                        )}
                    </>
                )}

                <CollapsiblePanel title={__('Custom Typography', 'fluent-player')} defaultOpen={false}>
                    <div className="fluent-player-form-row">
                        <CustomToggle
                            label={__('Enable Custom Typography', 'fluent-player')}
                            checked={typography.enabled || false}
                            onChange={(value) => updateTypography('enabled', value)}
                            switchPosition="left"
                            justify="start"
                        />
                    </div>
                    {typography.enabled && (
                        <>
                            <div className="fluent-player-form-row">
                                <CustomRangeSlider
                                    label={__('Font Size (PX)', 'fluent-player')}
                                    value={typography.fontSize?.value || 14}
                                    onChange={(value) => updateTypography('fontSize', { 
                                        ...typography.fontSize, 
                                        value 
                                    })}
                                    min={10}
                                    max={32}
                                />
                            </div>
                            <div className="fluent-player-form-row">
                                <SelectControl
                                    label={__('Font Weight', 'fluent-player')}
                                    value={typography.fontWeight || '400'}
                                    options={[
                                        { label: __('Light (300)', 'fluent-player'), value: '300' },
                                        { label: __('Normal (400)', 'fluent-player'), value: '400' },
                                        { label: __('Medium (500)', 'fluent-player'), value: '500' },
                                        { label: __('Semi Bold (600)', 'fluent-player'), value: '600' },
                                        { label: __('Bold (700)', 'fluent-player'), value: '700' }
                                    ]}
                                    onChange={(value) => updateTypography('fontWeight', value)}
                                />
                            </div>
                            <div className="fluent-player-form-row">
                                <CustomRangeSlider
                                    label={__('Line Height', 'fluent-player')}
                                    value={typography.lineHeight || 1.5}
                                    onChange={(value) => updateTypography('lineHeight', value)}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                />
                            </div>
                        </>
                    )}
                </CollapsiblePanel>

                {!isCarousel && <CollapsiblePanel title={__('Box Shadow', 'fluent-player')} defaultOpen={false}>
                    <div className="fluent-player-form-row">
                        <CustomToggle
                            label={__('Enable Box Shadow', 'fluent-player')}
                            checked={appearance.boxShadow?.enabled || false}
                            onChange={(value) => updateBoxShadow('enabled', value)}
                            switchPosition="left"
                            justify="start"
                        />
                    </div>
                    {appearance.boxShadow?.enabled && (
                        <>
                            <div className="fluent-player-form-row">
                                <div className="fp-color-section">
                                    <label className="fp-color-section-label components-base-control__label">
                                        {__('Shadow Color', 'fluent-player')}
                                    </label>
                                    <div className="fp-color-trigger-list">
                                        <ColorPickerInput
                                            asTrigger
                                            label={__('Shadow Color', 'fluent-player')}
                                            value={appearance.boxShadow?.color ?? ''}
                                            defaultValue="#000000"
                                            onChange={(value) => updateBoxShadow('color', value)}
                                            enableAlpha={false}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="fluent-player-form-row">
                                <SelectControl
                                    label={__('Shadow Type', 'fluent-player')}
                                    value={appearance.boxShadow?.position || 'outline'}
                                    options={[
                                        { label: __('Drop Shadow (Outside)', 'fluent-player'), value: 'outline' },
                                        { label: __('Inner Shadow (Inset)', 'fluent-player'), value: 'inset' }
                                    ]}
                                    onChange={(value) => updateBoxShadow('position', value)}
                                />
                            </div>
                            <div className="fluent-player-form-row">
                                <CustomRangeSlider
                                    label={__('Horizontal Offset (PX)', 'fluent-player')}
                                    value={appearance.boxShadow?.horizontal || 0}
                                    onChange={(value) => updateBoxShadow('horizontal', value)}
                                    min={-20}
                                    max={20}
                                />
                            </div>
                            <div className="fluent-player-form-row">
                                <CustomRangeSlider
                                    label={__('Vertical Offset (PX)', 'fluent-player')}
                                    value={appearance.boxShadow?.vertical || 4}
                                    onChange={(value) => updateBoxShadow('vertical', value)}
                                    min={-20}
                                    max={20}
                                />
                            </div>
                            <div className="fluent-player-form-row">
                                <CustomRangeSlider
                                    label={__('Blur (PX)', 'fluent-player')}
                                    value={appearance.boxShadow?.blur || 10}
                                    onChange={(value) => updateBoxShadow('blur', value)}
                                    min={0}
                                    max={50}
                                />
                            </div>
                            <div className="fluent-player-form-row">
                                <CustomRangeSlider
                                    label={__('Spread (PX)', 'fluent-player')}
                                    value={appearance.boxShadow?.spread || 0}
                                    onChange={(value) => updateBoxShadow('spread', value)}
                                    min={-20}
                                    max={20}
                                />
                            </div>
                        </>
                    )}
                </CollapsiblePanel>}
            </div>
        </BaseControl>
    );
};

export default AppearanceSettings;

