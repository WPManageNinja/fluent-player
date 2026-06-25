const { __, sprintf } = wp.i18n;
const { Modal, Button, BaseControl } = wp.components;
const { useState, useEffect, useRef } = wp.element;

import FluentPlayer from '../player/FluentPlayer.jsx';
import VideoTimeSlider from '../common/VideoTimeSlider.jsx';
import TimeInput from '../common/TimeInput.jsx';
import OverlayPreview from './OverlayPreview.jsx';
import CustomRangeSlider from '../common/CustomRangeSlider.jsx';
import ColorPickerInput from '../common/ColorPickerInput.jsx';
import PositionGrid from '../common/PositionGrid.jsx';
import CustomToggle from '../common/CustomToggle.jsx';
import CustomRadioGroup from '../common/CustomRadioGroup.jsx';
import ShortcodeInserter from '../common/ShortcodeInserter.jsx';
import SettingsSectionCard from '../common/SettingsSectionCard.jsx';
import useAccordionState from '../common/useAccordionState.js';
import useNotification from '../common/useNotification.js';
import ProModal from '../common/ProModal.jsx';
import {
	appendSummaryDetail,
	formatCompactDurationValue,
	formatAtTimeSummary,
	summarizeAppearanceParts,
	summarizeOverlayContent,
	summarizeOverlayLayout,
} from '../common/summaryHelpers.js';

