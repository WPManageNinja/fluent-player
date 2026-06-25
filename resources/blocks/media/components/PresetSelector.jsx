const { useState, useEffect } = wp.element;
const { apiFetch } = wp;
const { __ } = wp.i18n;
const { Button, Spinner, Tooltip, BaseControl } = wp.components;

import PresetEditModal from './PresetEditModal';
import ProModal from './common/ProModal.jsx';
import ConfirmPopover from './common/ConfirmPopover.jsx';
import { EditIconSVG, DeleteIconSVG, PlusIconSVG, LockIconSVG } from './common/Icons.jsx';
import { PresetPreview } from './common/PresetCardGrid.jsx';
import { isAmbientPreset } from './common/ambientPreset.js';
import { NotificationProvider } from './common/NotificationContext.jsx';
import NotificationContainer from './common/NotificationContainer.jsx';
import { useNotification } from './common/useNotification.js';

const isAmbientPresetSettings = (settings = {}) => (
	settings?.skin === 'minimal'
	&& settings?.behaviors?.muted_autoplay === true
	&& settings?.behaviors?.on_video_end === 'loop'
	&& settings?.behaviors?.hide_top_controls === true
	&& settings?.behaviors?.hide_center_controls === true
	&& settings?.behaviors?.hide_bottom_controls === true
);

