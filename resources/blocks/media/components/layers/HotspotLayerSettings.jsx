const { __, sprintf } = wp.i18n;
const {Button, TextControl, BaseControl, Dropdown} = wp.components;
const {useState, useEffect, useImperativeHandle, forwardRef, useRef, useCallback} = wp.element;
import IconRenderer from '../common/IconRenderer.jsx';
import { formatTime } from '@share/helper.js';
import TimeInput from '../common/TimeInput.jsx';
import TooltipPortal from '../common/TooltipPortal.jsx';
import ColorPickerInput from '../common/ColorPickerInput.jsx';
import CustomRangeSlider from '../common/CustomRangeSlider.jsx';
import ConditionSettings from '../common/ConditionSettings.jsx';
import ShortcodeInserter from '../common/ShortcodeInserter.jsx';
import { InfoIconSVG, DeleteIconSVG, EditIconSVG, PlusIconSVG, PinIconSVG, BackArrowSVG } from '../common/Icons.jsx';
import { useNotification } from '../common/useNotification.js';
import SettingsSectionCard from '../common/SettingsSectionCard.jsx';
import useAccordionState from '../common/useAccordionState.js';
import { applyConditionStateKey } from '../../../hooks/conditionStateKey.js';
import {
    appendSummaryDetail,
    formatAtTimeSummary,
    formatCompactDurationValue,
    summarizeHotspotsCount,
} from '../common/summaryHelpers.js';
import { LAYER_SECTION_IDS } from './layerSectionConfig.js';

const ICON_LIST = [
    "info-circle", "question-circle", "check-circle", "times-circle",
    "star", "heart", "home", "user", "cog", "bell", "envelope", "phone",
    "laptop", "camera", "film", "music", "gamepad", "book", "briefcase",
    "building", "map-marker", "comment", "share", "flag",
    "lock", "unlock", "key", "users", "user-circle", "user-friends",
    "user-plus", "user-times", "user-secret", "user-tie"
];

const secondsToTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return { hours, minutes, seconds: secs };
};

