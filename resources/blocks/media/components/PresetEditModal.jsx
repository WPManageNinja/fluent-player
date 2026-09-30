const {__, sprintf} = wp.i18n;
const {Button, Modal, TextControl, SelectControl, TextareaControl, BaseControl} = wp.components;
const {useState, useEffect, useRef, useMemo} = wp.element;
const {apiFetch} = wp;

import FluentPlayer from './player/FluentPlayer.jsx';
import ColorPickerInput from './common/ColorPickerInput.jsx';
import {EmailProviderSettings} from './EmailProviderSettings.jsx';
import './PresetStyles.scss';
import ProModal from './common/ProModal.jsx';
import CollapsiblePanel from './common/CollapsiblePanel.jsx';
import CustomToggle from './common/CustomToggle.jsx';
import CustomRangeSlider from './common/CustomRangeSlider.jsx';
import ConditionSettings from './common/ConditionSettings.jsx';
import ShortcodeInserter from './common/ShortcodeInserter.jsx';
import InfoIcon from './common/InfoIcon.jsx';
import WPEditor from './common/WPEditor.jsx';
import SettingsSectionCard from './common/SettingsSectionCard.jsx';
import useAccordionState from './common/useAccordionState.js';
import { useNotification } from './common/useNotification.js';
import {
	appendSummaryDetail,
	formatAtPercentSummary,
	getCtaDismissSummary,
	summarizeActionBarContent,
	summarizeActionBarControls,
	summarizeAppearanceParts,
	summarizeButtonSetup,
	summarizeEmailContent,
	summarizeProviderNames,
	summarizeRichTextContent,
	summarizeYoutubeSetup,
} from './common/summaryHelpers.js';

const PRESET_PANEL_IDS = {
	CONTROLS: 'controls',
	BEHAVIORS: 'behaviors',
	CONTEXT_MENU: 'context-menu',
	SUBTITLES: 'subtitles',
	EMAIL_CAPTURE: 'email-capture',
	CTA: 'cta',
	ACTION_BAR: 'action-bar',
};

const YOUTUBE_CHANNEL_ID_PATTERN = /^UC[a-zA-Z0-9_-]{22}$/;

const isAmbientPresetSettings = (settings = {}) => (
	settings?.skin === 'minimal'
	&& settings?.behaviors?.muted_autoplay === true
	&& settings?.behaviors?.on_video_end === 'loop'
	&& settings?.behaviors?.hide_top_controls === true
	&& settings?.behaviors?.hide_center_controls === true
	&& settings?.behaviors?.hide_bottom_controls === true
);

const getDefaultContextMenuSettings = (settings = {}) => {
	if (isAmbientPresetSettings(settings)) {
		return {
			enabled: false,
			items: {
				copy_link: false,
				copy_link_at_time: false,
				loop: false,
				playback_speed: false,
				captions: false,
				pip: false,
			},
		};
	}

	const controls = settings?.controls || {};
	const savedConfig = settings?.context_menu || {};
	const savedItems = savedConfig?.items || {};

	return {
		enabled: savedConfig?.enabled !== false,
		items: {
			copy_link: savedItems.copy_link ?? true,
			copy_link_at_time: savedItems.copy_link_at_time ?? true,
			loop: savedItems.loop ?? true,
			playback_speed: savedItems.playback_speed ?? (controls.playback_speed !== false),
			captions: savedItems.captions ?? (controls.captions_toggle !== false && settings?.styles?.captions?.enabled !== false),
			pip: savedItems.pip ?? (controls.pip !== false),
		},
	};
};