const OverlayManageModal = ({
    isOpen,
    onClose,
    mediaData,
    setMediaData,
    presets,
    positionOptions,
    editingOverlay: initialEditingOverlay
}) => {
    const { showNotification } = useNotification();
	const hasPro = !!window.fluentPlayerBlockVars?.hasPro;
    const [currentTime, setCurrentTime] = useState(0);
    const [playerRef, setPlayerRef] = useState(null);
	const [duration, setDuration] = useState(mediaData?.settings?.duration || 0);
    const [mediaSettings, setMediaSettings] = useState({});
	const [formData, setFormData] = useState({
		text: '',
		link: '',
		position: 'position-top-left',
		dynamic_position: false,
		reposition_interval: 10,
		reposition_animation: 'fade',
		backgroundColor: '#0E121B',
		textColor: '#FFFFFF',
		duration: 5,
		hours: 0,
		minutes: 0,
		seconds: 0,
	});
	const [isEditing, setIsEditing] = useState(false);
	const [activeOverlayId, setActiveOverlayId] = useState(initialEditingOverlay?.id || null);
	const [isProModalOpen, setIsProModalOpen] = useState(false);
	const textInputRef = useRef(null);
	const linkInputRef = useRef(null);

	const overlays = mediaData?.settings?.overlays || [];
	const getPositionLabel = (positionValue) => (
		positionOptions.find((option) => option.value === positionValue)?.label || positionValue
	);

	const pausePlayer = () => {
		if (!playerRef || typeof playerRef.pause !== 'function') {
			return;
		}

		if (playerRef.readyState !== undefined && playerRef.readyState < 2) {
			return;
		}

		playerRef.pause();
	};

    useEffect(() => {
        if (initialEditingOverlay) {
			setIsEditing(true);
			setActiveOverlayId(initialEditingOverlay.id);
			const totalSeconds = Math.floor(initialEditingOverlay.displayTime);
			const hours = Math.floor(totalSeconds / 3600);
			const mins = Math.floor((totalSeconds % 3600) / 60);
			const secs = Math.floor(totalSeconds % 60);
			
			setFormData({
				text: initialEditingOverlay.text || '',
				link: initialEditingOverlay.link || '',
				position: initialEditingOverlay.position || 'position-top-left',
				dynamic_position: !!initialEditingOverlay.dynamic_position,
				reposition_interval: initialEditingOverlay.reposition_interval || 10,
				reposition_animation: initialEditingOverlay.reposition_animation || 'fade',
				backgroundColor: initialEditingOverlay.backgroundColor ?? '',
				textColor: initialEditingOverlay.textColor ?? '',
				duration: initialEditingOverlay.duration || 5,
				hours,
				minutes: mins,
				seconds: secs,
			});
			setCurrentTime(initialEditingOverlay.displayTime);
        if (playerRef) {
				playerRef.currentTime = initialEditingOverlay.displayTime;
				pausePlayer();
        }
		} else {
			setIsEditing(false);
			setActiveOverlayId(null);
		}
	}, [initialEditingOverlay, playerRef]);

	useEffect(() => {
		let setting = { ...mediaData.settings };
		if (presets && presets.length) {
			const selectedPreset = presets.find(p => p.slug === mediaData.settings.preset_slug);
			if (selectedPreset) {
				setting = {
					...setting,
					...selectedPreset.settings,
					mutedAutoplay: false,
				};
			}
		}
		setMediaSettings(setting);
	}, []);

    useEffect(() => {
        let interval;
        const getPlayerReference = () => {
			const playerElement = document.querySelector('.fluent-player-overlay-modal media-player');
            if (playerElement) {
                setPlayerRef(playerElement);
                if (playerElement.duration) {
                    setDuration(playerElement.duration);
                    interval && clearInterval(interval);
                }
            }
        };

        interval = setInterval(getPlayerReference, 500);
        return () => interval && clearInterval(interval);
    }, []);

    useEffect(() => {
		if (!playerRef) return;
		const syncTimeFromPlayer = () => {
			const time = playerRef.currentTime;
			if (time == null || Number.isNaN(time)) return;
			const t = Math.floor(Number(time));
			setCurrentTime(t);
			const hours = Math.floor(t / 3600);
			const mins = Math.floor((t % 3600) / 60);
			const secs = Math.floor(t % 60);
			setFormData(prev => (prev.hours === hours && prev.minutes === mins && prev.seconds === secs ? prev : { ...prev, hours, minutes: mins, seconds: secs }));
		};
		// Only sync Start Time when user seeks (slider or video progress), not while playing
		playerRef.addEventListener('seeked', syncTimeFromPlayer);
		return () => playerRef.removeEventListener('seeked', syncTimeFromPlayer);
	}, [playerRef]);

	const handleTimeChange = (time) => {
		setCurrentTime(Math.floor(time));
		if (playerRef && playerRef.currentTime !== undefined) {
			playerRef.currentTime = time;
		}
		const totalSeconds = Math.floor(time);
		const hours = Math.floor(totalSeconds / 3600);
		const mins = Math.floor((totalSeconds % 3600) / 60);
		const secs = Math.floor(totalSeconds % 60);
		setFormData(prev => ({
			...prev,
			hours,
			minutes: mins,
			seconds: secs,
		}));
	};

	const handleTimeInputChange = (field, value) => {
		const next = { ...formData };
		if (field === 'hours') next.hours = Math.max(0, value);
		else if (field === 'minutes') next.minutes = Math.min(59, Math.max(0, value));
		else next.seconds = Math.min(59, Math.max(0, value));
		setFormData(next);
		const newTime = next.hours * 3600 + next.minutes * 60 + next.seconds;
		setCurrentTime(newTime);
		if (playerRef) {
			playerRef.currentTime = newTime;
		}
	};

	const getOverlayMarkers = () => {
		return overlays.map((overlay) => ({
			id: overlay.id,
			displayTime: overlay.displayTime,
			type: 'overlay',
			text: overlay.text,
			position: overlay.position,
		}));
	};

	const handleOverlayMarkerClick = (item) => {
		const overlay = overlays.find(o => o.id === item.id);
		if (overlay) {
			setIsEditing(true);
			setActiveOverlayId(overlay.id);
			const totalSeconds = Math.floor(overlay.displayTime);
			const hours = Math.floor(totalSeconds / 3600);
			const mins = Math.floor((totalSeconds % 3600) / 60);
			const secs = Math.floor(totalSeconds % 60);
			setFormData({
				text: overlay.text || '',
				link: overlay.link || '',
				position: overlay.position || 'position-top-left',
				dynamic_position: !!overlay.dynamic_position,
				reposition_interval: overlay.reposition_interval || 10,
				reposition_animation: overlay.reposition_animation || 'fade',
				backgroundColor: overlay.backgroundColor ?? '',
				textColor: overlay.textColor ?? '',
				duration: overlay.duration || 5,
				hours,
				minutes: mins,
				seconds: secs,
			});
			setCurrentTime(overlay.displayTime);
            if (playerRef) {
				playerRef.currentTime = overlay.displayTime;
				pausePlayer();
			}
		}
	};

	const handleSave = () => {
		if (!hasPro && overlays.length >= 1 && !isEditingOverlay) {
			setIsProModalOpen(true);
			return;
		}

		if (!formData.text.trim()) {
			showNotification({ type: 'error', message: __('Please enter overlay text', 'fluent-player') });
			return;
		}

		const displayTime = formData.hours * 3600 + formData.minutes * 60 + formData.seconds;
		const overlayData = {
			text: formData.text,
			link: formData.link,
			position: formData.position,
			dynamic_position: formData.dynamic_position,
			reposition_interval: formData.dynamic_position ? formData.reposition_interval : undefined,
			reposition_animation: formData.dynamic_position ? formData.reposition_animation : undefined,
			backgroundColor: formData.backgroundColor,
			textColor: formData.textColor,
			duration: formData.duration,
			displayTime: displayTime,
		};

		let updatedOverlays = [...overlays];

		if (isEditingOverlay) {
			updatedOverlays = overlays.map(overlay =>
				overlay.id === activeOverlayId
					? { ...overlay, ...overlayData }
					: overlay
			);
		} else {
			updatedOverlays.push({
				id: Date.now().toString(),
				...overlayData,
			});
		}

		setMediaData({
			...mediaData,
			settings: {
				...mediaData.settings,
				overlays: updatedOverlays,
			}
		});

		showNotification({
			type: 'success',
			message: isEditingOverlay ? __('Overlay updated.', 'fluent-player') : __('Overlay added.', 'fluent-player'),
		});
		onClose();
	};

	const getRemainingDuration = () => {
		const displayTime = formData.hours * 3600 + formData.minutes * 60 + formData.seconds;
		const remaining = Math.floor(duration - displayTime);
		return Math.max(1, remaining);
	};

	const previewOverlay = {
		text: formData.text,
		link: formData.link,
		position: formData.position,
		dynamic_position: formData.dynamic_position,
		reposition_animation: formData.reposition_animation,
		reposition_interval: formData.reposition_interval,
		backgroundColor: formData.backgroundColor,
		textColor: formData.textColor,
		duration: formData.duration,
		displayTime: formData.hours * 3600 + formData.minutes * 60 + formData.seconds,
	};

	const displaySummary = appendSummaryDetail(
		formatAtTimeSummary(formData.hours * 3600 + formData.minutes * 60 + formData.seconds),
		sprintf(
			/* translators: %s: overlay duration */
			__('%s duration', 'fluent-player'),
			formatCompactDurationValue(Math.min(formData.duration, getRemainingDuration()))
		)
	);
	const contentSummary = summarizeOverlayContent({
		text: formData.text,
		link: formData.link,
	});
	const layoutSummary = summarizeOverlayLayout({
		dynamicPosition: formData.dynamic_position,
		positionLabel: getPositionLabel(formData.position),
		repositionInterval: formData.reposition_interval,
		repositionAnimation: formData.reposition_animation,
	}, getPositionLabel('position-top-left'));
	const appearanceSummary = summarizeAppearanceParts([
		__('Background', 'fluent-player'),
		__('Text', 'fluent-player'),
	]);
	const isEditingOverlay = Boolean(activeOverlayId);
	const { openId: openSectionId, toggle: toggleSection } = useAccordionState(
		isEditingOverlay ? 'content' : 'display',
		activeOverlayId || 'new'
	);

	if (isOpen && !hasPro && overlays.length >= 1 && !isEditingOverlay) {
		return (
			<ProModal
				onClose={onClose}
				feature={__('Creating Overlay', 'fluent-player')}
			/>
		);
	}

	if (isOpen && !hasPro && isProModalOpen) {
		return (
			<ProModal
				onClose={() => setIsProModalOpen(false)}
				feature={__('Creating Overlay', 'fluent-player')}
			/>
		);
	}

	if (!isOpen) return null;

    return (
        <Modal
            title={isEditingOverlay ? __('Edit Video Overlay', 'fluent-player') : __('Add Video Overlay', 'fluent-player')}
            onRequestClose={onClose}
			className="fluent-player-block-modal fluent-player-overlay-modal"
        >
			<div className="fluent-player-block-content" style={{ '--media-brand': mediaSettings?.brandingColor || '#DD1F13', height: '100%' }}>
                <div className="fluent-player-form-layout">
                    <div className="fluent-player-preview-section">
                        <div className="fluent-player-preview-player">
                            <FluentPlayer
                                mediaData={mediaSettings}
                                isPresetPreview={true}
                            />
                                <OverlayPreview overlay={previewOverlay} />
                        </div>

                        <VideoTimeSlider
                            currentTime={currentTime}
                            duration={duration}
							items={getOverlayMarkers()}
                            type="overlays"
                            onTimeChange={handleTimeChange}
							onItemEdit={handleOverlayMarkerClick}
                            positionOptions={positionOptions}
                        />
                    </div>

					<div className="fluent-player-settings-section">
						<div className="overlay-form-content" key={activeOverlayId || 'new'}>
							<SettingsSectionCard
								title={__('Display', 'fluent-player')}
								summary={displaySummary}
								isOpen={openSectionId === 'display'}
								onToggle={() => toggleSection('display')}
							>
								<div className="fluent-player-form-row">
									<TimeInput
										hours={formData.hours}
										minutes={formData.minutes}
										seconds={formData.seconds}
										onChange={handleTimeInputChange}
										label={__('Start Time', 'fluent-player')}
										maxHours={Math.max(0, Math.floor(duration / 3600))}
									/>
								</div>

								<div className="fluent-player-form-row">
									<CustomRangeSlider
										label={__('Duration (Seconds)', 'fluent-player')}
										value={Math.min(formData.duration, getRemainingDuration())}
										onChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}
										min={1}
										max={getRemainingDuration()}
										step={1}
										help={__('(Second)', 'fluent-player')}
									/>
								</div>
							</SettingsSectionCard>

							<SettingsSectionCard
								title={__('Content', 'fluent-player')}
								summary={contentSummary}
								isOpen={openSectionId === 'content'}
								onToggle={() => toggleSection('content')}
							>
								<div className="fluent-player-form-row">
									<BaseControl
										label={
											<div className="fp-label-with-inserter">
												<span>{__('Overlay Text', 'fluent-player')} *</span>
												<ShortcodeInserter
													inputRef={textInputRef}
													onInsert={(value) => setFormData(prev => ({ ...prev, text: value }))}
												/>
											</div>
										}
									>
										<textarea
											ref={textInputRef}
											className="components-textarea-control__input"
											value={formData.text}
											onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
											placeholder={__('Enter text...', 'fluent-player')}
											rows={3}
										/>
									</BaseControl>
								</div>

								<div className="fluent-player-form-row">
									<BaseControl label={__('Link URL', 'fluent-player')}>
										<div className="fp-input-with-suffix">
											<input
												ref={linkInputRef}
												type="text"
												className="fp-input-with-suffix__input"
												value={formData.link}
												onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
												placeholder={__('www.example.com', 'fluent-player')}
											/>
											<ShortcodeInserter
												inputRef={linkInputRef}
												onInsert={(value) => setFormData(prev => ({ ...prev, link: value }))}
											/>
										</div>
									</BaseControl>
								</div>
							</SettingsSectionCard>

							<SettingsSectionCard
								title={__('Layout', 'fluent-player')}
								summary={layoutSummary}
								isOpen={openSectionId === 'layout'}
								onToggle={() => toggleSection('layout')}
							>
								<div className="fluent-player-form-row">
									<CustomToggle
										label={__('Dynamic Position', 'fluent-player')}
										help={__('Move overlay to random positions during playback', 'fluent-player')}
										checked={!!formData.dynamic_position}
										onChange={(value) => setFormData(prev => ({ ...prev, dynamic_position: value }))}
									/>
								</div>

								{formData.dynamic_position ? (
									<>
										<div className="fluent-player-form-row">
											<CustomRangeSlider
												label={__('Reposition Interval (Seconds)', 'fluent-player')}
												value={formData.reposition_interval}
												onChange={(value) => setFormData(prev => ({ ...prev, reposition_interval: value }))}
												min={2}
												max={Math.min(300, Math.max(2, Math.floor(duration / 5)))}
												step={1}
												help={__('(Second)', 'fluent-player')}
											/>
										</div>
										<div className="fluent-player-form-row">
											<CustomRadioGroup
												className="fp-inline-radio"
												label={__('Animation', 'fluent-player')}
												options={[
													{ label: __('Slide', 'fluent-player'), value: 'slide' },
													{ label: __('Fade', 'fluent-player'), value: 'fade' },
													{ label: __('Instant', 'fluent-player'), value: 'instant' },
												]}
												selected={formData.reposition_animation || 'fade'}
												onChange={(value) => setFormData(prev => ({ ...prev, reposition_animation: value }))}
											/>
										</div>
									</>
								) : (
									<PositionGrid
										label={__('Position', 'fluent-player')}
										value={formData.position}
										onChange={(value) => setFormData(prev => ({ ...prev, position: value }))}
									/>
								)}
							</SettingsSectionCard>

							<SettingsSectionCard
								title={__('Appearance', 'fluent-player')}
								summary={appearanceSummary}
								isOpen={openSectionId === 'appearance'}
								onToggle={() => toggleSection('appearance')}
							>
								<div className="fluent-player-form-row">
									<div className="fp-color-section">
										<label className="fp-color-section-label components-base-control__label">
											{__('Overlay Color', 'fluent-player')}
										</label>
										<div className="fp-color-trigger-list fp-color-trigger-list--side-by-side">
											<ColorPickerInput
												asTrigger
												label={__('Background', 'fluent-player')}
												value={formData.backgroundColor ?? ''}
												defaultValue="#0E121B"
												onChange={(value) => setFormData(prev => ({ ...prev, backgroundColor: value }))}
											/>
											<ColorPickerInput
												asTrigger
												label={__('Text', 'fluent-player')}
												value={formData.textColor ?? ''}
												defaultValue="#ffffff"
												onChange={(value) => setFormData(prev => ({ ...prev, textColor: value }))}
											/>
										</div>
									</div>
								</div>
							</SettingsSectionCard>
						</div>
					</div>
				</div>

				<div className="form-actions">
					<Button className="fp-btn-secondary" onClick={onClose}>
						{__('Cancel', 'fluent-player')}
					</Button>
					<Button
						className="fp-btn-primary"
						onClick={handleSave}
					>
						{isEditingOverlay ? __('Update Overlay', 'fluent-player') : __('Add Overlay', 'fluent-player')}
					</Button>
                </div>
            </div>
        </Modal>
    );
};

export default OverlayManageModal;