const createDefaultContextMenuSettings = (settings = {}) => {
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

const PresetSelectorContent = ({
	presets,
	fetchPresets,
	mediaData,
	setMediaData,
	defaultSettings,
	requestPath,
	onVideoModalOpen
}) => {
	const { showNotification } = useNotification();

	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [editingPreset, setEditingPreset] = useState(null);
	const [newPresetData, setNewPresetData] = useState({});
	const [emailProviders, setEmailProviders] = useState({});
	const [providersMeta, setProvidersMeta] = useState({});
	const [loading, setLoading] = useState(false);
	const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, anchor: null, preset: null });
	const [showProModal, setShowProModal] = useState(false);

	const hasPro = !!window.fluentPlayerBlockVars?.hasPro;

	useEffect(() => {
		fetchEmailProviders();
	}, []);

	const fetchEmailProviders = async () => {
		setLoading(true);
		try {
			const response = await apiFetch({ path: `${requestPath}/email-providers` });

			if (response && response.providers) {
				const enabledProviders = {};

				Object.keys(response.providers).forEach(key => {
					enabledProviders[key] = response.providers[key]?.enabled === true;
				});

				setEmailProviders(enabledProviders);

				if (response.providers_meta) {
					setProvidersMeta(response.providers_meta);
				}
			}
		} catch (error) {
			console.error('Error fetching email providers:', error);
		} finally {
			setLoading(false);
		}
	};

	const isDefaultPreset = (presetSlug) => {
		return presetSlug === defaultSettings.defaultPresetSlug;
	};

	const isReservedPreset = (preset) => {
		return ['default', 'simple', 'minimal', 'course', 'standard', 'floating', 'ambient'].includes(preset.settings?.slug);
	};

	const applyPreset = (preset) => {
		const behaviors = preset.settings?.behaviors || {};
		const currentSettings = mediaData.settings || {};
		const hasBehavior = (key) => Object.prototype.hasOwnProperty.call(behaviors, key);
		const updatedMediaData = {
			...mediaData,
			settings: {
				...currentSettings,
				preset_slug: preset.slug,
				autoplay: hasBehavior('autoplay')
					? !!behaviors.autoplay
					: currentSettings.autoplay,
				mutedAutoplay: hasBehavior('muted_autoplay')
					? !!behaviors.muted_autoplay
					: currentSettings.mutedAutoplay,
				playsInline: hasBehavior('plays_inline')
					? !!behaviors.plays_inline
					: currentSettings.playsInline,
				save_play_position: hasBehavior('save_play_position')
					? !!behaviors.save_play_position
					: currentSettings.save_play_position,
				video_end_option: hasBehavior('on_video_end')
					? (behaviors.on_video_end === 'loop' ? 'loop' : 'default')
					: currentSettings.video_end_option,
				hide_top_controls: hasBehavior('hide_top_controls')
					? !!behaviors.hide_top_controls
					: currentSettings.hide_top_controls,
				hide_center_controls: hasBehavior('hide_center_controls')
					? !!behaviors.hide_center_controls
					: currentSettings.hide_center_controls,
				hide_bottom_controls: hasBehavior('hide_bottom_controls')
					? !!behaviors.hide_bottom_controls
					: currentSettings.hide_bottom_controls,
			},
		};
		setMediaData(updatedMediaData);

		if (wp.data && wp.data.dispatch('core/editor')) {
			wp.data.dispatch('core/editor').unlockPostSaving('fluent-player');
			wp.data.dispatch('core/editor').editPost({ edited: true });
		}
	};

	const editPreset = (e, preset) => {
		e.stopPropagation();
		setEditingPreset(preset);
		setNewPresetData({
			name: preset.name,
			settings: {
				...preset.settings,
				context_menu: createDefaultContextMenuSettings(preset.settings),
			}
		});
		setIsEditModalOpen(true);
		onVideoModalOpen?.();
	};

	const showDeleteConfirm = (e, preset) => {
		if (!hasPro) {
			setEditingPreset(preset);
			setIsEditModalOpen(true);
			onVideoModalOpen?.();
			return;
		}
		e.stopPropagation();
		
		setDeleteConfirm({
			isOpen: true,
			anchor: e.currentTarget,
			preset,
		});
	};

	const hideDeleteConfirm = () => {
		setDeleteConfirm({ isOpen: false, anchor: null, preset: null });
	};

	const handleDeletePreset = async () => {
		const preset = deleteConfirm.preset;
		hideDeleteConfirm();

		try {
			await apiFetch({
				path: `${requestPath}/presets/${preset.slug}`,
				method: 'DELETE'
			});

			fetchPresets();

			showNotification({
				type: 'success',
				message: __('Preset deleted successfully.', 'fluent-player')
			});
		} catch (error) {
			console.error('Error deleting preset:', error);
			showNotification({
				type: 'error',
				message: __('Failed to delete preset. Please try again.', 'fluent-player')
			});
		}
	};

	const createPreset = () => {
		const baseControls = mediaData.controls || {
			progress_bar: true,
			play: true,
			volume: true,
			fullscreen: true,
			pip: true,
			captions_toggle: true
		};
		const baseBehaviors = mediaData.behaviors || {
			autoplay: false,
			muted_autoplay: false,
			save_play_position: false
		};
		const baseStyles = mediaData.styles || {
			captions: {
				font_size: 16,
				background: 'rgba(0,0,0,0.8)',
				color: '#ffffff'
			},
			brand_color: '#000000'
		};
		const newPreset = {
			id: 'new',
			name: '',
			settings: {
				skin: mediaData.skin || 'modern',
				controls: baseControls,
				behaviors: baseBehaviors,
				styles: baseStyles,
				context_menu: createDefaultContextMenuSettings({
					skin: mediaData.skin || 'modern',
					controls: baseControls,
					behaviors: baseBehaviors,
					styles: baseStyles,
				}),
				action_bar: {
					enabled: false,
					position: 'bottom',
					text: 'Like this?',
					text_size: '20',
					background_color: 'rgba(0,0,0,0.8)',
					button_type: 'none',
					button_text: 'Click Here',
					button_color: '#4e9cf6',
					button_text_color: '#ffffff',
					button_radius: 4,
					button_link: '',
					open_in_new_tab: true,
					percentage_start: 0,
					youtube_channel: '',
					button_count: false,
					subscriber_count: '',
					close_button_color: '#4e9cf6',
					close_button_text_color: '#ffffff',
				},
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
				},
				cta: {
					enabled: false,
					percentage: 80,
					completion_type: 'link_click',
					auto_dismiss_duration: 5,
					allow_skip: true,
					content: '<h2 style="text-align: center;">Ready to take the next step?</h2>\n<p style="text-align: center;">Click the button below to learn more.</p>\n<p style="text-align: center;"><a style="background-color: #4e9cf6; color: #ffffff; display: inline-block; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 500;" href="#">Learn More</a></p>',
					bg_color: '#0E121B',
					text_color: '#ffffff'
				}
			}
		};

		setEditingPreset(newPreset);
		setNewPresetData({
			name: '',
			settings: {
				...newPreset.settings,
				context_menu: createDefaultContextMenuSettings(newPreset.settings),
			}
		});
		setIsEditModalOpen(true);
		onVideoModalOpen?.();
	};

	const validateEmailProviders = (providers) => {
		const warnings = [];

		if (providers.length === 0) {
			warnings.push(__('Email capture is enabled but no providers are configured.', 'fluent-player'));
			return warnings;
		}

		providers.forEach((provider, index) => {
			if (!provider.enabled) return;

			if (!provider.type) {
				warnings.push(__('A provider is missing its type configuration.', 'fluent-player'));
				return;
			}

			if (provider.type === 'email') {
				if (!provider.config?.email_subject || !provider.config?.email_body) {
					warnings.push(__('Email provider is missing subject or body.', 'fluent-player'));
				}
				return;
			}

			const providerFields = providersMeta[provider.type]?.settings_fields || [];

			providerFields.forEach(field => {
				if (field.required &&
					field.context === 'preset_editor' &&
					field.key !== 'api_key' &&
					!provider.config?.[field.key]) {
					warnings.push(
						__(`A ${providersMeta[provider.type]?.name || provider.type} provider is missing the required field: ${field.label}`, 'fluent-player')
					);
				}
			});
		});

		return warnings;
	};

	const savePreset = async () => {
		if (!newPresetData.name || newPresetData.name.trim() === '') {
			showNotification({
				type: 'error',
				message: __('Please enter a preset name.', 'fluent-player')
			});
			return;
		}

		if (newPresetData.settings.email_capture?.enabled) {
			const providers = newPresetData.settings.email_capture.providers || [];
			const warnings = validateEmailProviders(providers);

			warnings.forEach(warning => {
				showNotification({
					type: 'warning',
					message: warning
				});
			});
		}

		if (newPresetData.settings.cta?.enabled) {
			const ctaContent = newPresetData.settings.cta?.content || '';
			if (!ctaContent.trim()) {
				showNotification({
					type: 'warning',
					message: __('Please enter content for the Call To Action.', 'fluent-player')
				});
			}
		}

		try {
			let response;
			if (editingPreset.id === 'new') {
				response = await apiFetch({
					path: `${requestPath}/presets`,
					method: 'POST',
					data: {
						name: newPresetData.name,
						settings: JSON.stringify(newPresetData.settings)
					}
				});
			} else {
				response = await apiFetch({
					path: `${requestPath}/presets/${editingPreset.slug}`,
					method: 'PUT',
					data: {
						name: newPresetData.name,
						settings: JSON.stringify(newPresetData.settings)
					}
				});
			}

			setIsEditModalOpen(false);
			fetchPresets();

			if (wp.data && wp.data.dispatch('core/editor')) {
				wp.data.dispatch('core/editor').unlockPostSaving('fluent-player');
				wp.data.dispatch('core/editor').editPost({ edited: true });
			}

			showNotification({
				type: 'success',
				message: editingPreset.id === 'new'
					? __('Preset created successfully.', 'fluent-player')
					: __('Preset updated successfully.', 'fluent-player')
			});
		} catch (error) {
			console.error('Error saving preset:', error);
			showNotification({
				type: 'error',
				message: __('Failed to save preset. Please try again.', 'fluent-player')
			});
		}
	};

	const duplicatePreset = async (e, preset) => {
		if (!hasPro) {
			setEditingPreset(preset);
			setIsEditModalOpen(true);
			onVideoModalOpen?.();
			return;
		}
		e.stopPropagation();

		try {
			preset.settings.slug = '';
			const duplicatedPresetData = {
				name: `${preset.name} (Copy)`,
				settings: JSON.stringify(preset.settings)
			};

			const response = await apiFetch({
				path: `${requestPath}/presets`,
				method: 'POST',
				data: duplicatedPresetData
			});

			fetchPresets();

			showNotification({
				type: 'success',
				message: __('Preset duplicated successfully.', 'fluent-player')
			});
		} catch (error) {
			console.error('Error duplicating preset:', error);
			showNotification({
				type: 'error',
				message: __('Failed to duplicate preset. Please try again.', 'fluent-player')
			});
		}
	};

	const renderContent = () => {
		if (loading) {
			return (
				<div className="fluent-player-presets-loading">
					<Spinner />
					<p>{__('Loading presets...', 'fluent-player')}</p>
				</div>
			);
		}

		if (!presets || presets.length === 0) {
			return (
				<div className="fluent-player-presets-empty">
					<p>{__('No presets available.', 'fluent-player')}</p>
					<Button
						className="fp-btn-primary"
						onClick={createPreset}
					>
						<PlusIconSVG />
						{__('Create New Preset', 'fluent-player')}
					</Button>
				</div>
			);
		}

		return (
			<>
				<div className="fplayer-preset-grid">
					{presets.map(preset => {
						const isSelected = mediaData.settings?.preset_slug === preset.slug;
						const isReserved = isReservedPreset(preset);
						const isLocked = isAmbientPreset(preset) && !hasPro;
						const skin = preset.settings?.skin || preset.settings?.slug || 'modern';

						return (
							<div key={preset.slug}>
								<button
									type="button"
									className={`fplayer-preset-card ${isSelected ? 'is-selected' : ''} ${isLocked ? 'is-locked' : ''}`}
									aria-pressed={isSelected}
									aria-disabled={isLocked}
									onClick={() => (isLocked ? setShowProModal(true) : applyPreset(preset))}
								>
									<PresetPreview skin={skin} isAmbient={isAmbientPreset(preset)} />
									{isLocked && (
										<span className="fplayer-preset-lock-badge" role="img" aria-label={__('Pro feature', 'fluent-player')}>
											<LockIconSVG size={14} />
										</span>
									)}
								</button>
								<div className="fplayer-preset-card-footer">
									<span className="fplayer-preset-name">
										{preset.name}
										{preset.description && (
											<Tooltip text={preset.description}>
												<span className="fplayer-preset-info-icon">
													<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
												</span>
											</Tooltip>
										)}
									</span>
									<div className="fplayer-preset-actions">
										{isReserved ? (
											<Tooltip text={__('Duplicate', 'fluent-player')}>
												<button
													className="fplayer-preset-action-btn"
													onClick={(e) => duplicatePreset(e, preset)}
													aria-label={__('Duplicate preset', 'fluent-player')}
												>
													<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
														<path d="M7.5 2.5H15.625C16.6605 2.5 17.5 3.33947 17.5 4.375V12.5C17.5 13.5355 16.6605 14.375 15.625 14.375H13.75V15.625C13.75 16.6605 12.9105 17.5 11.875 17.5H4.375C3.33947 17.5 2.5 16.6605 2.5 15.625V7.5C2.5 6.46447 3.33947 5.625 4.375 5.625H6.25V4.375C6.25 3.33947 7.08947 2.5 7.5 2.5ZM4.375 6.875C4.02982 6.875 3.75 7.15482 3.75 7.5V15.625C3.75 15.9702 4.02982 16.25 4.375 16.25H11.875C12.2202 16.25 12.5 15.9702 12.5 15.625V14.375H7.5C6.46447 14.375 5.625 13.5355 5.625 12.5V6.875H4.375ZM7.5 3.75C7.15482 3.75 6.875 4.02982 6.875 4.375V12.5C6.875 12.8452 7.15482 13.125 7.5 13.125H15.625C15.9702 13.125 16.25 12.8452 16.25 12.5V4.375C16.25 4.02982 15.9702 3.75 15.625 3.75H7.5Z" fill="currentColor"/>
													</svg>
												</button>
											</Tooltip>
										) : (
											<>
												<Tooltip text={__('Edit', 'fluent-player')}>
													<button
														className="fplayer-preset-action-btn"
														onClick={(e) => editPreset(e, preset)}
														aria-label={__('Edit preset', 'fluent-player')}
													>
														<EditIconSVG />
													</button>
												</Tooltip>
												<Tooltip text={__('Delete', 'fluent-player')}>
													<button
														className="fplayer-preset-action-btn fplayer-preset-delete-btn"
														onClick={(e) => showDeleteConfirm(e, preset)}
														aria-label={__('Delete preset', 'fluent-player')}
													>
														<DeleteIconSVG />
													</button>
												</Tooltip>
											</>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>

			<Button
				className="fp-btn-secondary fplayer-preset-add-btn"
				onClick={createPreset}
			>
				<PlusIconSVG />
				{__('Add New', 'fluent-player')}
				{!hasPro && <LockIconSVG size={14} />}
			</Button>

			<ConfirmPopover
				isOpen={deleteConfirm.isOpen}
				anchor={deleteConfirm.anchor}
				title={__('Delete Preset', 'fluent-player')}
				message={__('Are you sure you want to delete this preset? This action cannot be undone.', 'fluent-player')}
				confirmText={__('Delete', 'fluent-player')}
				cancelText={__('Cancel', 'fluent-player')}
				onConfirm={handleDeletePreset}
				onCancel={hideDeleteConfirm}
			/>

			{showProModal && (
				<ProModal
					feature={__('The Ambient preset', 'fluent-player')}
					onClose={() => setShowProModal(false)}
				/>
			)}
		</>
		);
	};

	return (
		<BaseControl>
			{renderContent()}
			<PresetEditModal
				hasPro={hasPro}
				isOpen={isEditModalOpen}
				onClose={() => setIsEditModalOpen(false)}
				preset={editingPreset}
				mediaData={mediaData}
				presetData={newPresetData}
				setPresetData={setNewPresetData}
				defaultSettings={defaultSettings}
				onSave={savePreset}
				requestPath={requestPath}
				emailProviders={emailProviders}
				providersMeta={providersMeta}
			/>
			<NotificationContainer />
		</BaseControl>
	);
};

const PresetSelector = (props) => {
	return (
		<NotificationProvider>
			<PresetSelectorContent {...props} />
		</NotificationProvider>
	);
};

export default PresetSelector;