const PresetEditModalContent = ({
	isNewPreset,
	mediaSettings,
	presetData,
	setPresetData,
	onSave,
	onClose,
	requestPath,
	hasChanges,
	setHasChanges
}) => {
	const { showNotification } = useNotification();

	const modalTitle = isNewPreset
		? __('Create New Preset', 'fluent-player')
		: __('Edit Preset', 'fluent-player');

	const saveButtonText = isNewPreset
		? __('Create Preset', 'fluent-player')
		: __('Update Preset', 'fluent-player');

	const emailPlaceholderRef = useRef(null);
	const emailHeadlineRef = useRef(null);
	const emailButtonTextRef = useRef(null);
	const emailBottomTextRef = useRef(null);
	const emailConfirmationMessageRef = useRef(null);
	const actionBarTextRef = useRef(null);
	const actionBarButtonTextRef = useRef(null);
	const actionBarButtonLinkRef = useRef(null);
	const isAmbientPresetMode = useMemo(
		() => isAmbientPresetSettings(presetData.settings || {}),
		[
			presetData.settings?.skin,
			presetData.settings?.behaviors?.muted_autoplay,
			presetData.settings?.behaviors?.on_video_end,
			presetData.settings?.behaviors?.hide_top_controls,
			presetData.settings?.behaviors?.hide_center_controls,
			presetData.settings?.behaviors?.hide_bottom_controls,
		]
	);
	const initialPresetPanelId = useMemo(() => {
		const visiblePanelIds = [
			presetData.settings?.skin !== 'minimal' ? PRESET_PANEL_IDS.CONTROLS : null,
			PRESET_PANEL_IDS.BEHAVIORS,
			!isAmbientPresetMode ? PRESET_PANEL_IDS.CONTEXT_MENU : null,
			PRESET_PANEL_IDS.SUBTITLES,
			PRESET_PANEL_IDS.EMAIL_CAPTURE,
			PRESET_PANEL_IDS.CTA,
			PRESET_PANEL_IDS.ACTION_BAR,
		].filter(Boolean);

		return visiblePanelIds[0] || null;
	}, [isAmbientPresetMode, presetData.settings?.skin]);
	const { openId: openPanelId, toggle: togglePanel } = useAccordionState(
		initialPresetPanelId,
		presetData.settings?.skin || 'modern'
	);

	const updateSettings = (section, key, value) => {
		setPresetData(prev => ({
			...prev,
			settings: {
				...prev.settings,
				[section]: {
					...prev.settings[section],
					[key]: value
				}
			}
		}));
		setHasChanges(true);
	};

	const updateNestedSettings = (section, subsection, key, value) => {
		setPresetData(prev => ({
			...prev,
			settings: {
				...prev.settings,
				[section]: {
					...prev.settings[section],
					[subsection]: {
						...prev.settings[section]?.[subsection],
						[key]: value
					}
				}
			}
		}));
		setHasChanges(true);
	};

	const validateForm = () => {
		if (!presetData.name || presetData.name.trim() === '') {
			showNotification({
				type: 'error',
				message: __('Preset name is required', 'fluent-player')
			});
			return false;
		}
		if (presetData.settings?.action_bar?.enabled
			&& presetData.settings?.action_bar?.button_type === 'custom'
			&& !presetData.settings?.action_bar?.button_text?.trim()
		) {
			showNotification({
				type: 'error',
				message: __('Button Text is required for Action Bar', 'fluent-player')
			});
			return false;
		}
		return true;
	};

	const handleSave = () => {
		if (!validateForm()) {
			return;
		}

		onSave();

		if (wp.data && wp.data.dispatch('core/editor')) {
			wp.data.dispatch('core/editor').unlockPostSaving('fluent-player');
			wp.data.dispatch('core/editor').editPost({edited: true});
		}

		setHasChanges(false);
	};

	const fetchYoutubeSubscriberCount = async (channelId) => {
		const normalizedChannelId = String(channelId || '').trim();
		if (!YOUTUBE_CHANNEL_ID_PATTERN.test(normalizedChannelId)) {
			updateSettings('action_bar', 'subscriber_count', '');
			return;
		}

		try {
			const response = await apiFetch({
				path: `${requestPath}/youtube/channel-info?channel_id=${encodeURIComponent(normalizedChannelId)}`
			});

			if (response && response.success && response.subscriber_count) {
				updateSettings('action_bar', 'subscriber_count', response.subscriber_count);
			}
		} catch (error) {
			showNotification({
				type: 'error',
				message: __('Failed to fetch YouTube subscriber count', 'fluent-player')
			});
		}

		return '';
	};

	useEffect(() => {
		const channelId = presetData.settings?.action_bar?.youtube_channel;
		const showCount = presetData.settings?.action_bar?.button_count;

		if (!channelId || !showCount) {
			return;
		}

		const timer = setTimeout(() => {
			fetchYoutubeSubscriberCount(channelId);
		}, 700);

		return () => clearTimeout(timer);
	}, [presetData.settings?.action_bar?.youtube_channel, presetData.settings?.action_bar?.button_count]);

	const getEmailProvidersSummary = () => summarizeProviderNames(
		presetData.settings?.email_capture?.providers || []
	);

	const getEmailCaptureSummary = () => {
		const emailCapture = presetData.settings?.email_capture || {};
		if (!emailCapture.enabled) {
			return __('Disabled', 'fluent-player');
		}

		return sprintf(
			/* translators: 1: display percentage, 2: enabled provider summary */
			__('At %1$s%% • %2$s', 'fluent-player'),
			emailCapture.percentage || 0,
			getEmailProvidersSummary()
		);
	};

	const getEmailCaptureDisplaySummary = () => formatAtPercentSummary(
		presetData.settings?.email_capture?.percentage || 0
	);

	const getEmailCaptureContentSummary = () => summarizeEmailContent({
		headline: presetData.settings?.email_capture?.headline,
		placeholder: presetData.settings?.email_capture?.placeholder,
		buttonText: presetData.settings?.email_capture?.button_text,
		bottomText: presetData.settings?.email_capture?.bottom_text,
	});

	const getEmailCaptureControlsSummary = () => (
		presetData.settings?.email_capture?.allow_skip !== false
			? __('Skip enabled', 'fluent-player')
			: __('Skip disabled', 'fluent-player')
	);

	const getEmailCaptureAppearanceSummary = () => summarizeAppearanceParts([
		presetData.settings?.email_capture?.button_bg_color || presetData.settings?.email_capture?.button_color
			? __('Button colors', 'fluent-player')
			: '',
		presetData.settings?.email_capture?.border_radius !== undefined ? __('Radius', 'fluent-player') : '',
	]);

	const getCtaSummary = () => {
		const cta = presetData.settings?.cta || {};
		if (!cta.enabled) {
			return __('Disabled', 'fluent-player');
		}

		return appendSummaryDetail(
			formatAtPercentSummary(cta.percentage || 0),
			getCtaDismissSummary(cta.completion_type || 'link_click', cta.auto_dismiss_duration || 5)
		);
	};

	const getCtaDisplaySummary = () => appendSummaryDetail(
		formatAtPercentSummary(presetData.settings?.cta?.percentage || 80),
		getCtaDismissSummary(
			presetData.settings?.cta?.completion_type || 'link_click',
			presetData.settings?.cta?.auto_dismiss_duration || 5
		)
	);

	const getCtaContentSummary = () => summarizeRichTextContent(presetData.settings?.cta?.content || '');

	const getPresetCtaControlsSummary = () => {
		if ((presetData.settings?.cta?.completion_type || 'link_click') === 'skip_only') {
			return __('Dismiss on skip', 'fluent-player');
		}

		return presetData.settings?.cta?.allow_skip !== false
			? __('Skip enabled', 'fluent-player')
			: __('Skip disabled', 'fluent-player');
	};

	const getPresetCtaAppearanceSummary = () => {
		return summarizeAppearanceParts([
			presetData.settings?.cta?.bg_color ? __('Background', 'fluent-player') : '',
			presetData.settings?.cta?.text_color ? __('Text', 'fluent-player') : '',
		]);
	};

	const getActionBarSummary = () => {
		const actionBar = presetData.settings?.action_bar || {};
		if (!actionBar.enabled) {
			return __('Disabled', 'fluent-player');
		}

		const positionLabels = {
			top: __('Top', 'fluent-player'),
			bottom: __('Bottom', 'fluent-player')
		};

		return `${sprintf(
			/* translators: %d: display percentage */
			__('At %d%%', 'fluent-player'),
			actionBar.percentage_start || 0
		)} • ${positionLabels[actionBar.position || 'bottom']}`;
	};

	const getActionBarDisplaySummary = () => {
		const positionLabels = {
			top: __('Top', 'fluent-player'),
			bottom: __('Bottom', 'fluent-player')
		};

		return appendSummaryDetail(
			formatAtPercentSummary(presetData.settings?.action_bar?.percentage_start || 0),
			positionLabels[presetData.settings?.action_bar?.position || 'bottom']
		);
	};

	const getActionBarContentSummary = () => summarizeActionBarContent({
		text: presetData.settings?.action_bar?.text,
		textSize: presetData.settings?.action_bar?.text ? presetData.settings?.action_bar?.text_size : 0,
	});

	const getActionBarControlsSummary = () => summarizeActionBarControls({
		showClose: presetData.settings?.action_bar?.show_close || false,
		buttonType: presetData.settings?.action_bar?.button_type || 'custom',
	});

	const getActionBarButtonSetupSummary = () => summarizeButtonSetup({
		buttonText: presetData.settings?.action_bar?.button_text,
		buttonLink: presetData.settings?.action_bar?.button_link,
		openInNewTab: presetData.settings?.action_bar?.open_in_new_tab !== false,
	});

	const getActionBarYoutubeSetupSummary = () => summarizeYoutubeSetup({
		youtubeChannel: presetData.settings?.action_bar?.youtube_channel,
		buttonCount: presetData.settings?.action_bar?.button_count || false,
	});

	const getActionBarAppearanceSummary = () => summarizeAppearanceParts([
		presetData.settings?.action_bar?.background_color || presetData.settings?.action_bar?.text_color
			? __('Overlay colors', 'fluent-player')
			: '',
		(presetData.settings?.action_bar?.show_close && (presetData.settings?.action_bar?.close_button_color || presetData.settings?.action_bar?.close_button_text_color))
			? __('Close button', 'fluent-player')
			: '',
		(presetData.settings?.action_bar?.button_type === 'custom' && presetData.settings?.action_bar?.button_text && (presetData.settings?.action_bar?.button_color || presetData.settings?.action_bar?.button_text_color))
			? __('Button colors', 'fluent-player')
			: '',
		(presetData.settings?.action_bar?.button_type === 'custom' && presetData.settings?.action_bar?.button_text)
			? __('Radius', 'fluent-player')
			: '',
	]);

	const contextMenuSettings = getDefaultContextMenuSettings(presetData.settings || {});
	const enabledContextMenuItems = Object.values(contextMenuSettings.items || {}).filter(Boolean).length;
	const contextMenuSummary = !contextMenuSettings.enabled
		? __('Disabled', 'fluent-player')
		: sprintf(
			/* translators: %d: number of enabled context menu items */
			__('%d items enabled', 'fluent-player'),
			enabledContextMenuItems
		);

	return (
		<div className="fluent-player-block-content" style={{'--media-brand': mediaSettings?.brandingColor || '#DD1F13'}}>
						<div className="fluent-player-form-layout">
							<div className="fluent-player-preview-section">
								<div className="fluent-player-preview-player">
									<FluentPlayer isPresetPreview={true} mediaData={mediaSettings} presetData={presetData}/>
								</div>
							</div>

							<div className="fluent-player-settings-section">
								<div className="fluent-player-form-row">
									<TextControl
										label={__('Preset Name', 'fluent-player') + ' *'}
										value={presetData.name}
										placeholder={isNewPreset ? __('Enter preset name', 'fluent-player') : ''}
										onChange={(value) => setPresetData({...presetData, name: value})}
									/>
								</div>

								<div className="fluent-player-form-row">
									<SelectControl
										label={__('Skin', 'fluent-player')}
										value={presetData.settings?.skin || 'modern'}
										options={[
											{label: __('Modern', 'fluent-player'), value: 'modern'},
											{label: __('Classic', 'fluent-player'), value: 'classic'},
											{label: __('Simple', 'fluent-player'), value: 'simple'},
											{label: __('Floating', 'fluent-player'), value: 'floating'},
											{label: __('Minimal', 'fluent-player'), value: 'minimal'}
										]}
										onChange={(value) => setPresetData({
											...presetData,
											settings: {...presetData.settings, skin: value}
										})}
									/>
								</div>

								{presetData.settings?.skin !== 'minimal' && (
								<CollapsiblePanel
									title={__('Controls', 'fluent-player')}
									isOpen={openPanelId === PRESET_PANEL_IDS.CONTROLS}
									onToggle={() => togglePanel(PRESET_PANEL_IDS.CONTROLS)}
								>
										{presetData.settings?.skin !== 'simple' && (
											<CustomToggle
												label={__('Progress Bar', 'fluent-player')}
												checked={presetData.settings?.controls?.progress_bar}
												onChange={(value) => updateSettings('controls', 'progress_bar', value)}
												switchPosition="left"
												justify="start"
											/>
										)}
										<CustomToggle
											label={__('Play/Pause', 'fluent-player')}
											checked={presetData.settings?.controls?.play}
											onChange={(value) => updateSettings('controls', 'play', value)}
											switchPosition="left"
											justify="start"
										/>
										{presetData.settings?.skin !== 'simple' && (
											<>
												<CustomToggle
													label={__('Forward', 'fluent-player')}
													checked={presetData.settings?.controls?.forward}
													onChange={(value) => updateSettings('controls', 'forward', value)}
													switchPosition="left"
													justify="start"
												/>
												<CustomToggle
													label={__('Backward', 'fluent-player')}
													checked={presetData.settings?.controls?.backward}
													onChange={(value) => updateSettings('controls', 'backward', value)}
													switchPosition="left"
													justify="start"
												/>
											</>
										)}
										<CustomToggle
											label={__('Volume', 'fluent-player')}
											checked={presetData.settings?.controls?.volume}
											onChange={(value) => updateSettings('controls', 'volume', value)}
											switchPosition="left"
											justify="start"
										/>
										{presetData.settings?.skin !== 'simple' && (
											<>
												<CustomToggle
													label={__('Current Time', 'fluent-player')}
													checked={presetData.settings?.controls?.current_time}
													onChange={(value) => updateSettings('controls', 'current_time', value)}
													switchPosition="left"
													justify="start"
												/>
												<CustomToggle
													label={__('Playback Speed', 'fluent-player')}
													checked={presetData.settings?.controls?.playback_speed}
													onChange={(value) => updateSettings('controls', 'playback_speed', value)}
													switchPosition="left"
													justify="start"
												/>
												<CustomToggle
													label={__('Settings Menu', 'fluent-player')}
													checked={presetData.settings?.controls?.settings}
													onChange={(value) => updateSettings('controls', 'settings', value)}
													switchPosition="left"
													justify="start"
												/>
											</>
										)}
										<CustomToggle
											label={__('Fullscreen', 'fluent-player')}
											checked={presetData.settings?.controls?.fullscreen}
											onChange={(value) => updateSettings('controls', 'fullscreen', value)}
											switchPosition="left"
											justify="start"
										/>
										<CustomToggle
											label={__('Picture in Picture', 'fluent-player')}
											help={__('Except YouTube/Vimeo — browsers can’t pop out their embeds.', 'fluent-player')}
											checked={presetData.settings?.controls?.pip}
											onChange={(value) => updateSettings('controls', 'pip', value)}
											switchPosition="left"
											justify="start"
										/>
										<CustomToggle
											label={__('Captions Toggle', 'fluent-player')}
											checked={presetData.settings?.controls?.captions_toggle}
											onChange={(value) => updateSettings('controls', 'captions_toggle', value)}
											switchPosition="left"
											justify="start"
										/>
									</CollapsiblePanel>
								)}

								<CollapsiblePanel
									title={__('Behaviors', 'fluent-player')}
									isOpen={openPanelId === PRESET_PANEL_IDS.BEHAVIORS}
									onToggle={() => togglePanel(PRESET_PANEL_IDS.BEHAVIORS)}
								>
									<CustomToggle
										label={__('Autoplay', 'fluent-player')}
										checked={presetData.settings?.behaviors?.autoplay}
										onChange={(value) => updateSettings('behaviors', 'autoplay', value)}
										switchPosition="left"
										justify="start"
									/>
									{presetData.settings?.skin !== 'minimal' && (
										<CustomToggle
											label={__('Muted Autoplay', 'fluent-player')}
											checked={presetData.settings?.behaviors?.muted_autoplay}
											onChange={(value) => updateSettings('behaviors', 'muted_autoplay', value)}
											switchPosition="left"
											justify="start"
										/>
									)}
									<CustomToggle
										label={__('Save Play Position', 'fluent-player')}
										checked={presetData.settings?.behaviors?.save_play_position}
										onChange={(value) => updateSettings('behaviors', 'save_play_position', value)}
										switchPosition="left"
										justify="start"
									/>
									{presetData.settings?.skin !== 'minimal' && (
										<>
											<CustomToggle
												label={__('Plays Inline', 'fluent-player')}
												checked={presetData.settings?.behaviors?.plays_inline}
												onChange={(value) => updateSettings('behaviors', 'plays_inline', value)}
												switchPosition="left"
												justify="start"
											/>
											<CustomToggle
												label={__('Hide Top Controls', 'fluent-player')}
												checked={presetData.settings?.behaviors?.hide_top_controls}
												onChange={(value) => updateSettings('behaviors', 'hide_top_controls', value)}
												switchPosition="left"
												justify="start"
											/>
											<CustomToggle
												label={__('Hide Center Controls', 'fluent-player')}
												checked={presetData.settings?.behaviors?.hide_center_controls}
												onChange={(value) => updateSettings('behaviors', 'hide_center_controls', value)}
												switchPosition="left"
												justify="start"
											/>
											<CustomToggle
												label={__('Hide Bottom Controls', 'fluent-player')}
												checked={presetData.settings?.behaviors?.hide_bottom_controls}
												onChange={(value) => updateSettings('behaviors', 'hide_bottom_controls', value)}
												switchPosition="left"
												justify="start"
											/>
										</>
									)}
								</CollapsiblePanel>

								{!isAmbientPresetMode && (
									<CollapsiblePanel
										title={__('Context Menu', 'fluent-player')}
										summary={contextMenuSummary}
										isOpen={openPanelId === PRESET_PANEL_IDS.CONTEXT_MENU}
										onToggle={() => togglePanel(PRESET_PANEL_IDS.CONTEXT_MENU)}
									>
										<CustomToggle
											label={__('Enable Context Menu', 'fluent-player')}
											checked={contextMenuSettings.enabled}
											onChange={(value) => updateSettings('context_menu', 'enabled', value)}
											switchPosition="left"
											justify="start"
										/>
										{contextMenuSettings.enabled && (
											<>
												<CustomToggle
													label={__('Copy Link', 'fluent-player')}
													checked={contextMenuSettings.items.copy_link}
													onChange={(value) => updateNestedSettings('context_menu', 'items', 'copy_link', value)}
													switchPosition="left"
													justify="start"
												/>
												<CustomToggle
													label={__('Copy Link at Current Time', 'fluent-player')}
													checked={contextMenuSettings.items.copy_link_at_time}
													onChange={(value) => updateNestedSettings('context_menu', 'items', 'copy_link_at_time', value)}
													switchPosition="left"
													justify="start"
												/>
												<CustomToggle
													label={__('Loop', 'fluent-player')}
													checked={contextMenuSettings.items.loop}
													onChange={(value) => updateNestedSettings('context_menu', 'items', 'loop', value)}
													switchPosition="left"
													justify="start"
												/>
												<CustomToggle
													label={__('Playback Speed', 'fluent-player')}
													checked={contextMenuSettings.items.playback_speed}
													onChange={(value) => updateNestedSettings('context_menu', 'items', 'playback_speed', value)}
													switchPosition="left"
													justify="start"
												/>
												<CustomToggle
													label={__('Captions', 'fluent-player')}
													checked={contextMenuSettings.items.captions}
													onChange={(value) => updateNestedSettings('context_menu', 'items', 'captions', value)}
													switchPosition="left"
													justify="start"
												/>
												<CustomToggle
													label={__('Picture in Picture', 'fluent-player')}
													checked={contextMenuSettings.items.pip}
													onChange={(value) => updateNestedSettings('context_menu', 'items', 'pip', value)}
													switchPosition="left"
													justify="start"
												/>
											</>
										)}
									</CollapsiblePanel>
								)}

								<CollapsiblePanel
									title={__('Subtitles', 'fluent-player')}
									isOpen={openPanelId === PRESET_PANEL_IDS.SUBTITLES}
									onToggle={() => togglePanel(PRESET_PANEL_IDS.SUBTITLES)}
								>
									<CustomToggle
										label={__('Customize Caption Style', 'fluent-player')}
										help={__('Override caption text color, background and font size', 'fluent-player')}
										checked={presetData.settings?.styles?.captions?.enabled !== false}
										onChange={(value) => updateNestedSettings('styles', 'captions', 'enabled', value)}
										switchPosition="left"
										justify="start"
									/>
									{presetData.settings?.styles?.captions?.enabled !== false && (
										<>
											<CustomRangeSlider
												label={__('Caption Font Size (PX)', 'fluent-player')}
												value={presetData.settings?.styles?.captions?.font_size || 16}
												min={12}
												max={120}
												step={1}
												onChange={(value) => updateNestedSettings('styles', 'captions', 'font_size', value)}
											/>
											<div className="fp-color-section">
													<label className="fp-color-section-label components-base-control__label">
														{__('Caption Color', 'fluent-player')}
													</label>
													<div className="fp-color-trigger-list fp-color-trigger-list--side-by-side">
														<ColorPickerInput
															asTrigger
															label={__('Background Color', 'fluent-player')}
															value={presetData.settings?.styles?.captions?.background || ''}
															defaultValue=""
															onChange={(value) => updateNestedSettings('styles', 'captions', 'background', value)}
														/>
														<ColorPickerInput
															asTrigger
															label={__('Text Color', 'fluent-player')}
															value={presetData.settings?.styles?.captions?.color || ''}
															defaultValue=""
															onChange={(value) => updateNestedSettings('styles', 'captions', 'color', value)}
														/>
													</div>
												</div>
										</>
									)}
								</CollapsiblePanel>

								<CollapsiblePanel
									title={__('Email Capture', 'fluent-player')}
									summary={getEmailCaptureSummary()}
									isOpen={openPanelId === PRESET_PANEL_IDS.EMAIL_CAPTURE}
									onToggle={() => togglePanel(PRESET_PANEL_IDS.EMAIL_CAPTURE)}
								>
										<CustomToggle
											label={__('Enable Email Capture', 'fluent-player')}
											help={__('Show an email collection form over your player', 'fluent-player')}
											checked={presetData.settings?.email_capture?.enabled || false}
											onChange={(value) => updateSettings('email_capture', 'enabled', value)}
											switchPosition="left"
											justify="start"
										/>
										{presetData.settings?.email_capture?.enabled && (
											<>
												<SettingsSectionCard
													title={__('Display', 'fluent-player')}
													summary={getEmailCaptureDisplaySummary()}
													defaultOpen={isNewPreset}
												>
													<CustomRangeSlider
														label={__('Display At (%)', 'fluent-player')}
														value={presetData.settings?.email_capture?.percentage || 0}
														min={0}
														max={100}
														step={1}
														onChange={(value) => updateSettings('email_capture', 'percentage', value)}
													/>
												</SettingsSectionCard>

												<SettingsSectionCard
													title={__('Content', 'fluent-player')}
													summary={getEmailCaptureContentSummary()}
													defaultOpen={true}
												>
													<BaseControl label={__('Email Placeholder', 'fluent-player')}>
														<div className="fp-input-with-suffix">
															<input
																ref={emailPlaceholderRef}
																type="text"
																className="fp-input-with-suffix__input"
																value={presetData.settings?.email_capture?.placeholder || 'Email Address'}
																onChange={(e) => updateSettings('email_capture', 'placeholder', e.target.value)}
															/>
															<ShortcodeInserter
																inputRef={emailPlaceholderRef}
																onInsert={(value) => updateSettings('email_capture', 'placeholder', value)}
															/>
														</div>
													</BaseControl>

													<BaseControl
														label={
															<div className="fp-label-with-inserter">
																<div className="fp-label-with-inserter-content">
																	<span>{__('Headline', 'fluent-player') + ' *'}</span>
																	<InfoIcon
																		label={__('Show help for headline', 'fluent-player')}
																		tooltip={__('Form headline text', 'fluent-player')}
																	/>
																</div>
																<ShortcodeInserter
																	inputRef={emailHeadlineRef}
																	onInsert={(value) => updateSettings('email_capture', 'headline', value)}
																/>
															</div>
														}
													>
														<textarea
															ref={emailHeadlineRef}
															className="components-textarea-control__input"
															value={presetData.settings?.email_capture?.headline || 'Sign up to continue watching'}
															onChange={(e) => updateSettings('email_capture', 'headline', e.target.value)}
															placeholder={__('Enter headline...', 'fluent-player')}
															rows={3}
														/>
													</BaseControl>

													<BaseControl label={__('Button Text', 'fluent-player') + ' *'}>
														<div className="fp-input-with-suffix">
															<input
																ref={emailButtonTextRef}
																type="text"
																className="fp-input-with-suffix__input"
																value={presetData.settings?.email_capture?.button_text || 'Subscribe'}
																onChange={(e) => updateSettings('email_capture', 'button_text', e.target.value)}
															/>
															<ShortcodeInserter
																inputRef={emailButtonTextRef}
																onInsert={(value) => updateSettings('email_capture', 'button_text', value)}
															/>
														</div>
													</BaseControl>

													<BaseControl label={__('Bottom Text', 'fluent-player')}>
														<div className="fp-input-with-suffix">
															<input
																ref={emailBottomTextRef}
																type="text"
																className="fp-input-with-suffix__input"
																value={presetData.settings?.email_capture?.bottom_text || 'We respect your privacy. Unsubscribe at any time.'}
																onChange={(e) => updateSettings('email_capture', 'bottom_text', e.target.value)}
															/>
															<ShortcodeInserter
																inputRef={emailBottomTextRef}
																onInsert={(value) => updateSettings('email_capture', 'bottom_text', value)}
															/>
														</div>
													</BaseControl>

													<BaseControl
														label={
															<div className="fp-label-with-inserter">
																<div className="fp-label-with-inserter-content">
																	<span>{__('Confirmation Message', 'fluent-player')}</span>
																	<InfoIcon
																		label={__('Show help for confirmation message', 'fluent-player')}
																		tooltip={__("Shown after a successful submit. Leave empty to hide the form immediately with no message.", 'fluent-player')}
																	/>
																</div>
																<ShortcodeInserter
																	inputRef={emailConfirmationMessageRef}
																	onInsert={(value) => updateSettings('email_capture', 'confirmation_message', value)}
																/>
															</div>
														}
													>
														<textarea
															ref={emailConfirmationMessageRef}
															className="components-textarea-control__input"
															value={presetData.settings?.email_capture?.confirmation_message || ''}
															onChange={(e) => updateSettings('email_capture', 'confirmation_message', e.target.value)}
															placeholder={__('e.g. Thanks! Please check your inbox to confirm.', 'fluent-player')}
															rows={3}
														/>
													</BaseControl>

													<BaseControl
														label={
															<div className="fp-label-with-inserter-content">
																<span>{__('Auto-dismiss After (seconds)', 'fluent-player')}</span>
																<InfoIcon
																	label={__('Show help for auto-dismiss', 'fluent-player')}
																	tooltip={__('Set to 0 to keep the message until the viewer dismisses it.', 'fluent-player')}
																/>
															</div>
														}
													>
														<input
															type="number"
															min={0}
															max={60}
															className="components-text-control__input"
															value={presetData.settings?.email_capture?.confirmation_countdown ?? 10}
															onChange={(e) => updateSettings('email_capture', 'confirmation_countdown', e.target.value === '' ? '' : Math.min(60, Math.max(0, parseInt(e.target.value, 10) || 0)))}
														/>
													</BaseControl>

													<BaseControl label={__('Dismiss Button Text', 'fluent-player')}>
														<input
															type="text"
															className="components-text-control__input"
															value={presetData.settings?.email_capture?.confirmation_dismiss_text || ''}
															onChange={(e) => updateSettings('email_capture', 'confirmation_dismiss_text', e.target.value)}
															placeholder={__('Continue', 'fluent-player')}
														/>
													</BaseControl>
												</SettingsSectionCard>

												<SettingsSectionCard
													title={__('Email Providers', 'fluent-player')}
													help={__('Connect email services to collect viewer emails on form submit.', 'fluent-player')}
													summary={getEmailProvidersSummary()}
													defaultOpen={false}
												>
													<EmailProviderSettings
														settings={presetData.settings}
														updateSettings={updateSettings}
														requestPath={requestPath}
													/>
												</SettingsSectionCard>

												<SettingsSectionCard
													title={__('Controls', 'fluent-player')}
													summary={getEmailCaptureControlsSummary()}
													defaultOpen={false}
												>
													<CustomToggle
														label={__('Allow Skipping', 'fluent-player')}
														help={__('Let viewers skip the email form', 'fluent-player')}
														checked={presetData.settings?.email_capture?.allow_skip !== false}
														onChange={(value) => updateSettings('email_capture', 'allow_skip', value)}
														switchPosition="left"
														justify="start"
													/>
													{window.fluentPlayerBlockVars?.has_fluentcrm && (
														<CustomToggle
															label={__('Skip for Subscribed CRM Contacts', 'fluent-player')}
															help={__('When enabled, logged-in users who are already subscribed FluentCRM contacts will not see this email capture.', 'fluent-player')}
															checked={presetData.settings?.email_capture?.skip_if_crm_contact !== false}
															onChange={(value) => updateSettings('email_capture', 'skip_if_crm_contact', value)}
															switchPosition="left"
															justify="start"
														/>
													)}
												</SettingsSectionCard>

												<SettingsSectionCard
													title={__('Appearance', 'fluent-player')}
													summary={getEmailCaptureAppearanceSummary()}
													defaultOpen={false}
												>
													<div className="fp-color-section">
														<label className="fp-color-section-label components-base-control__label">
															{__('Button Color', 'fluent-player')}
														</label>
														<div className="fp-color-trigger-list fp-color-trigger-list--side-by-side">
															<ColorPickerInput
																asTrigger
																label={__('Background', 'fluent-player')}
																value={presetData.settings?.email_capture?.button_bg_color ?? ''}
																defaultValue="#4e9cf6"
																onChange={(value) => updateSettings('email_capture', 'button_bg_color', value)}
															/>
															<ColorPickerInput
																asTrigger
																label={__('Text', 'fluent-player')}
																value={presetData.settings?.email_capture?.button_color ?? ''}
																defaultValue="#ffffff"
																onChange={(value) => updateSettings('email_capture', 'button_color', value)}
															/>
														</div>
													</div>
													<CustomRangeSlider
														label={__('Border Radius (PX)', 'fluent-player')}
														value={presetData.settings?.email_capture?.border_radius || 4}
														min={0}
														max={20}
														step={1}
														onChange={(value) => updateSettings('email_capture', 'border_radius', value)}
													/>
												</SettingsSectionCard>

												<ConditionSettings
													value={presetData.settings?.email_capture?.conditionals}
													onChange={(nextValue) => updateSettings('email_capture', 'conditionals', nextValue)}
													fieldKeys={['viewer.is_logged_in', 'viewer.is_crm_contact', 'viewer.crm_tag', 'viewer.crm_list', 'viewer.email_submitted', 'page.query']}
												/>
											</>
										)}
									</CollapsiblePanel>

								<CollapsiblePanel
									title={__('Call To Action', 'fluent-player')}
									summary={getCtaSummary()}
									isOpen={openPanelId === PRESET_PANEL_IDS.CTA}
									onToggle={() => togglePanel(PRESET_PANEL_IDS.CTA)}
									unmountOnClose
								>
										<CustomToggle
											label={__('Enable Call To Action', 'fluent-player')}
											help={__('Show a call to action overlay over your player', 'fluent-player')}
											checked={presetData.settings?.cta?.enabled || false}
											onChange={(value) => {
												if (value && !presetData.settings?.cta?.content) {
													setPresetData(prev => ({
														...prev,
														settings: {
															...prev.settings,
															cta: {
																...prev.settings?.cta,
																enabled: true,
																content: '<h2 style="text-align: center;">Ready to take the next step?</h2>\n<p style="text-align: center;">Click the button below to learn more.</p>\n<p style="text-align: center;"><a style="background-color: #4e9cf6; color: #ffffff; display: inline-block; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 500;" href="#">Learn More</a></p>',
																bg_color: prev.settings?.cta?.bg_color || '#0E121B',
																text_color: prev.settings?.cta?.text_color || '#ffffff',
															}
														}
													}));
													setHasChanges(true);
												} else {
													updateSettings('cta', 'enabled', value);
												}
											}}
											switchPosition="left"
											justify="start"
										/>
										{presetData.settings?.cta?.enabled && (
											<>
												<SettingsSectionCard
													title={__('Display', 'fluent-player')}
													summary={getCtaDisplaySummary()}
													defaultOpen={isNewPreset}
												>
													<CustomRangeSlider
														label={__('Display At (%)', 'fluent-player')}
														value={presetData.settings?.cta?.percentage || 80}
														min={0}
														max={100}
														step={1}
														onChange={(value) => updateSettings('cta', 'percentage', value)}
													/>
													<SelectControl
														label={__('Completion Type', 'fluent-player')}
														value={presetData.settings?.cta?.completion_type || 'link_click'}
														options={[
															{ label: __('Link Click', 'fluent-player'), value: 'link_click' },
															{ label: __('Auto Dismiss', 'fluent-player'), value: 'auto_dismiss' },
															{ label: __('Skip Only', 'fluent-player'), value: 'skip_only' }
														]}
														onChange={(value) => updateSettings('cta', 'completion_type', value)}
														help={
															presetData.settings?.cta?.completion_type === 'auto_dismiss'
																? __('CTA auto-dismisses after a set duration', 'fluent-player')
																: presetData.settings?.cta?.completion_type === 'skip_only'
																? __('CTA only completes via the skip button', 'fluent-player')
																: __('CTA completes when a link or button is clicked', 'fluent-player')
														}
													/>
													{presetData.settings?.cta?.completion_type === 'auto_dismiss' && (
														<CustomRangeSlider
															label={__('Auto Dismiss After (Seconds)', 'fluent-player')}
															value={presetData.settings?.cta?.auto_dismiss_duration || 5}
															min={1}
															max={60}
															step={1}
															onChange={(value) => updateSettings('cta', 'auto_dismiss_duration', value)}
														/>
													)}
												</SettingsSectionCard>

												<SettingsSectionCard
													title={__('Content', 'fluent-player')}
													summary={getCtaContentSummary()}
													defaultOpen={true}
												>
													<div className="fluent-player-form-row">
														<WPEditor
															value={presetData.settings?.cta?.content || ''}
															onChange={(value) => updateSettings('cta', 'content', value)}
															height={200}
														/>
													</div>
												</SettingsSectionCard>

												{presetData.settings?.cta?.completion_type !== 'skip_only' && (
													<SettingsSectionCard
														title={__('Controls', 'fluent-player')}
														summary={getPresetCtaControlsSummary()}
														defaultOpen={false}
													>
														<CustomToggle
															label={__('Allow Skipping', 'fluent-player')}
															checked={presetData.settings?.cta?.allow_skip !== false}
															onChange={(value) => updateSettings('cta', 'allow_skip', value)}
															switchPosition="left"
															justify="start"
														/>
													</SettingsSectionCard>
												)}

												<SettingsSectionCard
													title={__('Appearance', 'fluent-player')}
													summary={getPresetCtaAppearanceSummary()}
													defaultOpen={false}
												>
													<div className="fp-color-section">
														<label className="fp-color-section-label components-base-control__label">
															{__('Layer Color', 'fluent-player')}
														</label>
														<div className="fp-color-trigger-list fp-color-trigger-list--side-by-side">
															<ColorPickerInput
																asTrigger
																label={__('Background', 'fluent-player')}
																value={presetData.settings?.cta?.bg_color || '#0E121B'}
																defaultValue="#0E121B"
																onChange={(value) => updateSettings('cta', 'bg_color', value)}
															/>
															<ColorPickerInput
																asTrigger
																label={__('Text', 'fluent-player')}
																value={presetData.settings?.cta?.text_color || '#ffffff'}
																defaultValue="#ffffff"
																onChange={(value) => updateSettings('cta', 'text_color', value)}
															/>
														</div>
													</div>
												</SettingsSectionCard>

												<ConditionSettings
													value={presetData.settings?.cta?.conditionals}
													onChange={(nextValue) => updateSettings('cta', 'conditionals', nextValue)}
													fieldKeys={['viewer.is_logged_in', 'viewer.is_crm_contact', 'viewer.crm_tag', 'viewer.crm_list', 'viewer.email_submitted', 'page.query']}
												/>
											</>
										)}
									</CollapsiblePanel>

								<CollapsiblePanel
									title={__('Action Bar', 'fluent-player')}
									summary={getActionBarSummary()}
									isOpen={openPanelId === PRESET_PANEL_IDS.ACTION_BAR}
									onToggle={() => togglePanel(PRESET_PANEL_IDS.ACTION_BAR)}
								>
										<CustomToggle
											label={__('Enable Action Bar', 'fluent-player')}
											help={__('Show an action bar over your player', 'fluent-player')}
											checked={presetData.settings?.action_bar?.enabled || false}
											onChange={(value) => updateSettings('action_bar', 'enabled', value)}
											switchPosition="left"
											justify="start"
										/>
										{presetData.settings?.action_bar?.enabled && (
											<>
												<SettingsSectionCard title={__('Display', 'fluent-player')} defaultOpen={isNewPreset}>
													<SelectControl
														label={__('Position', 'fluent-player')}
														value={presetData.settings?.action_bar?.position || 'bottom'}
														options={[
															{label: __('Bottom', 'fluent-player'), value: 'bottom'},
															{label: __('Top', 'fluent-player'), value: 'top'}
														]}
														onChange={(value) => updateSettings('action_bar', 'position', value)}
													/>
													<CustomRangeSlider
														label={__('Display At (%)', 'fluent-player')}
														value={presetData.settings?.action_bar?.percentage_start || 0}
														min={0}
														max={100}
														step={1}
														onChange={(value) => updateSettings('action_bar', 'percentage_start', value)}
													/>
												</SettingsSectionCard>

												<SettingsSectionCard
													title={__('Content', 'fluent-player')}
													summary={getActionBarContentSummary()}
													defaultOpen={true}
												>
													<BaseControl label={__('Text', 'fluent-player')}>
														<div className="fp-input-with-suffix">
															<input
																ref={actionBarTextRef}
																type="text"
																className="fp-input-with-suffix__input"
																value={presetData.settings?.action_bar?.text || ''}
																onChange={(e) => updateSettings('action_bar', 'text', e.target.value)}
															/>
															<ShortcodeInserter
																inputRef={actionBarTextRef}
																onInsert={(value) => updateSettings('action_bar', 'text', value)}
															/>
														</div>
													</BaseControl>
													{presetData.settings?.action_bar?.text && (
														<CustomRangeSlider
															label={__('Font Size (PX)', 'fluent-player')}
															value={presetData.settings?.action_bar?.text_size || 20}
															min={12}
															max={48}
															step={1}
															onChange={(value) => updateSettings('action_bar', 'text_size', value)}
														/>
													)}
												</SettingsSectionCard>

												<SettingsSectionCard
													title={__('Controls', 'fluent-player')}
													summary={getActionBarControlsSummary()}
													defaultOpen={false}
												>
													<CustomToggle
														label={__('Show Close Button', 'fluent-player')}
														checked={presetData.settings?.action_bar?.show_close || false}
														onChange={(value) => updateSettings('action_bar', 'show_close', value)}
														switchPosition="left"
														justify="start"
													/>
													<SelectControl
														label={__('Button Type', 'fluent-player')}
														value={presetData.settings?.action_bar?.button_type || 'custom'}
														options={[
															{label: __('Custom Button', 'fluent-player'), value: 'custom'},
															{label: __('YouTube Subscribe', 'fluent-player'), value: 'youtube'},
															{label: __('No Button', 'fluent-player'), value: 'none'}
														]}
														onChange={(value) => updateSettings('action_bar', 'button_type', value)}
													/>
												</SettingsSectionCard>

												{presetData.settings?.action_bar?.button_type === 'custom' && (
													<SettingsSectionCard
														title={__('Button Setup', 'fluent-player')}
														summary={getActionBarButtonSetupSummary()}
														defaultOpen={false}
													>
														<BaseControl label={__('Button Text', 'fluent-player') + ' *'}>
															<div className="fp-input-with-suffix">
																<input
																	ref={actionBarButtonTextRef}
																	type="text"
																	className="fp-input-with-suffix__input"
																	value={presetData.settings?.action_bar?.button_text ?? ''}
																	onChange={(e) => updateSettings('action_bar', 'button_text', e.target.value)}
																/>
																<ShortcodeInserter
																	inputRef={actionBarButtonTextRef}
																	onInsert={(value) => updateSettings('action_bar', 'button_text', value)}
																/>
															</div>
														</BaseControl>

														{presetData.settings?.action_bar?.button_text && (
															<>
																<BaseControl label={__('Button Link', 'fluent-player')}>
																	<div className="fp-input-with-suffix">
																		<input
																			ref={actionBarButtonLinkRef}
																			type="text"
																			className="fp-input-with-suffix__input"
																			value={presetData.settings?.action_bar?.button_link || ''}
																			onChange={(e) => updateSettings('action_bar', 'button_link', e.target.value)}
																		/>
																		<ShortcodeInserter
																			inputRef={actionBarButtonLinkRef}
																			onInsert={(value) => updateSettings('action_bar', 'button_link', value)}
																		/>
																	</div>
																</BaseControl>

																{presetData.settings?.action_bar?.button_link && (
																	<CustomToggle
																		label={__('Open in New Tab', 'fluent-player')}
																		checked={presetData.settings?.action_bar?.open_in_new_tab !== false}
																		onChange={(value) => updateSettings('action_bar', 'open_in_new_tab', value)}
																		switchPosition="left"
																		justify="start"
																	/>
																)}
															</>
														)}
													</SettingsSectionCard>
												)}

												{presetData.settings?.action_bar?.button_type === 'youtube' && (
													<SettingsSectionCard
														title={__('YouTube Setup', 'fluent-player')}
														summary={getActionBarYoutubeSetupSummary()}
														defaultOpen={false}
													>
														<TextControl
															label={__('YouTube Channel ID', 'fluent-player')}
															value={presetData.settings?.action_bar?.youtube_channel || ''}
															onChange={(value) => {
																updateSettings('action_bar', 'youtube_channel', value);
																if (!YOUTUBE_CHANNEL_ID_PATTERN.test(String(value || '').trim())) {
																	updateSettings('action_bar', 'subscriber_count', '');
																}
															}}
															help={__('Enter your YouTube channel ID', 'fluent-player')}
														/>
														<CustomToggle
															label={__('Show Subscriber Count', 'fluent-player')}
															checked={presetData.settings?.action_bar?.button_count || false}
															onChange={(value) => {
																updateSettings('action_bar', 'button_count', value);
																if (value && presetData.settings?.action_bar?.youtube_channel) {
																	fetchYoutubeSubscriberCount(presetData.settings?.action_bar?.youtube_channel);
																}
															}}
															switchPosition="left"
															justify="start"
														/>
														{presetData.settings?.action_bar?.button_count && presetData.settings?.action_bar?.subscriber_count && (
															<div className="fluent-player-form-row">
																<p>
																	{__('Current Subscriber Count: ', 'fluent-player')}
																	<strong>{presetData.settings?.action_bar?.subscriber_count}</strong>
																</p>
																<Button
																	variant="secondary"
																	size="small"
																	onClick={() => fetchYoutubeSubscriberCount(presetData.settings?.action_bar?.youtube_channel)}
																>
																	{__('Refresh Count', 'fluent-player')}
																</Button>
															</div>
														)}
													</SettingsSectionCard>
												)}

												<SettingsSectionCard
													title={__('Appearance', 'fluent-player')}
													summary={getActionBarAppearanceSummary()}
													defaultOpen={false}
												>
													<div className="fp-color-section">
														<label className="fp-color-section-label components-base-control__label">
															{__('Overlay Color', 'fluent-player')}
														</label>
														<div className="fp-color-trigger-list fp-color-trigger-list--side-by-side">
															<ColorPickerInput
																asTrigger
																label={__('Background', 'fluent-player')}
																value={presetData.settings?.action_bar?.background_color ?? ''}
																defaultValue="#000000CC"
																onChange={(value) => updateSettings('action_bar', 'background_color', value)}
																enableAlpha={true}
															/>
															<ColorPickerInput
																asTrigger
																label={__('Text', 'fluent-player')}
																value={presetData.settings?.action_bar?.text_color ?? ''}
																defaultValue="#ffffff"
																onChange={(value) => updateSettings('action_bar', 'text_color', value)}
															/>
														</div>
													</div>

													{presetData.settings?.action_bar?.show_close && (
														<div className="fp-color-section">
															<label className="fp-color-section-label components-base-control__label">
																{__('Close Button Color', 'fluent-player')}
															</label>
															<div className="fp-color-trigger-list fp-color-trigger-list--side-by-side">
																<ColorPickerInput
																	asTrigger
																	label={__('Background', 'fluent-player')}
																	value={presetData.settings?.action_bar?.close_button_color ?? ''}
																	defaultValue="#4e9cf6"
																	onChange={(value) => updateSettings('action_bar', 'close_button_color', value)}
																/>
																<ColorPickerInput
																	asTrigger
																	label={__('Text', 'fluent-player')}
																	value={presetData.settings?.action_bar?.close_button_text_color ?? ''}
																	defaultValue="#ffffff"
																	onChange={(value) => updateSettings('action_bar', 'close_button_text_color', value)}
																/>
															</div>
														</div>
													)}

													{presetData.settings?.action_bar?.button_type === 'custom' && presetData.settings?.action_bar?.button_text && (
														<>
															<div className="fp-color-section">
																<label className="fp-color-section-label components-base-control__label">
																	{__('Button Color', 'fluent-player')}
																</label>
																<div className="fp-color-trigger-list fp-color-trigger-list--side-by-side">
																	<ColorPickerInput
																		asTrigger
																		label={__('Background', 'fluent-player')}
																		value={presetData.settings?.action_bar?.button_color ?? ''}
																		defaultValue="#4e9cf6"
																		onChange={(value) => updateSettings('action_bar', 'button_color', value)}
																	/>
																	<ColorPickerInput
																		asTrigger
																		label={__('Text', 'fluent-player')}
																		value={presetData.settings?.action_bar?.button_text_color ?? ''}
																		defaultValue="#ffffff"
																		onChange={(value) => updateSettings('action_bar', 'button_text_color', value)}
																	/>
																</div>
															</div>
															<CustomRangeSlider
																label={__('Button Border Radius (PX)', 'fluent-player')}
																value={presetData.settings?.action_bar?.button_radius || 4}
																min={0}
																max={20}
																step={1}
																onChange={(value) => updateSettings('action_bar', 'button_radius', value)}
															/>
														</>
													)}
												</SettingsSectionCard>
											</>
										)}
									</CollapsiblePanel>
							</div>
						</div>

			<div className="form-actions">
				<Button className="fp-btn-secondary" onClick={onClose}>
					{__('Cancel', 'fluent-player')}
				</Button>
				<Button className="fp-btn-primary" onClick={handleSave}>
					{saveButtonText}
				</Button>
			</div>
		</div>
	);
};

