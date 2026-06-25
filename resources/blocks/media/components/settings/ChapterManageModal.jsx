const { __ } = wp.i18n;
const { Modal, Button, TextControl } = wp.components;
const { useState, useEffect, useRef } = wp.element;

import FluentPlayer from '../player/FluentPlayer.jsx';
import VideoTimeSlider from '../common/VideoTimeSlider.jsx';
import TimeInput from '../common/TimeInput.jsx';
import { BackArrowSVG } from '../common/Icons.jsx';
import useNotification from '../common/useNotification.js';

const ChapterManageModal = ({
	isOpen,
	onClose,
	mediaData,
	setMediaData,
	presets,
	editingChapter: initialEditingChapter
}) => {
	const { showNotification } = useNotification();
	const [currentTime, setCurrentTime] = useState(0);
	const [playerRef, setPlayerRef] = useState(null);
	const [duration, setDuration] = useState(mediaData?.settings?.duration || 0);
	const [mediaSettings, setMediaSettings] = useState({});
	const [formData, setFormData] = useState({
		title: '',
		hours: 0,
		minutes: 0,
		seconds: 0,
	});
	const [isEditing, setIsEditing] = useState(false);
	const [editingIndex, setEditingIndex] = useState(null);
	const isTimeInputChangeRef = useRef(false);

	const chapters = mediaData?.settings?.chapters || [];

	useEffect(() => {
		if (initialEditingChapter) {
			setIsEditing(true);
			setEditingIndex(initialEditingChapter.index);
			const totalSeconds = Math.floor(initialEditingChapter.startTime);
			const hours = Math.floor(totalSeconds / 3600);
			const mins = Math.floor((totalSeconds % 3600) / 60);
			const secs = Math.floor(totalSeconds % 60);
			setFormData({
				title: initialEditingChapter.title || '',
				hours,
				minutes: mins,
				seconds: secs,
			});
			setCurrentTime(initialEditingChapter.startTime);
			if (playerRef) {
				playerRef.currentTime = initialEditingChapter.startTime;
				playerRef.pause();
			}
		} else {
			let startTime = 0;
			if (chapters.length > 0) {
				startTime = chapters[chapters.length - 1].endTime;
			}
			const totalSeconds = Math.floor(startTime);
			const hours = Math.floor(totalSeconds / 3600);
			const mins = Math.floor((totalSeconds % 3600) / 60);
			const secs = Math.floor(totalSeconds % 60);
			setFormData({
				title: '',
				hours,
				minutes: mins,
				seconds: secs,
			});
			setCurrentTime(startTime);
		}
	}, [initialEditingChapter, playerRef]);

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
			const playerElement = document.querySelector('.fluent-player-chapter-modal media-player');
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

	// Only sync Start Time when user seeks (slider or video progress), not while playing
	useEffect(() => {
		if (!playerRef) return;
		const syncTimeFromPlayer = () => {
			// Skip sync if the seek was triggered by time input change
			if (isTimeInputChangeRef.current) {
				isTimeInputChangeRef.current = false;
				return;
			}
			const time = playerRef.currentTime;
			if (time == null || Number.isNaN(time)) return;
			const t = Math.floor(Number(time));
			setCurrentTime(t);
			const hours = Math.floor(t / 3600);
			const mins = Math.floor((t % 3600) / 60);
			const secs = Math.floor(t % 60);
			setFormData(prev => (prev.hours === hours && prev.minutes === mins && prev.seconds === secs ? prev : { ...prev, hours, minutes: mins, seconds: secs }));
		};
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
			isTimeInputChangeRef.current = true;
			playerRef.currentTime = newTime;
		}
	};

	const getChapterMarkers = () => {
		return chapters.map((chapter, index) => ({
			id: `chapter-${index}`,
			displayTime: chapter.startTime,
			type: 'chapter',
			title: chapter.title,
		}));
	};

	const handleChapterMarkerClick = (item) => {
		const index = parseInt(item.id.replace('chapter-', ''));
		const chapter = chapters[index];
		if (chapter) {
			setIsEditing(true);
			setEditingIndex(index);
			const totalSeconds = Math.floor(chapter.startTime);
			const hours = Math.floor(totalSeconds / 3600);
			const mins = Math.floor((totalSeconds % 3600) / 60);
			const secs = Math.floor(totalSeconds % 60);
			setFormData({
				title: chapter.title,
				hours,
				minutes: mins,
				seconds: secs,
			});
			setCurrentTime(chapter.startTime);
			if (playerRef) {
				playerRef.currentTime = chapter.startTime;
				playerRef.pause();
			}
		}
	};

	const handleAddChapter = () => {
		if (!formData.title.trim()) {
			showNotification({ type: 'error', message: __('Please enter a chapter title', 'fluent-player') });
			return;
		}

		const startTime = formData.hours * 3600 + formData.minutes * 60 + formData.seconds;
		let endTime = duration;

		const sortedChapters = [...chapters].sort((a, b) => a.startTime - b.startTime);
		for (const chapter of sortedChapters) {
			if (chapter.startTime > startTime) {
				endTime = chapter.startTime;
				break;
			}
		}

		let updatedChapters = [...chapters];

		if (isEditing && editingIndex !== null) {
			updatedChapters[editingIndex] = {
				...updatedChapters[editingIndex],
				title: formData.title,
				startTime: startTime,
				endTime: endTime,
			};

			if (editingIndex < updatedChapters.length - 1) {
				for (let i = editingIndex + 1; i < updatedChapters.length; i++) {
					if (i === editingIndex + 1) {
						const timeDifference = updatedChapters[i].endTime - updatedChapters[i].startTime;
						updatedChapters[i] = {
							...updatedChapters[i],
							startTime: updatedChapters[editingIndex].endTime,
							endTime: updatedChapters[editingIndex].endTime + timeDifference
						};
					} else {
						const timeDifference = updatedChapters[i].endTime - updatedChapters[i].startTime;
						updatedChapters[i] = {
							...updatedChapters[i],
							startTime: updatedChapters[i - 1].endTime,
							endTime: updatedChapters[i - 1].endTime + timeDifference
						};
					}
				}
			}
		} else {
			updatedChapters.push({
				title: formData.title,
				startTime: startTime,
				endTime: endTime,
			});
		}

		updatedChapters.sort((a, b) => a.startTime - b.startTime);

		for (let i = 0; i < updatedChapters.length - 1; i++) {
			updatedChapters[i].endTime = updatedChapters[i + 1].startTime;
		}
		if (updatedChapters.length > 0) {
			updatedChapters[updatedChapters.length - 1].endTime = duration;
		}

		setMediaData({
			...mediaData,
			settings: {
				...mediaData.settings,
				chapters: updatedChapters,
			}
		});

		showNotification({
			type: 'success',
			message: isEditing ? __('Chapter updated.', 'fluent-player') : __('Chapter added.', 'fluent-player'),
		});
		onClose();
	};

	const canAddChapter = formData.title.trim() !== '';

	if (!isOpen) return null;

	return (
		<Modal
			title={(initialEditingChapter || isEditing) ? __('Edit Chapter', 'fluent-player') : __('Add Chapter', 'fluent-player')}
			onRequestClose={onClose}
			className="fluent-player-block-modal fluent-player-chapter-modal"
		>
			<div className="fluent-player-block-content" style={{ '--media-brand': mediaSettings?.brandingColor || '#DD1F13' }}>
				<div className="fluent-player-form-layout">
					<div className="fluent-player-preview-section">
						<div className="fluent-player-preview-player">
							<FluentPlayer
								mediaData={mediaSettings}
								isPresetPreview={true}
							/>
						</div>

						<VideoTimeSlider
							currentTime={currentTime}
							duration={duration}
							items={getChapterMarkers()}
							type="chapters"
							onTimeChange={handleTimeChange}
							onItemEdit={handleChapterMarkerClick}
						/>
					</div>

					<div className="fluent-player-settings-section">
						<div className="chapter-form-content">
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
								<TextControl
									label={__('Chapter Title', 'fluent-player') + ' *'}
									value={formData.title}
									onChange={(value) => setFormData(prev => ({ ...prev, title: value }))}
									placeholder={__('Enter Title...', 'fluent-player')}
								/>
							</div>
						</div>
					</div>
				</div>

				<div className="form-actions">
					<Button className="fp-btn-secondary" onClick={onClose}>
						{__('Cancel', 'fluent-player')}
					</Button>
					<Button
						className="fp-btn-primary"
						onClick={handleAddChapter}
					>
						{isEditing ? __('Update Chapter', 'fluent-player') : __('Add Chapter', 'fluent-player')}
					</Button>
				</div>
			</div>
		</Modal>
	);
};

export default ChapterManageModal;
