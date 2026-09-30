const { __, sprintf } = wp.i18n;
const { TextControl, BaseControl } = wp.components;
const { useState, useEffect, useImperativeHandle, forwardRef, useRef } = wp.element;

import { formatTime, secondsToTime, timeToSeconds } from '@share/helper.js';
import { useNotification } from '../common/useNotification.js';
import InfoIcon from '../common/InfoIcon.jsx';
import TimeInput from '../common/TimeInput.jsx';
import CustomRangeSlider from '../common/CustomRangeSlider.jsx';
import ColorPickerInput from '../common/ColorPickerInput.jsx';
import ConditionSettings from '../common/ConditionSettings.jsx';
import ShortcodeInserter from '../common/ShortcodeInserter.jsx';
import SettingsSectionCard from '../common/SettingsSectionCard.jsx';
import useAccordionState from '../common/useAccordionState.js';
import { applyConditionStateKey } from '../../../hooks/conditionStateKey.js';
import {
	formatAtTimeSummary,
	summarizeAppearanceParts,
	summarizeShortcodeContent,
} from '../common/summaryHelpers.js';
import { LAYER_SECTION_IDS } from './layerSectionConfig.js';

const ShortcodeLayerSettings = forwardRef(({ onAdd, onCancel, setPreviewLayer, editingLayer, currentTime = 0, onTimeChange }, ref) => {
	const { showNotification } = useNotification();
	const initialTime = editingLayer?.displayTime || currentTime || 0;
	const initialTimeParts = secondsToTime(initialTime);
	const titleInputRef = useRef(null);
	const isTimeInputChangeRef = useRef(false);
	const lastSyncedTimeRef = useRef(initialTime);

	const [settings, setSettings] = useState({
		title: '',
		shortcode: '',
		width: 80,
		bg_color: '#FFFFFFB3',
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
		if (settings) {
			setPreviewLayer({ type: 'shortcode', ...settings });
		}
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
		return formatAtTimeSummary(timeToSeconds(
			settings.start_time_hours,
			settings.start_time_minutes,
			settings.start_time_seconds
		));
	};

	const getContentSummary = () => summarizeShortcodeContent({
		title: settings.title,
		shortcode: settings.shortcode,
	});

	const getLayoutSummary = () => {
		return sprintf(
			/* translators: %d: shortcode width percentage */
			__('%d%% width', 'fluent-player'),
			Number(settings.width || 0)
		);
	};

	const getAppearanceSummary = () => summarizeAppearanceParts(
		settings.bg_color ? [__('Background', 'fluent-player')] : [],
		__('Default background', 'fluent-player')
	);

	const handleAdd = () => {
		if (!settings.title || !settings.title.trim()) {
			showNotification({ type: 'error', message: __('Please enter a layer title', 'fluent-player') });
			return;
		}
		if (!settings.shortcode.trim()) {
			showNotification({ type: 'error', message: __('Please enter a shortcode', 'fluent-player') });
			return;
		}

		const displayTime = timeToSeconds(
			settings.start_time_hours,
			settings.start_time_minutes,
			settings.start_time_seconds
		);

		const layerData = {
			type: 'shortcode',
			...settings,
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
		editingLayer ? LAYER_SECTION_IDS.CONTENT : LAYER_SECTION_IDS.DISPLAY
	);

	return (
		<div className="shortcode-layer-settings">
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
					<div className="custom-range-control">
						<div className="custom-range-control-header">
							<label className="custom-range-control-label components-base-control__label">
								{__('Title', 'fluent-player')} *
								<InfoIcon
									label={__('Show help for title', 'fluent-player')}
									tooltip={__('Title for the shortcode layer', 'fluent-player')}
								/>
							</label>
						</div>
						<div className="fp-input-with-suffix">
							<input
								ref={titleInputRef}
								type="text"
								className="fp-input-with-suffix__input"
								value={settings.title}
								onChange={(e) => updateSetting('title', e.target.value)}
								placeholder={__('Enter layer title...', 'fluent-player')}
							/>
							<ShortcodeInserter
								inputRef={titleInputRef}
								onInsert={(value) => updateSetting('title', value)}
							/>
						</div>
					</div>
				</div>

				<div className="fluent-player-form-row">
					<div className="custom-range-control">
						<div className="custom-range-control-header">
							<label className="custom-range-control-label components-base-control__label">
								{__('Shortcode', 'fluent-player') + ' *'}
								<InfoIcon
									label={__('Show help for shortcode', 'fluent-player')}
									tooltip={__('Enter the shortcode to be rendered in the layer', 'fluent-player')}
								/>
							</label>
						</div>
						<TextControl
							value={settings.shortcode}
							onChange={(value) => updateSetting('shortcode', value)}
							placeholder={__('[your_shortcode_here]', 'fluent-player')}
						/>
					</div>
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
						label={__('Width (%)', 'fluent-player')}
						helpText={__('Width of the shortcode content as percentage of player width', 'fluent-player')}
						value={settings.width}
						min={20}
						max={100}
						step={5}
						onChange={(value) => updateSetting('width', value)}
						unit="%"
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
								{__('Layer Color', 'fluent-player')}
							</label>
							<div className="fp-color-trigger-list">
								<ColorPickerInput
									asTrigger
									label={__('Background', 'fluent-player')}
									value={settings.bg_color ?? ''}
									defaultValue="#FFFFFFB3"
									onChange={(color) => updateSetting('bg_color', color)}
								/>
						</div>
					</div>
				</div>
			</SettingsSectionCard>

			<div className="fluent-player-form-row">
				<ConditionSettings
					value={settings.conditionals}
					onChange={(value) => updateSetting('conditionals', value)}
				/>
			</div>
		</div>
	);
});

export default ShortcodeLayerSettings;
