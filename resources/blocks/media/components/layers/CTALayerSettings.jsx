const { __ } = wp.i18n;
const { useState, useEffect, useImperativeHandle, forwardRef, useRef } = wp.element;
const { SelectControl } = wp.components;

import { formatTime, secondsToTime, timeToSeconds } from '@share/helper.js';
import { useNotification } from '../common/useNotification.js';
import TimeInput from '../common/TimeInput.jsx';
import ColorPickerInput from '../common/ColorPickerInput.jsx';
import CustomRangeSlider from '../common/CustomRangeSlider.jsx';
import CustomToggle from '../common/CustomToggle.jsx';
import ConditionSettings from '../common/ConditionSettings.jsx';
import WPEditor from '../common/WPEditor.jsx';
import SettingsSectionCard from '../common/SettingsSectionCard.jsx';
import useAccordionState from '../common/useAccordionState.js';
import { applyConditionStateKey } from '../../../hooks/conditionStateKey.js';
import {
	appendSummaryDetail,
	formatAtTimeSummary,
	getCtaDismissSummary,
	summarizeAppearanceParts,
	summarizeRichTextContent,
} from '../common/summaryHelpers.js';
import { LAYER_SECTION_IDS } from './layerSectionConfig.js';

const DEFAULT_CTA_CONTENT = '<p>&nbsp;</p>\n<h2 style="text-align: center; color: #ffffff; text-shadow: 0 1px 3px rgba(0,0,0,0.4); margin: 0 0 8px;">Ready to take the next step?</h2>\n<p style="text-align: center; color: rgba(255,255,255,0.85); margin: 0 0 16px;">Click the button below to learn more.</p>\n<p style="text-align: center;"><a style="background-color: #4e9cf6; color: #ffffff; display: inline-block; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;" href="#">Learn More</a></p>';
const CTALayerSettings = forwardRef(({ onAdd, onCancel, setPreviewLayer, editingLayer, currentTime = 0, onTimeChange }, ref) => {
	const { showNotification } = useNotification();
	const initialTime = editingLayer?.displayTime || currentTime || 0;
	const initialTimeParts = secondsToTime(initialTime);

	const [settings, setSettings] = useState({
		content: editingLayer?.content || (editingLayer ? '' : DEFAULT_CTA_CONTENT),
		bg_color: editingLayer?.bg_color || '',
		completion_type: editingLayer?.completion_type || 'link_click',
		auto_dismiss_duration: editingLayer?.auto_dismiss_duration || 5,
		allow_skip: editingLayer?.allow_skip !== undefined ? editingLayer.allow_skip : true,
		conditionals: editingLayer?.conditionals || undefined,
		start_time_hours: initialTimeParts.hours,
		start_time_minutes: initialTimeParts.minutes,
		start_time_seconds: initialTimeParts.seconds
	});
	const isTimeInputChangeRef = useRef(false);
	const lastSyncedTimeRef = useRef(initialTime);

	useEffect(() => {
		if (editingLayer) {
			const timeParts = secondsToTime(editingLayer.displayTime || 0);
			setSettings(prev => ({
				...prev,
				content: editingLayer.content || '',
				bg_color: editingLayer.bg_color || '',
				completion_type: editingLayer.completion_type || 'link_click',
				auto_dismiss_duration: editingLayer.auto_dismiss_duration || 5,
				allow_skip: editingLayer.allow_skip !== undefined ? editingLayer.allow_skip : true,
				conditionals: editingLayer.conditionals || undefined,
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
			setPreviewLayer({ type: 'cta', ...settings });
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

	const getTimingSummary = () => {
		return appendSummaryDetail(
			formatAtTimeSummary(timeToSeconds(
				settings.start_time_hours,
				settings.start_time_minutes,
				settings.start_time_seconds
			)),
			getCtaDismissSummary(settings.completion_type, settings.auto_dismiss_duration)
		);
	};

	const getContentSummary = () => summarizeRichTextContent(settings.content);

	const getInteractionSummary = () => {
		if (settings.completion_type === 'skip_only') {
			return __('Skip required', 'fluent-player');
		}

		return settings.allow_skip
			? __('Skip enabled', 'fluent-player')
			: __('Skip disabled', 'fluent-player');
	};

	const getAppearanceSummary = () => summarizeAppearanceParts(
		settings.bg_color ? [__('Background', 'fluent-player')] : [],
		__('Default background', 'fluent-player')
	);

	const handleAdd = () => {
		if (!settings.content || !settings.content.trim()) {
			showNotification({ type: 'error', message: __('Please enter content', 'fluent-player'), position: 'bottom-right' });
			return;
		}

		const displayTime = timeToSeconds(
			settings.start_time_hours,
			settings.start_time_minutes,
			settings.start_time_seconds
		);

		const layerData = {
			type: 'cta',
			cta_type: 'text',
			...settings,
			displayTime
		};

		if (editingLayer) {
			layerData.id = editingLayer.id;
		}

		applyConditionStateKey(layerData);
		onAdd(layerData);
		showNotification({ type: 'success', message: editingLayer ? __('Layer updated.', 'fluent-player') : __('Layer added.', 'fluent-player'), position: 'bottom-right' });
	};

	useImperativeHandle(ref, () => ({
		handleAdd
	}));

	const { openId: openSectionId, toggle: toggleSection } = useAccordionState(
		editingLayer ? LAYER_SECTION_IDS.CONTENT : LAYER_SECTION_IDS.DISPLAY
	);

	return (
		<div className="cta-layer-settings">
			<SettingsSectionCard
				title={__('Display', 'fluent-player')}
				summary={getTimingSummary()}
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

				<div className="fluent-player-form-row">
					<SelectControl
						label={__('Completion Type', 'fluent-player')}
						value={settings.completion_type}
						options={[
							{ label: __('Link Click', 'fluent-player'), value: 'link_click' },
							{ label: __('Auto Dismiss', 'fluent-player'), value: 'auto_dismiss' },
							{ label: __('Skip Only', 'fluent-player'), value: 'skip_only' }
						]}
						onChange={(value) => updateSetting('completion_type', value)}
						help={
							settings.completion_type === 'link_click'
								? __('Layer completes when a link or button is clicked', 'fluent-player')
								: settings.completion_type === 'auto_dismiss'
								? __('Layer auto-dismisses after a set duration', 'fluent-player')
								: __('Layer only completes via the skip button', 'fluent-player')
						}
					/>
				</div>

				{settings.completion_type === 'auto_dismiss' && (
					<div className="fluent-player-form-row">
						<CustomRangeSlider
							label={__('Auto Dismiss After (Seconds)', 'fluent-player')}
							value={settings.auto_dismiss_duration}
							min={1}
							max={60}
							step={1}
							onChange={(value) => updateSetting('auto_dismiss_duration', value)}
						/>
					</div>
				)}
			</SettingsSectionCard>

			<SettingsSectionCard
				title={__('Content', 'fluent-player')}
				summary={getContentSummary()}
				isOpen={openSectionId === LAYER_SECTION_IDS.CONTENT}
				onToggle={() => toggleSection(LAYER_SECTION_IDS.CONTENT)}
				unmountOnClose
			>
				<div className="fluent-player-form-row">
					<WPEditor
						id={editingLayer ? `cta_editor_${editingLayer.id}` : undefined}
						value={settings.content}
						onChange={(value) => updateSetting('content', value)}
						height={200}
					/>
				</div>
			</SettingsSectionCard>

			<SettingsSectionCard
				title={__('Controls', 'fluent-player')}
				summary={getInteractionSummary()}
				isOpen={openSectionId === LAYER_SECTION_IDS.CONTROLS}
				onToggle={() => toggleSection(LAYER_SECTION_IDS.CONTROLS)}
			>
				{settings.completion_type !== 'skip_only' && (
					<div className="fluent-player-form-row">
						<CustomToggle
							label={__('Allow Skip', 'fluent-player')}
							help={__('Allow users to skip this layer', 'fluent-player')}
							name="allow_skip"
							checked={settings.allow_skip}
							onChange={(value) => updateSetting('allow_skip', value)}
						/>
					</div>
				)}
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
									value={settings.bg_color}
									defaultValue="#0E121B"
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

export default CTALayerSettings;
