const { __, sprintf } = wp.i18n;
const { SelectControl } = wp.components;
const {useState, useEffect, useImperativeHandle, forwardRef, useRef} = wp.element;
const {apiFetch} = wp;

import { InfoIconSVG } from '../common/Icons.jsx';
import { formatTime } from '@share/helper.js';
import TimeInput from '../common/TimeInput.jsx';
import TooltipPortal from '../common/TooltipPortal.jsx';
import ColorPickerInput from '../common/ColorPickerInput.jsx';
import CustomToggle from '../common/CustomToggle.jsx';
import CustomRangeSlider from '../common/CustomRangeSlider.jsx';
import ConditionSettings from '../common/ConditionSettings.jsx';
import PositionGrid, { POSITION_OPTIONS_9 } from '../common/PositionGrid.jsx';
import ShortcodeInserter from '../common/ShortcodeInserter.jsx';
import { useNotification } from '../common/useNotification.js';
import SettingsSectionCard from '../common/SettingsSectionCard.jsx';
import useAccordionState from '../common/useAccordionState.js';
import { applyConditionStateKey } from '../../../hooks/conditionStateKey.js';
import {
	appendSummaryDetail,
	formatAtTimeSummary,
	summarizeAppearanceParts,
	summarizeFormContent,
} from '../common/summaryHelpers.js';
import { LAYER_SECTION_IDS } from './layerSectionConfig.js';

/**
 * Convert seconds to hours, minutes, seconds
 */
const secondsToTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return { hours, minutes, seconds: secs };
};

/**
 * Convert hours, minutes, seconds to total seconds
 */
