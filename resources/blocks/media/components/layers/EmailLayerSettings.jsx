	const { __, sprintf } = wp.i18n;
const { BaseControl } = wp.components;
const { useState, useEffect, useImperativeHandle, forwardRef, useRef } = wp.element;

import { formatTime, secondsToTime, timeToSeconds } from '@share/helper.js';
import { useNotification } from '../common/useNotification.js';
import { EmailProviderSettings } from '../EmailProviderSettings.jsx';
import InfoIcon from '../common/InfoIcon.jsx';
import TimeInput from '../common/TimeInput.jsx';
import CustomRangeSlider from '../common/CustomRangeSlider.jsx';
import ColorPickerInput from '../common/ColorPickerInput.jsx';
import CustomToggle from '../common/CustomToggle.jsx';
import ConditionSettings from '../common/ConditionSettings.jsx';
import ShortcodeInserter from '../common/ShortcodeInserter.jsx';
import SettingsSectionCard from '../common/SettingsSectionCard.jsx';
import useAccordionState from '../common/useAccordionState.js';
import { applyConditionStateKey } from '../../../hooks/conditionStateKey.js';
import {
	formatAtTimeSummary,
	summarizeAppearanceParts,
	summarizeEmailContent,
	summarizeProviderNames,
} from '../common/summaryHelpers.js';
import { LAYER_SECTION_IDS } from './layerSectionConfig.js';