const timeToSeconds = (hours, minutes, seconds) => {
    return (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
};

const formatTimeForDisplay = (settings) => {
    const hours = settings.start_time_hours || 0;
    const minutes = settings.start_time_minutes || 0;
    const seconds = settings.start_time_seconds || 0;
    
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const getHotspotDisplayLabel = (hotspot, index) => {
    const typeLabel = hotspot.type === 'icon' ? __('Icon', 'fluent-player') : __('Dot', 'fluent-player');
    return `${__('Hotspot', 'fluent-player')} ${index + 1}(${typeLabel})`;
};

const getHotspotLayerTitle = (hotspots) => {
    if (!hotspots || !hotspots.length) return __('Hotspot', 'fluent-player');
    const titles = hotspots.map((h) => (h.tooltip_text || '').trim()).filter(Boolean);
    return titles.length ? titles.join(', ') : __('Hotspot', 'fluent-player');
};

const isValidHotspotColor = (v) => v && String(v).trim() && /^#[0-9A-Fa-f]{3,8}$/.test(String(v).trim());
const HotspotLayerSettings = forwardRef(({ onAdd, onCancel, setPreviewLayer, editingLayer, currentTime = 0, onTimeChange }, ref) => {
    const { showNotification } = useNotification();
    const initialTime = editingLayer?.displayTime || currentTime || 0;
    const initialTimeParts = secondsToTime(initialTime);
    const [editingIndex, setEditingIndex] = useState(editingLayer ? null : 0);
    const [showAddHotspotButton, setShowAddHotspotButton] = useState(editingLayer ? true : false);
    const [showIconHelp, setShowIconHelp] = useState({});
    const iconHelpRefs = useRef({});
    const tooltipInputRefs = useRef({});
    const linkInputRefs = useRef({});
    const isTimeInputChangeRef = useRef(false);
    const lastSyncedTimeRef = useRef(initialTime);

    const getOrCreateRef = useCallback((refsMap, index) => {
        if (!refsMap.current[index]) refsMap.current[index] = { current: null };
        return refsMap.current[index];
    }, []);

    const [settings, setSettings] = useState({
        title: '',
        duration: 5,
        pauseOnHover: false,
        hotspots: [
            {
                id: Date.now(),
                tooltip_text: '',
                link: '',
                type: 'style',
                background_color: '',
                icon: 'info-circle',
                position_x: 8,
                position_y: 12,
                size: 45
            }
        ],
        start_time_hours: initialTimeParts.hours,
        start_time_minutes: initialTimeParts.minutes,
        start_time_seconds: initialTimeParts.seconds
    });

    useEffect(() => {
        if (editingLayer) {
            const timeParts = secondsToTime(editingLayer.displayTime || 0);
            setSettings(prev => ({
                ...prev,
                ...editingLayer,
                hotspots: editingLayer.hotspots || prev.hotspots,
                start_time_hours: timeParts.hours,
                start_time_minutes: timeParts.minutes,
                start_time_seconds: timeParts.seconds
            }));
            lastSyncedTimeRef.current = editingLayer.displayTime || 0;
        }
    }, [editingLayer]);

    // Sync time inputs from slider/seek (only when currentTime changes from parent, not from input changes)
    useEffect(() => {
        if (isTimeInputChangeRef.current) {
            isTimeInputChangeRef.current = false;
            return;
        }
        if (currentTime !== undefined && currentTime !== lastSyncedTimeRef.current) {
            setSettings(prev => {
                const currentTimeFromInputs = timeToSeconds(prev.start_time_hours, prev.start_time_minutes, prev.start_time_seconds);
                if (Math.abs(currentTime - currentTimeFromInputs) > 0.5) {
                    const timeParts = secondsToTime(currentTime);
                    lastSyncedTimeRef.current = currentTime;
                    return { ...prev, start_time_hours: timeParts.hours, start_time_minutes: timeParts.minutes, start_time_seconds: timeParts.seconds };
                }
                return prev;
            });
        }
    }, [currentTime]);

    useEffect(() => {
        setPreviewLayer({
            type: 'hotspot',
            ...settings,
            title: getHotspotLayerTitle(settings.hotspots)
        });
    }, [settings]);

    useEffect(() => {
        if (onTimeChange) {
            const displayTime = timeToSeconds(settings.start_time_hours, settings.start_time_minutes, settings.start_time_seconds);
            onTimeChange(displayTime);
        }
    }, [settings.start_time_hours, settings.start_time_minutes, settings.start_time_seconds]);

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleTimeChange = (field, value) => {
        isTimeInputChangeRef.current = true;
        updateSetting(`start_time_${field}`, value);
    };

    const getDisplaySummary = () => {
        return appendSummaryDetail(
            formatAtTimeSummary(timeToSeconds(
                settings.start_time_hours,
                settings.start_time_minutes,
                settings.start_time_seconds
            )),
            sprintf(
                /* translators: %s: hotspot layer duration */
                __('%s duration', 'fluent-player'),
                formatCompactDurationValue(settings.duration)
            )
        );
    };

    const getControlsSummary = () => {
        return settings.pauseOnHover
            ? __('Pause on hover', 'fluent-player')
            : __('Keep playing on hover', 'fluent-player');
    };

    const getHotspotsSummary = () => {
        return summarizeHotspotsCount(settings.hotspots, 5);
    };

    const updateHotspot = (index, key, value) => {
        setSettings(prev => ({
            ...prev,
            hotspots: prev.hotspots.map((hotspot, i) => 
                i === index ? { ...hotspot, [key]: value } : hotspot
            )
        }));
    };

    const addHotspot = useCallback(() => {
        if (settings.hotspots.length >= 5) {
            showNotification({ type: 'warning', message: __('Maximum 5 hotspots allowed per layer', 'fluent-player') });
            return;
        }

        const newHotspot = {
            id: Date.now(),
            tooltip_text: '',
            link: '',
            type: 'style',
            background_color: '#1F3BAD',
            icon: 'info-circle',
            position_x: 8,
            position_y: 12,
            size: 24
        };
        
        const newIndex = settings.hotspots.length;
        setSettings(prev => ({
            ...prev,
            hotspots: [...prev.hotspots, newHotspot]
        }));
        setEditingIndex(newIndex);
        setShowAddHotspotButton(false);
    }, [settings.hotspots.length]);

    const removeHotspot = useCallback((index) => {
        setSettings(prev => {
            const newHotspots = prev.hotspots.filter((_, i) => i !== index);
            return {
                ...prev,
                hotspots: newHotspots
            };
        });
        
        if (editingIndex === index) {
            setEditingIndex(null);
            setShowAddHotspotButton(true);
        } else if (editingIndex !== null && editingIndex > index) {
            setEditingIndex(editingIndex - 1);
        }
        
        if (settings.hotspots.length <= 1) {
            setShowAddHotspotButton(true);
        }
    }, [editingIndex, settings.hotspots.length]);

    const handleAddFromCard = useCallback(() => {
        setEditingIndex(null);
        setShowAddHotspotButton(true);
    }, []);

    const handleAdd = () => {
        for (let i = 0; i < settings.hotspots.length; i++) {
            const hotspot = settings.hotspots[i];
            if (!hotspot.tooltip_text || !String(hotspot.tooltip_text).trim()) {
                showNotification({ type: 'error', message: __(`Please enter tooltip text for hotspot ${i + 1}`, 'fluent-player') });
                return;
            }
        }

        const displayTime = timeToSeconds(
            settings.start_time_hours,
            settings.start_time_minutes,
            settings.start_time_seconds
        );

        const layerData = {
            type: 'hotspot',
            ...settings,
            title: getHotspotLayerTitle(settings.hotspots),
            displayTime: displayTime
        };

        if (editingLayer) {
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
        editingLayer ? LAYER_SECTION_IDS.HOTSPOTS : LAYER_SECTION_IDS.DISPLAY
    );

    return (
        <div className="hotspot-layer-settings">
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
                        onChange={handleTimeChange}
                        label={__('Start Time', 'fluent-player')}
                    />
                </div>

                <div className="fluent-player-form-row">
                    <CustomRangeSlider
                        label={__('Layer Duration (seconds)', 'fluent-player')}
                        helpText={__('Duration (in seconds) this layer will stay visible', 'fluent-player')}
                        value={settings.duration}
                        min={1}
                        max={200}
                        step={1}
                        onChange={(v) => updateSetting('duration', Math.round(v))}
                        unit="s"
                    />
                </div>
            </SettingsSectionCard>

            <SettingsSectionCard
                title={__('Controls', 'fluent-player')}
                summary={getControlsSummary()}
                isOpen={openSectionId === LAYER_SECTION_IDS.CONTROLS}
                onToggle={() => toggleSection(LAYER_SECTION_IDS.CONTROLS)}
            >
                <div className="fluent-player-form-row">
                    <div className="custom-toggle-control">
                        <div className="custom-toggle-control-content">
                            <div className="custom-toggle-control-text">
                                <label className="custom-toggle-control-label">
                                    {__('Pause video on layer hover', 'fluent-player')}
                                </label>
                                <p className="custom-toggle-control-help">
                                    {__('Player will pause the video while users hover over the hotspots', 'fluent-player')}
                                </p>
                            </div>
                            <label className="custom-toggle-switch">
                                <input
                                    className="custom-toggle-input"
                                    name="pauseOnHover"
                                    type="checkbox"
                                    checked={settings.pauseOnHover}
                                    onChange={(e) => updateSetting('pauseOnHover', e.target.checked)}
                                />
                                <span className="custom-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            </SettingsSectionCard>

            <SettingsSectionCard
                title={__('Hotspots', 'fluent-player')}
                summary={getHotspotsSummary()}
                isOpen={openSectionId === LAYER_SECTION_IDS.HOTSPOTS}
                onToggle={() => toggleSection(LAYER_SECTION_IDS.HOTSPOTS)}
            >
                <div className="hotspots-section">
                    {settings.hotspots.map((hotspot, index) => {
                        if (editingIndex === index) return null;
                        
                        return (
                            <div 
                                key={hotspot.id} 
                                className="hotspot-card hotspot-card-saved" 
                                role="button"
                                tabIndex={0}
                                aria-label={sprintf(
                                    /* translators: %d: hotspot number */
                                    __('Edit hotspot %d', 'fluent-player'),
                                    index + 1
                                )}
                                onClick={() => {
                                    setEditingIndex(index);
                                    setShowAddHotspotButton(false);
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        setEditingIndex(index);
                                        setShowAddHotspotButton(false);
                                    }
                                }}
                            >
                                <div className="hotspot-card-header">
                                    <div className="hotspot-card-info">
                                        <PinIconSVG />
                                        <div className="hotspot-card-text">
                                            <div className="hotspot-card-title">
                                                {getHotspotDisplayLabel(hotspot, index)}
                                            </div>
                                            <div className="hotspot-card-subtitle">
                                                {formatTimeForDisplay(settings)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hotspot-card-actions fp-card-actions">
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingIndex(index);
                                                setShowAddHotspotButton(false);
                                            }}
                                            className="hotspot-card-edit-button fp-icon-btn fp-icon-btn--secondary"
                                            aria-label={__('Edit hotspot', 'fluent-player')}
                                        >
                                            <EditIconSVG />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {editingIndex !== null && settings.hotspots[editingIndex] && (
                        <div className="hotspot-card is-editing">
                            {(() => {
                                const hotspot = settings.hotspots[editingIndex];
                                const index = editingIndex;
                                return (
                                    <>
                                        <div className="hotspot-card-editing-header">
                                            <Button
                                                onClick={handleAddFromCard}
                                                className="back-button fp-icon-btn"
                                                aria-label={__('Save hotspot', 'fluent-player')}
                                            >
                                                <BackArrowSVG />
                                            </Button>
                                            <span className="hotspot-card-editing-title">
                                                {__('Hotspot', 'fluent-player')} {index + 1}
                                            </span>
                                            <Button
                                                onClick={() => removeHotspot(index)}
                                                className="hotspot-delete-button fp-icon-btn fp-icon-btn--danger"
                                                aria-label={__('Delete hotspot', 'fluent-player')}
                                            >
                                                <DeleteIconSVG />
                                            </Button>
                                        </div>

                                        <div className="hotspot-card-body">
                                            <div className="fluent-player-form-row">
                                                <BaseControl label={__('Hotspot Type', 'fluent-player')}>
                                                    <div className="hotspot-type-radio-group">
                                                        <label className={`hotspot-type-radio components-base-control__label ${hotspot.type === 'style' ? 'is-selected' : ''}`}>
                                                            <input
                                                                type="radio"
                                                                name={`hotspot-type-${index}`}
                                                                value="style"
                                                                checked={hotspot.type === 'style'}
                                                                onChange={() => updateHotspot(index, 'type', 'style')}
                                                            />
                                                            <span className="hotspot-type-radio-indicator"></span>
                                                            <span className="hotspot-type-radio-label">{__('Dot', 'fluent-player')}</span>
                                                        </label>
                                                        <label className={`hotspot-type-radio components-base-control__label ${hotspot.type === 'icon' ? 'is-selected' : ''}`}>
                                                            <input
                                                                type="radio"
                                                                name={`hotspot-type-${index}`}
                                                                value="icon"
                                                                checked={hotspot.type === 'icon'}
                                                                onChange={() => updateHotspot(index, 'type', 'icon')}
                                                            />
                                                            <span className="hotspot-type-radio-indicator"></span>
                                                            <span className="hotspot-type-radio-label">{__('Icon', 'fluent-player')}</span>
                                                        </label>
                                                    </div>
                                                </BaseControl>
                                            </div>

                                            {hotspot.type === 'icon' && (
                                                <div className="fluent-player-form-row">
                                                    <BaseControl label={__('Add Icon', 'fluent-player') + ' *'}>
                                                        <div className="hotspot-icon-picker-wrapper">
                                                            <div 
                                                                className="hotspot-icon-preview"
                                                                style={{ backgroundColor: isValidHotspotColor(hotspot.background_color) ? hotspot.background_color : 'transparent' }}
                                                            >
                                                                {hotspot.icon && (
                                                                    <IconRenderer iconName={hotspot.icon} style={{ fill: '#fff', width: 20, height: 20 }} />
                                                                )}
                                                            </div>
                                    <Dropdown
                                                            popoverProps={{ placement: 'bottom-start', className: 'fp-hotspot-icon-popover' }}
                                        renderToggle={({ isOpen, onToggle }) => (
                                            <Button
                                                                    className="hotspot-icon-change-button fp-btn-secondary"
                                                onClick={onToggle}
                                                aria-expanded={isOpen}
                                                aria-label={__('Change hotspot icon', 'fluent-player')}
                                            >
                                                                    {__('Change', 'fluent-player')}
                                            </Button>
                                        )}
                                                            renderContent={({ onClose }) => (
                                                                <div className="hotspot-icon-picker-dropdown">
                                                                    <div className="hotspot-icon-picker-grid">
                                                                        {ICON_LIST.map((iconName, iconIndex) => (
                                                                            <button
                                                                                key={iconName + iconIndex}
                                                                                type="button"
                                                                                className={`hotspot-icon-picker-item ${hotspot.icon === iconName ? 'is-selected' : ''}`}
                                                                                aria-label={sprintf(
                                                                                    /* translators: %s: icon name */
                                                                                    __('Select %s icon', 'fluent-player'),
                                                                                    iconName
                                                                                )}
                                                                                onClick={() => {
                                                                                    updateHotspot(index, 'icon', iconName);
                                                                                    onClose();
                                                                                }}
                                                                                title={iconName}
                                                                            >
                                                                                <IconRenderer iconName={iconName} style={{ fill: 'currentColor' }} />
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        />
                                                            <Button
                                                                className="hotspot-icon-delete-button fp-icon-btn fp-icon-btn--danger"
                                                                onClick={() => updateHotspot(index, 'icon', '')}
                                                                aria-label={__('Remove hotspot icon', 'fluent-player')}
                                                            >
                                                                <DeleteIconSVG />
                                                            </Button>
                                                        </div>
                                                    </BaseControl>
                                                </div>
                                            )}

                                <div className="fluent-player-form-row">
                                    <label className="components-base-control__label">{__('Tooltip Text', 'fluent-player')} *</label>
                                    <div className="fp-input-with-suffix">
                                        <input
                                            ref={(el) => { getOrCreateRef(tooltipInputRefs, index).current = el; }}
                                            type="text"
                                            className="fp-input-with-suffix__input"
                                            value={hotspot.tooltip_text}
                                            onChange={(e) => updateHotspot(index, 'tooltip_text', e.target.value)}
                                            placeholder={__('Enter tooltip text', 'fluent-player')}
                                        />
                                        <ShortcodeInserter
                                            inputRef={getOrCreateRef(tooltipInputRefs, index)}
                                            onInsert={(value) => updateHotspot(index, 'tooltip_text', value)}
                                        />
                                    </div>
                                </div>

                                <div className="fluent-player-form-row">
                                    <label className="components-base-control__label">{__('Hotspot Link', 'fluent-player')}</label>
                                    <div className="fp-input-with-suffix">
                                        <input
                                            ref={(el) => { getOrCreateRef(linkInputRefs, index).current = el; }}
                                            type="text"
                                            className="fp-input-with-suffix__input"
                                            value={hotspot.link}
                                            onChange={(e) => updateHotspot(index, 'link', e.target.value)}
                                            placeholder={__('https://', 'fluent-player')}
                                        />
                                        <ShortcodeInserter
                                            inputRef={getOrCreateRef(linkInputRefs, index)}
                                            onInsert={(value) => updateHotspot(index, 'link', value)}
                                        />
                                    </div>
                                    <p className="components-base-control__help">{__('URL to navigate to when hotspot is clicked', 'fluent-player')}</p>
                                </div>

                                <div className="fluent-player-form-row">
                                    <div className="fp-color-section">
                                        <label className="fp-color-section-label components-base-control__label">
                                            {__('Hotspot Color', 'fluent-player')}
                                        </label>
                                        <div className="fp-color-trigger-list">
                                            <ColorPickerInput
                                                asTrigger
                                                label={__('Background', 'fluent-player')}
                                                value={hotspot.background_color ?? ''}
                                                onChange={(color) => updateHotspot(index, 'background_color', color === undefined || color === null ? '' : color)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="fluent-player-form-row">
                                    <CustomRangeSlider
                                        label={__('Hotspot Size (PX)', 'fluent-player')}
                                        value={hotspot.size}
                                        min={10}
                                        max={100}
                                        step={1}
                                        onChange={(v) => updateHotspot(index, 'size', Math.round(v))}
                                        unit="px"
                                    />
                                </div>

                                <div className="fluent-player-form-row">
                                    <CustomRangeSlider
                                        label={__('Position X', 'fluent-player')}
                                        value={hotspot.position_x}
                                        min={0}
                                        max={100}
                                        step={1}
                                        onChange={(v) => updateHotspot(index, 'position_x', Math.round(v))}
                                    />
                                </div>

                                <div className="fluent-player-form-row">
                                    <CustomRangeSlider
                                        label={__('Position Y', 'fluent-player')}
                                        value={hotspot.position_y}
                                        min={0}
                                        max={100}
                                        step={1}
                                        onChange={(v) => updateHotspot(index, 'position_y', Math.round(v))}
                                    />
                                </div>
            </div>

                                        <div className="hotspot-card-footer">
                                            <Button
                                                onClick={handleAddFromCard}
                                                className="hotspot-add-button fp-btn-primary"
                                            >
                                                {__('Add', 'fluent-player')}
                    </Button>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {showAddHotspotButton && editingIndex === null && (
                        <Button
                            onClick={addHotspot}
                            className="add-hotspot-button fp-btn-secondary"
                            disabled={settings.hotspots.length >= 5}
                        >
                            <PlusIconSVG />
                            {__('Add Hotspot', 'fluent-player')}
                    </Button>
                    )}
                </div>
            </SettingsSectionCard>

            <div className="fluent-player-form-row">
                <ConditionSettings
                    value={settings.conditionals}
                    onChange={(value) => updateSetting('conditionals', value)}
                    fieldKeys={['viewer.is_logged_in', 'viewer.is_crm_contact', 'viewer.crm_tag', 'viewer.crm_list', 'viewer.email_submitted', 'page.query', 'layer.seen']}
                />
            </div>
        </div>
    );
});

export default HotspotLayerSettings;