const PresetEditModal = ({
	isOpen,
	onClose,
	preset,
	presetData,
	mediaData,
	setPresetData,
	onSave,
	hasPro,
	requestPath
}) => {
	const isNewPreset = preset?.id === 'new';
	const [mediaSettings, setMediaSettings] = useState(null);
	const [hasChanges, setHasChanges] = useState(false);

	useEffect(() => {
		if (!presetData || !mediaData || !presetData.settings) return;
		const settings = {
			...mediaData.settings,
			...presetData.settings,
		};
		setMediaSettings(settings);

		if (!presetData.settings.email_capture) {
			setPresetData({
				...presetData,
				settings: {
					...presetData.settings,
					email_capture: {
						enabled: false,
						percentage: 0,
						allow_skip: true,
						providers: [],
						button_bg_color: '#4e9cf6',
						button_color: '#ffffff',
						border_radius: 4,
						placeholder: 'Email Address',
						headline: 'Sign up to continue watching',
						bottom_text: 'We respect your privacy. Unsubscribe at any time.',
						button_text: 'Subscribe'
					}
				}
			});
		}

		if (!presetData.settings.action_bar) {
			setPresetData({
				...presetData,
				settings: {
					...presetData.settings,
					action_bar: {
						enabled: false,
						position: 'bottom',
						percentage_start: 0,
						text: 'Like this content?',
						background_color: '#000000CC',
						text_color: '#ffffff',
						button_type: 'custom',
						button_text: 'Click Here',
						button_link: '',
						open_in_new_tab: true,
						button_color: '#4e9cf6',
						button_text_color: '#ffffff',
						button_radius: 4,
						button_count: false,
						youtube_channel: '',
						show_close: true,
						close_button_color: '#4e9cf6',
						close_button_text_color: '#ffffff',
					}
				}
			});
		}
	}, [presetData, mediaData]);

	useEffect(() => {
		if (hasChanges) {
			if (wp.data && wp.data.dispatch('core/editor')) {
				wp.data.dispatch('core/editor').unlockPostSaving('fluent-player');
				wp.data.dispatch('core/editor').editPost({edited: true});
			}
		}
	}, [hasChanges]);

	if (isOpen && !hasPro) return (
		<ProModal onClose={onClose} feature={__('Creating Preset', 'fluent-player')} />
	);
	if (!isOpen || !preset) return null;

	const modalTitle = isNewPreset
		? __('Create New Preset', 'fluent-player')
		: __('Edit Preset', 'fluent-player');
	const presetContentKey = preset?.id || preset?.slug || (isNewPreset ? 'new-preset' : 'edit-preset');

	return (
		<Modal
			title={modalTitle}
			onRequestClose={onClose}
			className="fluent-player-block-modal"
		>
			{mediaSettings && (
				<PresetEditModalContent
					key={presetContentKey}
					isNewPreset={isNewPreset}
					mediaSettings={mediaSettings}
					presetData={presetData}
					setPresetData={setPresetData}
					onSave={onSave}
					onClose={onClose}
					requestPath={requestPath}
					hasChanges={hasChanges}
					setHasChanges={setHasChanges}
				/>
			)}
		</Modal>
	);
};

export default PresetEditModal;