const EmailLayerSettings = forwardRef(({ onAdd, onCancel, setPreviewLayer, editingLayer, requestPath, currentTime = 0, onTimeChange }, ref) => {
	const { showNotification } = useNotification();
	const hasPro = !!window?.fluentPlayerBlockVars?.hasPro;
	const initialTime = editingLayer?.displayTime || currentTime || 0;
	const initialTimeParts = secondsToTime(initialTime);
	
	const [settings, setSettings] = useState({
		cta_type: "email",
		type: "cta",
		email_capture: {
			enabled: true,
			providers: [],
			button_bg_color: "#4e9cf6",
			button_color: "#ffffff",
			border_radius: 4,
			placeholder: __("Email Address", "fluent-player"),
			headline: __("Sign up to continue watching", "fluent-player"),
			bottom_text: __("We respect your privacy. Unsubscribe at any time.", "fluent-player"),
			button_text: __("Subscribe", "fluent-player")
		},
		allow_skip: false,
		bg_color: "#FFFFFFB3",
		start_time_hours: initialTimeParts.hours,
		start_time_minutes: initialTimeParts.minutes,
		start_time_seconds: initialTimeParts.seconds
	});
	const [providersMeta, setProvidersMeta] = useState({});
	const placeholderInputRef = useRef(null);
	const headlineInputRef = useRef(null);
	const buttonTextInputRef = useRef(null);
	const bottomTextInputRef = useRef(null);
	const confirmationMessageRef = useRef(null);
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
			setPreviewLayer({ type: "cta", cta_type: "email", ...settings });
		}
	}, [settings]);

	useEffect(() => {
		if (onTimeChange) {
			const displayTime = timeToSeconds(settings.start_time_hours, settings.start_time_minutes, settings.start_time_seconds);
			onTimeChange(displayTime);
		}
	}, [settings.start_time_hours, settings.start_time_minutes, settings.start_time_seconds]);

	const updateSettings = (key, subKey, value) => {
		setSettings(prev => {
			return subKey ? {
				...prev,
				[key]: {
					...prev[key],
					[subKey]: value
				}
			} : { ...prev, [key]: value };
		});
	};

	const handleTimeChange = (field, value) => {
		isTimeInputChangeRef.current = true;
		updateSettings(`start_time_${field}`, null, value);
	};

	const getDisplaySummary = () => {
		return formatAtTimeSummary(timeToSeconds(
			settings.start_time_hours,
			settings.start_time_minutes,
			settings.start_time_seconds
		));
	};

	const getProviderSetupSummary = () => {
		return summarizeProviderNames(settings.email_capture?.providers || [], providersMeta);
	};

	const getContentSummary = () => summarizeEmailContent({
		headline: settings.email_capture?.headline,
		placeholder: settings.email_capture?.placeholder,
		buttonText: settings.email_capture?.button_text,
		bottomText: settings.email_capture?.bottom_text,
	});

	const getControlsSummary = () => {
		return settings.allow_skip !== false
			? __('Skip enabled', 'fluent-player')
			: __('Skip disabled', 'fluent-player');
	};

	const getAppearanceSummary = () => {
		return summarizeAppearanceParts([
			settings.email_capture?.button_bg_color || settings.email_capture?.button_color
				? __('Button colors', 'fluent-player')
				: '',
			settings.bg_color ? __('Layer background', 'fluent-player') : '',
			settings.email_capture?.border_radius !== undefined ? __('Radius', 'fluent-player') : '',
		]);
	};

	const validateEmailProviders = () => {
		const warnings = [];
		const providers = settings.email_capture?.providers || [];
		if (providers.length === 0) {
			warnings.push(__("Email capture is enabled but no providers are configured.", "fluent-player"));
			return warnings;
		}

		providers.forEach((provider, index) => {
			if (!provider.enabled) return;

			if (!provider.type) {
				warnings.push(__("A provider is missing its type configuration.", "fluent-player"));
				return;
			}

			if (provider.type === "email") {
				if (!provider.config?.email_subject || !provider.config?.email_body) {
					warnings.push(__("Email provider is missing subject or body.", "fluent-player"));
				}
				return;
			}

			const providerFields = providersMeta[provider.type]?.settings_fields || [];

			providerFields.forEach(field => {
				if (field.required &&
					field.context === "preset_editor" &&
					field.key !== "api_key" &&
					!provider.config?.[field.key]) {
					warnings.push(
						__(`A ${providersMeta[provider.type]?.name || provider.type} provider is missing the required field: ${field.label}`, "fluent-player")
					);
				}
			});
		});

		return warnings;
	};

	const handleAdd = () => {
		const ec = settings.email_capture || {};
		if (!ec.headline || !String(ec.headline).trim()) {
			showNotification({ type: 'error', message: __('Please enter the headline', 'fluent-player') });
			return;
		}
		if (!ec.button_text || !String(ec.button_text).trim()) {
			showNotification({ type: 'error', message: __('Please enter the button text', 'fluent-player') });
			return;
		}

		const warnings = validateEmailProviders();
		if (warnings.length > 0) {
			warnings.forEach(warning => {
				showNotification({ type: 'warning', message: warning });
			});
			return;
		}

		const displayTime = timeToSeconds(
			settings.start_time_hours,
			settings.start_time_minutes,
			settings.start_time_seconds
		);

		const layerData = {
			type: "cta",
			cta_type: "email",
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
		<div className="cta-layer-settings">
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
				title={__('Email Providers', 'fluent-player')}
				help={__('Connect email services to collect viewer emails on form submit.', 'fluent-player')}
				summary={getProviderSetupSummary()}
				isOpen={openSectionId === LAYER_SECTION_IDS.PROVIDER_SETUP}
				onToggle={() => toggleSection(LAYER_SECTION_IDS.PROVIDER_SETUP)}
			>
				<div className="fluent-player-form-row">
					<EmailProviderSettings
						settings={settings}
						updateSettings={updateSettings}
						requestPath={requestPath}
						updateProvidersMeta={setProvidersMeta}
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
					<BaseControl label={__("Email Placeholder", "fluent-player")}>
						<div className="fp-input-with-suffix">
							<input
								ref={placeholderInputRef}
								type="text"
								className="fp-input-with-suffix__input"
								value={settings.email_capture.placeholder}
								onChange={(e) => updateSettings("email_capture", "placeholder", e.target.value)}
							/>
							<ShortcodeInserter
								inputRef={placeholderInputRef}
								onInsert={(value) => updateSettings("email_capture", "placeholder", value)}
							/>
						</div>
					</BaseControl>
				</div>

				<div className="fluent-player-form-row">
					<BaseControl
						label={
							<div className="fp-label-with-inserter">
								<div className="fp-label-with-inserter-content">
									<span>{__("Headline", "fluent-player") + ' *'}</span>
										<InfoIcon
											label={__('Show help for headline', 'fluent-player')}
											tooltip={__("Form headline text", "fluent-player")}
										/>
								</div>
								<ShortcodeInserter
									inputRef={headlineInputRef}
									onInsert={(value) => updateSettings("email_capture", "headline", value)}
								/>
							</div>
						}
					>
						<textarea
							ref={headlineInputRef}
							className="components-textarea-control__input"
							value={settings.email_capture.headline}
							onChange={(e) => updateSettings("email_capture", "headline", e.target.value)}
							placeholder={__("Enter headline...", "fluent-player")}
							rows={3}
						/>
					</BaseControl>
				</div>

				<div className="fluent-player-form-row">
					<BaseControl label={__("Button Text", "fluent-player") + ' *'}>
						<div className="fp-input-with-suffix">
							<input
								ref={buttonTextInputRef}
								type="text"
								className="fp-input-with-suffix__input"
								value={settings.email_capture.button_text}
								onChange={(e) => updateSettings("email_capture", "button_text", e.target.value)}
							/>
							<ShortcodeInserter
								inputRef={buttonTextInputRef}
								onInsert={(value) => updateSettings("email_capture", "button_text", value)}
							/>
						</div>
					</BaseControl>
				</div>

				<div className="fluent-player-form-row">
					<BaseControl label={__("Bottom Text", "fluent-player")}>
						<div className="fp-input-with-suffix">
							<input
								ref={bottomTextInputRef}
								type="text"
								className="fp-input-with-suffix__input"
								value={settings.email_capture.bottom_text}
								onChange={(e) => updateSettings("email_capture", "bottom_text", e.target.value)}
							/>
							<ShortcodeInserter
								inputRef={bottomTextInputRef}
								onInsert={(value) => updateSettings("email_capture", "bottom_text", value)}
							/>
						</div>
					</BaseControl>
				</div>

				<div className="fluent-player-form-row">
					<BaseControl
						label={
							<div className="fp-label-with-inserter">
								<div className="fp-label-with-inserter-content">
									<span>{__("Confirmation Message", "fluent-player")}</span>
									<InfoIcon
										label={__('Show help for confirmation message', 'fluent-player')}
										tooltip={__("Shown after a successful submit. Leave empty to hide the form immediately with no message.", "fluent-player")}
									/>
								</div>
								<ShortcodeInserter
									inputRef={confirmationMessageRef}
									onInsert={(value) => updateSettings("email_capture", "confirmation_message", value)}
								/>
							</div>
						}
					>
						<textarea
							ref={confirmationMessageRef}
							className="components-textarea-control__input"
							value={settings.email_capture.confirmation_message || ''}
							onChange={(e) => updateSettings("email_capture", "confirmation_message", e.target.value)}
							placeholder={__("e.g. Thanks! Please check your inbox to confirm.", "fluent-player")}
							rows={3}
						/>
					</BaseControl>
				</div>

				<div className="fluent-player-form-row">
					<BaseControl
						label={
							<div className="fp-label-with-inserter-content">
								<span>{__("Auto-dismiss After (seconds)", "fluent-player")}</span>
								<InfoIcon
									label={__('Show help for auto-dismiss', 'fluent-player')}
									tooltip={__("Set to 0 to keep the message until the viewer dismisses it.", "fluent-player")}
								/>
							</div>
						}
					>
						<input
							type="number"
							min={0}
							max={60}
							className="components-text-control__input"
							value={settings.email_capture.confirmation_countdown ?? 10}
							onChange={(e) => updateSettings("email_capture", "confirmation_countdown", e.target.value === '' ? '' : Math.min(60, Math.max(0, parseInt(e.target.value, 10) || 0)))}
						/>
					</BaseControl>
				</div>

				<div className="fluent-player-form-row">
					<BaseControl label={__("Dismiss Button Text", "fluent-player")}>
						<input
							type="text"
							className="components-text-control__input"
							value={settings.email_capture.confirmation_dismiss_text || ''}
							onChange={(e) => updateSettings("email_capture", "confirmation_dismiss_text", e.target.value)}
							placeholder={__("Continue", "fluent-player")}
						/>
					</BaseControl>
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
						checked={settings.allow_skip !== false}
						onChange={(value) => updateSettings("allow_skip", null, value)}
						label={__("Allow Skipping", "fluent-player")}
						help={__("Let viewers skip the email form", "fluent-player")}
						name="allow_skip"
					/>
				</div>
				{window.fluentPlayerBlockVars?.has_fluentcrm && (
					<div className="fluent-player-form-row">
						<CustomToggle
							checked={settings.skip_if_crm_contact !== false}
							onChange={(value) => updateSettings("skip_if_crm_contact", null, value)}
							label={__("Skip for Subscribed CRM Contacts", "fluent-player")}
							help={__("When enabled, logged-in users who are already subscribed FluentCRM contacts will not see this email capture.", "fluent-player")}
							name="skip_if_crm_contact"
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
								{__('Button Color', 'fluent-player')}
							</label>
							<div className="fp-color-trigger-list fp-color-trigger-list--side-by-side">
								<ColorPickerInput
									asTrigger
									label={__('Background', 'fluent-player')}
									value={settings.email_capture.button_bg_color ?? ''}
									defaultValue="#4e9cf6"
									onChange={(color) => updateSettings('email_capture', 'button_bg_color', color)}
								/>
								<ColorPickerInput
									asTrigger
									label={__('Text', 'fluent-player')}
									value={settings.email_capture.button_color ?? ''}
									defaultValue="#ffffff"
									onChange={(color) => updateSettings('email_capture', 'button_color', color)}
								/>
						</div>
					</div>
				</div>

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
									onChange={(color) => updateSettings('bg_color', null, color)}
								/>
						</div>
					</div>
				</div>

				<div className="fluent-player-form-row">
					<CustomRangeSlider
						value={settings.email_capture.border_radius || 4}
						min={0}
						max={20}
						step={1}
						onChange={(value) => updateSettings("email_capture", "border_radius", value)}
						label={__('Border Radius (PX)', 'fluent-player')}
					/>
				</div>
			</SettingsSectionCard>

			{hasPro ? (
				<div className="fluent-player-form-row">
					<ConditionSettings
						value={settings.conditionals}
						onChange={(value) => updateSettings("conditionals", null, value)}
					/>
				</div>
			) : (
				<ConditionSettings
					value={settings.conditionals}
					onChange={(value) => updateSettings("conditionals", null, value)}
				/>
			)}
		</div>
	);
});

export default EmailLayerSettings;