const timeToSeconds = (hours, minutes, seconds) => {
    return (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
};

/**
 * Form Layer Settings Component
 */
const FormLayerSettings = forwardRef(({ onAdd, onCancel, setPreviewLayer, requestPath, formType = '', editingLayer, currentTime = 0, onTimeChange }, ref) => {
    const { showNotification } = useNotification();
    const hasPro = !!window?.fluentPlayerBlockVars?.hasPro;
    const initialTime = editingLayer?.displayTime || currentTime || 0;
    const initialTimeParts = secondsToTime(initialTime);
    const [showPositionHelp, setShowPositionHelp] = useState(false);
    const [showTextColorHelp, setShowTextColorHelp] = useState(false);
    const positionHelpIconRef = useRef(null);
    const textColorHelpIconRef = useRef(null);
    const titleInputRef = useRef(null);
    
    const [settings, setSettings] = useState({
        form_type: formType,
        form_id: '',
        allow_skip: true,
        title: '',
        bg_color: '',
        text_color: '',
        custom_css: '',
        width: 90,
        height: 90,
        position: 'center',
        start_time_hours: initialTimeParts.hours,
        start_time_minutes: initialTimeParts.minutes,
        start_time_seconds: initialTimeParts.seconds
    });

    const [availableForms, setAvailableForms] = useState([]);
    const [loading, setLoading] = useState(false);
    const isTimeInputChangeRef = useRef(false);
    const lastSyncedTimeRef = useRef(initialTime);

    // Check if form plugin is active
    const isFormPluginActive = (type) => {
        return window.fluentPlayerBlockVars?.formTypes?.[type]?.enable || false;
    };

    // Load editing layer settings
    useEffect(() => {
        if (editingLayer) {
            const timeParts = secondsToTime(editingLayer.displayTime || 0);
            setSettings(prev => ({
                ...prev,
                ...editingLayer,
                start_time_hours: timeParts.hours,
                start_time_minutes: timeParts.minutes,
                start_time_seconds: timeParts.seconds
            }));
            lastSyncedTimeRef.current = editingLayer.displayTime || 0;
        }
    }, [editingLayer]);

    // Sync time inputs from slider (only when slider changes, not from input changes)
    useEffect(() => {
        if (isTimeInputChangeRef.current) {
            isTimeInputChangeRef.current = false;
            return;
        }

        if (currentTime !== undefined && currentTime !== lastSyncedTimeRef.current) {
            setSettings(prev => {
                const currentTimeFromInputs = timeToSeconds(
                    prev.start_time_hours,
                    prev.start_time_minutes,
                    prev.start_time_seconds
                );

                if (Math.abs(currentTime - currentTimeFromInputs) > 0.5) {
                    const timeParts = secondsToTime(currentTime);
                    lastSyncedTimeRef.current = currentTime;
                    return {
                        ...prev,
                        start_time_hours: timeParts.hours,
                        start_time_minutes: timeParts.minutes,
                        start_time_seconds: timeParts.seconds
                    };
                }
                return prev;
            });
        }
    }, [currentTime]);

    // Fetch available forms based on type
    useEffect(() => {
        if (settings.form_type && isFormPluginActive(settings.form_type)) {
            // Check if forms already cached
            const cachedForms = window.fluentPlayerBlockVars?.formTypes?.[settings.form_type]?.forms;
            if (cachedForms && cachedForms.length > 0) {
                setAvailableForms(cachedForms);
            } else {
                // Add a small delay to prevent double calls
                const timeoutId = setTimeout(() => {
                    fetchForms(settings.form_type);
                }, 100);

                return () => clearTimeout(timeoutId);
            }
        } else {
            setAvailableForms([]);
        }
    }, [settings.form_type]);

    // Update preview layer when settings change
    useEffect(() => {
        const displayTime = timeToSeconds(
            settings.start_time_hours,
            settings.start_time_minutes,
            settings.start_time_seconds
        );
        setPreviewLayer({
            ...settings,
            type: 'form',
            displayTime: displayTime
        });
    }, [settings]);

    const fetchForms = async (formType) => {
        setLoading(true);
        try {
            const response = await apiFetch({
                path: `${requestPath}/layer/forms/${formType}`
            });
            
            const forms = response?.forms || [];
            setAvailableForms(forms);
            
            // Cache forms in window object
            if (window.fluentPlayerBlockVars?.formTypes?.[formType]) {
                window.fluentPlayerBlockVars.formTypes[formType].forms = forms;
            }
        } catch (error) {
            setAvailableForms([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (onTimeChange) {
            const displayTime = timeToSeconds(settings.start_time_hours, settings.start_time_minutes, settings.start_time_seconds);
            onTimeChange(displayTime);
        }
    }, [settings.start_time_hours, settings.start_time_minutes, settings.start_time_seconds]);

    const updateSetting = (key, value) => {
        if (key === 'start_time_hours' || key === 'start_time_minutes' || key === 'start_time_seconds') {
            isTimeInputChangeRef.current = true;
        }
        setSettings(prev => {
            const newSettings = { ...prev, [key]: value };
            if (key === 'start_time_hours' || key === 'start_time_minutes' || key === 'start_time_seconds') {
                lastSyncedTimeRef.current = timeToSeconds(
                    key === 'start_time_hours' ? value : newSettings.start_time_hours,
                    key === 'start_time_minutes' ? value : newSettings.start_time_minutes,
                    key === 'start_time_seconds' ? value : newSettings.start_time_seconds
                );
            }
            return newSettings;
        });
    };

    const getDisplaySummary = () => {
        return formatAtTimeSummary(timeToSeconds(
            settings.start_time_hours,
            settings.start_time_minutes,
            settings.start_time_seconds
        ));
    };

    const getContentSummary = () => {
        const selectedForm = availableForms.find((form) => String(form.id) === String(settings.form_id));

        return summarizeFormContent({
            title: settings.title,
            formId: settings.form_id,
            formName: selectedForm?.title || selectedForm?.name || '',
        });
    };

    const getLayoutSummary = () => {
        const sizeSummary = sprintf(
            /* translators: 1: width percentage, 2: height percentage */
            __('%1$s%% × %2$s%%', 'fluent-player'),
            settings.width,
            settings.height
        );

        const positionLabel = POSITION_OPTIONS_9.find((option) => option.value === settings.position)?.label || '';

        return appendSummaryDetail(sizeSummary, positionLabel);
    };

    const getControlsSummary = () => {
        return settings.allow_skip
            ? __('Skip enabled', 'fluent-player')
            : __('Skip disabled', 'fluent-player');
    };

    const getAppearanceSummary = () => {
        return summarizeAppearanceParts([
            settings.bg_color ? __('Background', 'fluent-player') : '',
            settings.text_color ? __('Text', 'fluent-player') : '',
        ]);
    };

    const handleAdd = () => {
        if (!settings.form_id) {
            showNotification({ type: 'error', message: __('Please select a form', 'fluent-player') });
            return;
        }

        const displayTime = timeToSeconds(
            settings.start_time_hours,
            settings.start_time_minutes,
            settings.start_time_seconds
        );

        const layerData = {
            ...settings,
            type: 'form',
            title: settings.title || '',
            displayTime: displayTime
        };
        if (editingLayer?.id) {
            layerData.id = editingLayer.id;
        }
        applyConditionStateKey(layerData);
        onAdd(layerData);
        showNotification({ type: 'success', message: editingLayer ? __('Layer updated.', 'fluent-player') : __('Layer added.', 'fluent-player') });
    };

    useImperativeHandle(ref, () => ({
        handleAdd
    }));

    const { openId: openSectionId, toggle: toggleSection } = useAccordionState(
        editingLayer ? LAYER_SECTION_IDS.CONTENT : LAYER_SECTION_IDS.DISPLAY
    );

    return (
        <div className="form-layer-settings">
            <SettingsSectionCard
                title={__('Display', 'fluent-player')}
                summary={getDisplaySummary()}
                isOpen={openSectionId === LAYER_SECTION_IDS.DISPLAY}
                onToggle={() => toggleSection(LAYER_SECTION_IDS.DISPLAY)}
            >
                <div className="fluent-player-form-row">
                    <TimeInput
                        hours={settings.start_time_hours || 0}
                        minutes={settings.start_time_minutes || 0}
                        seconds={settings.start_time_seconds || 0}
                        onChange={(field, value) => updateSetting(`start_time_${field}`, value)}
                        label={__('Start Time', 'fluent-player')}
                    />
                </div>
            </SettingsSectionCard>

            <SettingsSectionCard
                title={__('Content', 'fluent-player')}
                summary={getContentSummary()}
                isOpen={openSectionId === LAYER_SECTION_IDS.CONTENT}
                onToggle={() => toggleSection(LAYER_SECTION_IDS.CONTENT)}
            >
                <div className="fluent-player-form-row">
                    <label className="components-base-control__label">{__('Title', 'fluent-player')}</label>
                    <div className="fp-input-with-suffix">
                        <input
                            ref={titleInputRef}
                            type="text"
                            className="fp-input-with-suffix__input"
                            value={settings.title}
                            onChange={(e) => updateSetting('title', e.target.value)}
                            placeholder={__('Enter title', 'fluent-player')}
                        />
                        <ShortcodeInserter
                            inputRef={titleInputRef}
                            onInsert={(value) => updateSetting('title', value)}
                        />
                    </div>
                </div>

                <div className="fluent-player-form-row">
                    <SelectControl
                        label={__('Select Form', 'fluent-player') + ' *'}
                        value={settings.form_id}
                        options={[
                            { label: __('Select Form', 'fluent-player'), value: '' },
                            ...availableForms.map(form => ({
                                label: form.title || form.name,
                                value: form.id
                            }))
                        ]}
                        onChange={(value) => updateSetting('form_id', value)}
                        disabled={loading}
                    />
                    {loading && <p>{__('Loading forms...', 'fluent-player')}</p>}
                </div>
            </SettingsSectionCard>

            <SettingsSectionCard
                title={__('Layout', 'fluent-player')}
                summary={getLayoutSummary()}
                isOpen={openSectionId === LAYER_SECTION_IDS.LAYOUT}
                onToggle={() => toggleSection(LAYER_SECTION_IDS.LAYOUT)}
            >
                <div className="fluent-player-form-row">
                    <CustomRangeSlider
                        label={__('Form Width (%)', 'fluent-player')}
                        helpText={__('Width of the form container as percentage of player width', 'fluent-player')}
                        value={settings.width}
                        min={20}
                        max={100}
                        step={5}
                        onChange={(v) => updateSetting('width', Math.round(v))}
                        unit="%"
                    />
                </div>

                <div className="fluent-player-form-row">
                    <CustomRangeSlider
                        label={__('Form Height (%)', 'fluent-player')}
                        helpText={__('Height of the form container as percentage of player height', 'fluent-player')}
                        value={settings.height}
                        min={20}
                        max={100}
                        step={5}
                        onChange={(v) => updateSetting('height', Math.round(v))}
                        unit="%"
                    />
                </div>

                <div className="fluent-player-form-row">
                    <div className="custom-range-control">
                        <div className="custom-range-control-header">
                            <label className="custom-range-control-label">
                                {__('Position', 'fluent-player')}
                                <button
                                    type="button"
                                    ref={positionHelpIconRef}
                                    className="custom-range-control-info-icon"
                                    aria-label={__('Show help for position', 'fluent-player')}
                                    onClick={() => setShowPositionHelp(!showPositionHelp)}
                                    onMouseEnter={() => setShowPositionHelp(true)}
                                    onMouseLeave={() => setShowPositionHelp(false)}
                                    onFocus={() => setShowPositionHelp(true)}
                                    onBlur={() => setShowPositionHelp(false)}
                                >
                                    <InfoIconSVG />
                                </button>
                                <TooltipPortal isOpen={showPositionHelp} anchorRef={positionHelpIconRef}>
                                    {__('Position of the form container within the player', 'fluent-player')}
                                </TooltipPortal>
                            </label>
                        </div>
                        <div className="custom-range-control-content">
                            <PositionGrid
                                value={settings.position}
                                onChange={(value) => updateSetting('position', value)}
                                variant={9}
                                noWrapper
                            />
                        </div>
                    </div>
                </div>
            </SettingsSectionCard>

            <SettingsSectionCard
                title={__('Controls', 'fluent-player')}
                summary={getControlsSummary()}
                isOpen={openSectionId === LAYER_SECTION_IDS.CONTROLS}
                onToggle={() => toggleSection(LAYER_SECTION_IDS.CONTROLS)}
            >
                <div className="fluent-player-form-row">
                    <CustomToggle
                        label={__('Allow Skip', 'fluent-player')}
                        help={__('Allow users to skip this form', 'fluent-player')}
                        name="allow_skip"
                        checked={settings.allow_skip}
                        onChange={(checked) => updateSetting('allow_skip', checked)}
                    />
                </div>
            </SettingsSectionCard>

            <SettingsSectionCard
                title={__('Appearance', 'fluent-player')}
                summary={getAppearanceSummary()}
                isOpen={openSectionId === LAYER_SECTION_IDS.APPEARANCE}
                onToggle={() => toggleSection(LAYER_SECTION_IDS.APPEARANCE)}
            >
                <div className="fluent-player-form-row">
                    <div className="fp-color-section">
                        <label className="fp-color-section-label components-base-control__label">
                            {__('Color', 'fluent-player')}
                            <button
                                type="button"
                                ref={textColorHelpIconRef}
                                className="custom-range-control-info-icon"
                                aria-label={__('Show help for color', 'fluent-player')}
                                onClick={() => setShowTextColorHelp(!showTextColorHelp)}
                                onMouseEnter={() => setShowTextColorHelp(true)}
                                onMouseLeave={() => setShowTextColorHelp(false)}
                                onFocus={() => setShowTextColorHelp(true)}
                                onBlur={() => setShowTextColorHelp(false)}
                            >
                                <InfoIconSVG />
                            </button>
                            <TooltipPortal isOpen={showTextColorHelp} anchorRef={textColorHelpIconRef}>
                                {__('Text color applies to the title and form labels that don\'t have their own color set.', 'fluent-player')}
                            </TooltipPortal>
                        </label>
                        <div className="fp-color-trigger-list fp-color-trigger-list--side-by-side">
                            <ColorPickerInput
                                asTrigger
                                label={__('Background', 'fluent-player')}
                                value={settings.bg_color ?? ''}
                                onChange={(color) => updateSetting('bg_color', color)}
                            />
                            <ColorPickerInput
                                asTrigger
                                label={__('Text', 'fluent-player')}
                                value={settings.text_color ?? ''}
                                onChange={(color) => updateSetting('text_color', color)}
                            />
                        </div>
                    </div>
                </div>
            </SettingsSectionCard>

            {hasPro ? (
                <div className="fluent-player-form-row">
                    <ConditionSettings
                        value={settings.conditionals}
                        onChange={(value) => updateSetting('conditionals', value)}
                    />
                </div>
            ) : (
                <ConditionSettings
                    value={settings.conditionals}
                    onChange={(value) => updateSetting('conditionals', value)}
                />
            )}
        </div>
    );
});

export default FormLayerSettings;
