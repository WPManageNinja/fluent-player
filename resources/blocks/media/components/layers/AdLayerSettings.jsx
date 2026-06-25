const { __, sprintf } = wp.i18n;
const { Button, BaseControl } = wp.components;
const { useState, useEffect, useImperativeHandle, forwardRef, useRef } = wp.element;
const { MediaUpload, MediaUploadCheck } = wp.blockEditor;

import { DeleteIconSVG } from '../common/Icons.jsx';
import { formatTime, secondsToTime, timeToSeconds } from '@share/helper.js';
import { useNotification } from '../common/useNotification.js';
import TimeInput from '../common/TimeInput.jsx';
import CustomRangeSlider from '../common/CustomRangeSlider.jsx';
import CustomToggle from '../common/CustomToggle.jsx';
import ColorPickerInput from '../common/ColorPickerInput.jsx';
import ConditionSettings from '../common/ConditionSettings.jsx';
import SettingsSectionCard from '../common/SettingsSectionCard.jsx';
import useAccordionState from '../common/useAccordionState.js';
import { applyConditionStateKey } from '../../../hooks/conditionStateKey.js';
import {
	appendSummaryDetail,
	formatAtTimeSummary,
	formatCompactDurationValue,
	formatDurationSummary,
	summarizeAppearanceParts,
} from '../common/summaryHelpers.js';
import { LAYER_SECTION_IDS } from './layerSectionConfig.js';

const AdLayerSettings = forwardRef(({ onAdd, onCancel, setPreviewLayer, editingLayer, currentTime = 0, onTimeChange }, ref) => {
	const { showNotification } = useNotification();
	const initialTime = editingLayer?.displayTime || currentTime || 0;
	const initialTimeParts = secondsToTime(initialTime);

	const [settings, setSettings] = useState({
		allow_skip: true,
		media_url: '',
		media_id: '',
		media_type: '',
		skip_offset: 0,
		duration: 5,
		fill_bar_color: '#000000',
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
			setPreviewLayer({ type: 'ad', ...settings });
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
		const displaySummary = formatAtTimeSummary(timeToSeconds(
			settings.start_time_hours,
			settings.start_time_minutes,
			settings.start_time_seconds
		));

		if (settings.media_type === 'image') {
			return appendSummaryDetail(
				displaySummary,
				sprintf(
					/* translators: %s: image ad duration */
					__('%s duration', 'fluent-player'),
					formatCompactDurationValue(settings.duration ?? 5)
				)
			);
		}

		return displaySummary;
	};

	const getContentSummary = () => {
		if (!settings.media_url) {
			return __('No media selected', 'fluent-player');
		}

		return settings.media_type === 'video'
			? __('Video ad selected', 'fluent-player')
			: __('Image ad selected', 'fluent-player');
	};

	const getControlsSummary = () => {
		if (!settings.allow_skip) {
			return __('Skipping disabled', 'fluent-player');
		}

		return sprintf(
			/* translators: %s: formatted skip offset duration */
			__('Skip after %s', 'fluent-player'),
			formatCompactDurationValue(settings.skip_offset ?? 0)
		);
	};

	const getAppearanceSummary = () => summarizeAppearanceParts(
		settings.fill_bar_color ? [__('Progress fill', 'fluent-player')] : [],
		__('Default progress bar', 'fluent-player')
	);

	const handleAdd = () => {
		if (!settings.media_url) {
			showNotification({ type: 'error', message: __('Please upload an image or video', 'fluent-player') });
			return;
		}

		const displayTime = timeToSeconds(
			settings.start_time_hours,
			settings.start_time_minutes,
			settings.start_time_seconds
		);

		const layerData = {
			type: 'ad',
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
		<div className="ad-layer-settings">
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

				{settings.media_type === 'image' && (
					<div className="fluent-player-form-row">
						<CustomRangeSlider
							value={settings.duration ?? 5}
							min={0}
							max={120}
							step={1}
							onChange={(value) => updateSetting('duration', value)}
							label={__('Duration (seconds)', 'fluent-player')}
							helpText={__('After this many seconds the layer will hide automatically. Set to 0 to show until the user skips.', 'fluent-player')}
						/>
					</div>
				)}
			</SettingsSectionCard>

			<SettingsSectionCard
				title={__('Content', 'fluent-player')}
				summary={getContentSummary()}
				isOpen={openSectionId === LAYER_SECTION_IDS.CONTENT}
				onToggle={() => toggleSection(LAYER_SECTION_IDS.CONTENT)}
			>
				<div className="fluent-player-form-row">
					<label className="components-base-control__label">
						{__("Add Media", "fluent-player") + ' *'}
					</label>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={(media) => {
								updateSetting("media_id", media.id);
								updateSetting("media_url", media.url);
								updateSetting("media_type", media.type);
							}}
							allowedTypes={["image", "video"]}
							value={settings.media_id}
							render={({ open }) => (
								<div className={`image-upload-container ${settings.media_url ? 'has-image' : ''}`}>
									{settings.media_url ? (
										<>
											<div className="image-upload-preview">
												{settings.media_type === 'video' ? (
													<video src={settings.media_url} />
												) : (
													<img src={settings.media_url} alt="" />
												)}
											</div>
											<Button className="image-upload-change-btn fp-btn-secondary" onClick={open}>
												{__("Change", "fluent-player")}
											</Button>
											<Button
												className="fp-delete-button fp-icon-btn fp-icon-btn--danger"
												onClick={() => {
													updateSetting("media_id", "");
													updateSetting("media_url", "");
													updateSetting("media_type", "");
												}}
												aria-label={__("Delete media", "fluent-player")}
											>
												<DeleteIconSVG />
											</Button>
										</>
									) : (
										<Button className="fp-btn-primary" onClick={open}>
											{__("Upload", "fluent-player")}
										</Button>
									)}
								</div>
							)}
						/>
					</MediaUploadCheck>
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
						checked={settings.allow_skip}
						onChange={(value) => updateSetting('allow_skip', value)}
						label={__('Allow Skip', 'fluent-player')}
						help={__('Allow users to skip this ad', 'fluent-player')}
						name="allow_skip"
					/>
				</div>

				{settings.allow_skip && (
					<div className="fluent-player-form-row">
						<CustomRangeSlider
							value={settings.skip_offset}
							min={0}
							max={200}
							step={1}
							onChange={(value) => updateSetting('skip_offset', value)}
							label={__('Skip Offset (seconds)', 'fluent-player')}
							helpText={__('Time in seconds after which the skip button will appear', 'fluent-player')}
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
							{__('Progress Bar Color', 'fluent-player')}
						</label>
						<div className="fp-color-trigger-list">
							<ColorPickerInput
								asTrigger
								label={__('Fill', 'fluent-player')}
								value={settings.fill_bar_color ?? '#000000'}
								defaultValue="#000000"
								onChange={(value) => updateSetting('fill_bar_color', value)}
							/>
						</div>
						<p className="components-base-control__help" style={{ marginTop: 4 }}>
							{__('Color of the time-remaining bar. The track uses the same color at 50% opacity.', 'fluent-player')}
						</p>
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

export default AdLayerSettings;
