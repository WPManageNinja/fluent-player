const { __, sprintf } = wp.i18n;
const { Button, Notice, Spinner, SelectControl, BaseControl, CheckboxControl } = wp.components;
const { MediaUpload } = wp.blockEditor || wp.editor;
const { useState, useRef } = wp.element;
const { apiFetch } = wp;

import { EditIconSVG, DeleteIconSVG, UploadIconSVG, DownloadIconSVG, ClearIconSVG, SubtitleIconSVG, LockIconSVG } from '../common/Icons.jsx';
import ConfirmPopover from '../common/ConfirmPopover.jsx';
import ShowTipsMessage from '../common/ShowTipsMessage.jsx';
import { useNotification } from '../common/useNotification.js';
import { LANGUAGE_OPTIONS } from './subtitles/constants.js';
import {
	getLanguageLabel,
	getHoverPreviewStatus,
	getRequestedMediaState,
	hasStoryboardThumbnails,
	isMatchingRequestedMediaState
} from './subtitles/utils.js';
import { useMediaDataSync } from './subtitles/useMediaDataSync.js';
import { useStoryboard } from './subtitles/useStoryboard.js';
import ProModal from '../common/ProModal.jsx';
import { useSubtitleUpload } from './subtitles/useSubtitleUpload.js';
import { useYouTubeCaptions } from './subtitles/useYouTubeCaptions.js';

const SubtitleSettings = ({ mediaData, setMediaData, setPersistedMediaData = null, saveMediaToServer = null }) => {
	const [editingSubtitleKey, setEditingSubtitleKey] = useState('');
	const [editData, setEditData] = useState({ language: 'en', label: '' });
	const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, anchor: null, subtitleId: null });
	const [isProModalOpen, setIsProModalOpen] = useState(false);
	const deleteRequestRef = useRef(0);
	const { showNotification } = useNotification();

	const getSubtitleEditKey = (subtitle, index) => {
		if (subtitle?.id) {
			return `id:${subtitle.id}`;
		}

		const legacyFingerprint = [
			subtitle?.attachment_id || '',
			subtitle?.track_id || subtitle?.trackId || '',
			subtitle?.url || '',
			subtitle?.filename || '',
			subtitle?.language || '',
			subtitle?.label || '',
		].join('|');

		if (legacyFingerprint !== '|||||') {
			return `legacy:${legacyFingerprint}`;
		}

		return `legacy:${index}`;
	};

	const resetEditState = () => {
		setEditingSubtitleKey('');
		setEditData({ language: 'en', label: '' });
	};

	const isProActive = window.fluentPlayerBlockVars?.hasPro || false;
	const subtitleApi = window.fluentPlayerBlockVars?.subtitleApi || {};
	const parsedMaxTrackSelection = parseInt(subtitleApi.maxTrackSelection, 10);
	const maxTrackSelection = Number.isFinite(parsedMaxTrackSelection) && parsedMaxTrackSelection > 0
		? parsedMaxTrackSelection
		: 10;

	const isYouTubeProvider = mediaData?.settings?.provider === 'youtube';
	const hasSubtitleUploadApi = !!subtitleApi.upload;
	const hasSubtitleDeleteApi = !!subtitleApi.delete;
	const hasYouTubeSubtitleApi = !!subtitleApi.youtubeImport;
	const hasYouTubeStoryboardApi = !!subtitleApi.youtubeStoryboard;
	const hasSubtitleApiMismatch = !hasSubtitleUploadApi || !hasSubtitleDeleteApi || (isYouTubeProvider && !hasYouTubeSubtitleApi);

	const getYouTubeTrackLabel = (track) => {
		const baseLabel = track?.label || track?.languageCode || __('Unknown', 'fluent-player');

		if (track?.isAuto) {
			return sprintf(__('%s (Auto-generated)', 'fluent-player'), baseLabel);
		}

		return baseLabel;
	};

	const {
		latestMediaDataRef,
		latestMediaStateRef,
		applyEditorMediaData,
		syncLatestMediaData,
	} = useMediaDataSync({
		mediaData,
		setMediaData,
		setPersistedMediaData,
	});

	const persistMediaForSubtitleActions = async () => {
		const currentMediaData = latestMediaDataRef.current || mediaData;
		if (!currentMediaData?.ID || !saveMediaToServer) {
			return currentMediaData;
		}

		const persistedMedia = await saveMediaToServer(null, { silent: true });
		if (!persistedMedia) {
			showNotification({
				type: 'error',
				message: __('Failed to save media before running subtitle actions. Please try again.', 'fluent-player')
			});
			return null;
		}

		syncLatestMediaData(persistedMedia);

		return persistedMedia;
	};

	const {
		isGeneratingHoverPreview,
		hoverPreviewNotice,
		setHoverPreviewNotice,
		handleGenerateStoryboard,
		handleRefreshHoverPreviewStatus,
	} = useStoryboard({
		mediaData,
		isYouTubeProvider,
		hasYouTubeStoryboardApi,
		latestMediaDataRef,
		latestMediaStateRef,
		syncLatestMediaData,
		persistMediaForSubtitleActions,
		showNotification,
	});

	const {
		isFetchingCaptions,
		availableTracks,
		selectedTracks,
		isImporting,
		maxSelectableTrackCount,
		resetTrackSelection,
		handleFetchCaptions,
		handleImportCaptions,
		toggleTrack,
		toggleAllTracks,
	} = useYouTubeCaptions({
		mediaData,
		isYouTubeProvider,
		hasYouTubeSubtitleApi,
		maxTrackSelection,
		latestMediaDataRef,
		syncLatestMediaData,
		persistMediaForSubtitleActions,
		showNotification,
	});

	const handleFetchYouTubeCaptions = async () => {
		await handleFetchCaptions();
	};

	const handleImportSelectedCaptions = async () => {
		await handleImportCaptions({
			generateStoryboard: false,
		});
	};

	const {
		isUploading,
		handleSubtitleUpload,
	} = useSubtitleUpload({
		mediaData,
		hasSubtitleUploadApi,
		latestMediaDataRef,
		syncLatestMediaData,
		showNotification,
	});

	if (!mediaData) return null;

	const subtitles = mediaData.settings.subtitles || [];
	const hasExistingHoverPreview = hasStoryboardThumbnails(mediaData?.settings);
	const hoverPreviewStatus = getHoverPreviewStatus(mediaData?.settings);
	const isHoverPreviewPending = isGeneratingHoverPreview
		|| hoverPreviewStatus === 'queued'
		|| hoverPreviewStatus === 'processing';
	const hoverPreviewSectionHelpText = hasExistingHoverPreview
		? __('A hover preview is already available for this video. Generate again to replace it with a fresh storyboard.', 'fluent-player')
		: __('Generate hover previews for this YouTube video independently from subtitle import.', 'fluent-player');

	if (!isProActive) {
		return (
			<div className="components-base-control">
				<div
					className="layer-card"
					style={{ cursor: 'pointer' }}
					role="button"
					tabIndex={0}
					aria-label={__('Subtitle Support — a Pro feature. Upgrade to enable.', 'fluent-player')}
					onClick={() => setIsProModalOpen(true)}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							setIsProModalOpen(true);
						}
					}}
				>
					<div className="layer-info">
						<div className="layer-title-row">
							<div className="layer-type-info">
								<span className="layer-icon"><SubtitleIconSVG /></span>
								<span className="layer-title">{__('Subtitle Support', 'fluent-player')}</span>
							</div>
							<LockIconSVG size={14} />
						</div>
					</div>
					<p style={{ margin: 0, fontSize: '13px', color: 'var(--fp-text-sub-600, #525866)' }}>
						{__('Enhance accessibility with WebVTT subtitle support.', 'fluent-player')}
					</p>
				</div>
				{isProModalOpen && (
					<ProModal
						onClose={() => setIsProModalOpen(false)}
						feature={__('Subtitles', 'fluent-player')}
					/>
				)}
			</div>
		);
	}

	const openEdit = (subtitle, index) => {
		setEditData({ language: subtitle.language, label: subtitle.label });
		setEditingSubtitleKey(getSubtitleEditKey(subtitle, index));
	};

	const saveEdit = () => {
		if (!editingSubtitleKey) return;

		const currentMediaData = latestMediaDataRef.current || mediaData;
		const hasTargetSubtitle = (currentMediaData.settings?.subtitles || []).some((subtitle, index) => (
			getSubtitleEditKey(subtitle, index) === editingSubtitleKey
		));
		if (!hasTargetSubtitle) {
			showNotification({ type: 'error', message: __('The selected subtitle could not be found. Please try again.', 'fluent-player') });
			resetEditState();
			return;
		}

		const updatedSubtitles = (currentMediaData.settings?.subtitles || []).map((subtitle, index) => (
			getSubtitleEditKey(subtitle, index) === editingSubtitleKey
				? {
					...subtitle,
					language: editData.language,
					label: editData.label || getLanguageLabel(editData.language)
				}
				: subtitle
		));

		applyEditorMediaData({
			...currentMediaData,
			settings: {
				...currentMediaData.settings,
				subtitles: updatedSubtitles
			}
		});

		resetEditState();
	};

	const cancelEdit = () => {
		resetEditState();
	};

	const showDeleteConfirm = (event, subtitleId) => {
		setDeleteConfirm({ isOpen: true, anchor: event.currentTarget, subtitleId });
	};

	const hideDeleteConfirm = () => {
		setDeleteConfirm({ isOpen: false, anchor: null, subtitleId: null });
	};

	const handleDelete = async () => {
		if (!deleteConfirm.subtitleId) return;

		if (!hasSubtitleDeleteApi) {
			showNotification({ type: 'error', message: __('Update FluentPlayer Pro to remove subtitles in the editor.', 'fluent-player') });
			hideDeleteConfirm();
			return;
		}

		const latestDeleteMediaData = latestMediaDataRef.current || mediaData;
		const subtitle = (latestDeleteMediaData.settings?.subtitles || []).find((item) => item?.id === deleteConfirm.subtitleId);
		if (!subtitle?.id) {
			showNotification({ type: 'error', message: __('The selected subtitle could not be found. Please try again.', 'fluent-player') });
			hideDeleteConfirm();
			return;
		}

		const deleteRequestId = ++deleteRequestRef.current;
		const requestedMediaState = getRequestedMediaState(latestDeleteMediaData);

		try {
			await apiFetch({
				path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/media/${latestDeleteMediaData.ID}/subtitles/${subtitle.id}`,
				method: 'DELETE'
			});

			if (!isMatchingRequestedMediaState(requestedMediaState, latestMediaDataRef, deleteRequestRef, deleteRequestId)) {
				return;
			}

			const latestDeletedMediaData = latestMediaDataRef.current || latestDeleteMediaData;
			const updatedSubtitles = (latestDeletedMediaData.settings?.subtitles || []).filter((item) => item?.id !== subtitle.id);
			syncLatestMediaData({
				...latestDeletedMediaData,
				settings: {
					...latestDeletedMediaData.settings,
					subtitles: updatedSubtitles
				}
			});
			showNotification({ type: 'success', message: __('Subtitle removed successfully!', 'fluent-player') });
		} catch (err) {
			if (!isMatchingRequestedMediaState(requestedMediaState, latestMediaDataRef, deleteRequestRef, deleteRequestId)) {
				return;
			}

			showNotification({ type: 'error', message: err?.message || __('Error removing subtitle', 'fluent-player') });
		}

		hideDeleteConfirm();
	};

	return (
		<>
			<BaseControl label={__('Add Subtitle', 'fluent-player')}>
				<p className="subtitle-description">
					{__('Upload .vtt or .srt subtitle files for your video', 'fluent-player')}
				</p>

				{hasSubtitleApiMismatch && (
					<Notice status="warning" isDismissible={false}>
						<p>{__('Your FluentPlayer Pro addon is missing the subtitle editor endpoints required by this free-plugin update.', 'fluent-player')}</p>
						<p>{__('Update the addon before using subtitle upload, delete, or YouTube import actions in this editor.', 'fluent-player')}</p>
					</Notice>
				)}

				{isYouTubeProvider && (
					<ShowTipsMessage
						className="fluent-player-yt-import"
						title={__('YouTube Subtitle Import', 'fluent-player')}
						description={__('Admin-only import for YouTube captions and hover previews; use it only for content you are allowed to import, and review your privacy notice and hosting or processor terms before enabling it on a live site.', 'fluent-player')}
					/>
				)}

				<div className="subtitle-buttons-row">
					<MediaUpload
						onSelect={handleSubtitleUpload}
						allowedTypes={['text/vtt', 'application/x-subrip', 'text/srt', 'text/plain']}
						multiple={false}
						value={null}
						render={({ open }) => (
							<Button
								className="components-button fp-btn-secondary add-subtitle-btn"
								onClick={open}
								disabled={isUploading || !hasSubtitleUploadApi}
							>
								{isUploading ? <Spinner /> : <UploadIconSVG />}
								{isUploading ? __('Uploading...', 'fluent-player') : __('Upload', 'fluent-player')}
							</Button>
						)}
					/>
					{isYouTubeProvider && (
						<Button
							className="components-button fp-btn-secondary add-subtitle-btn"
							onClick={handleFetchYouTubeCaptions}
							disabled={isFetchingCaptions || isImporting || isGeneratingHoverPreview || !hasYouTubeSubtitleApi}
						>
							{isFetchingCaptions ? <Spinner /> : <DownloadIconSVG />}
							{isFetchingCaptions ? __('Fetching...', 'fluent-player') : __('Fetch', 'fluent-player')}
						</Button>
					)}
				</div>

				{isYouTubeProvider && availableTracks !== null && availableTracks.length === 0 && (
					<Notice status="warning" isDismissible={false}>
						{__('No subtitles available for this video.', 'fluent-player')}
					</Notice>
				)}

				{isYouTubeProvider && availableTracks !== null && availableTracks.length > 0 && (
					<div className="fluent-player-yt-tracks">
						<div className="fluent-player-yt-tracks__header">
							<CheckboxControl
								className="fluent-player-yt-tracks__checkbox fluent-player-yt-tracks__checkbox--select-all"
								label={sprintf(__('Select All (max %d)', 'fluent-player'), maxTrackSelection)}
								checked={selectedTracks.length === maxSelectableTrackCount && maxSelectableTrackCount > 0}
								onChange={toggleAllTracks}
							/>
							<Button
								className="fp-icon-btn fp-icon-btn--secondary fp-icon-btn--sm fp-icon-btn--close"
								aria-label={__('Close', 'fluent-player')}
								onClick={resetTrackSelection}
							>
								<ClearIconSVG />
							</Button>
						</div>
						{availableTracks.length > maxTrackSelection && (
							<p className="fluent-player-yt-tracks__help">
								{sprintf(
									__('To keep imports reliable, you can select up to %d subtitle tracks at once.', 'fluent-player'),
									maxTrackSelection
								)}
							</p>
						)}
						<div className="fluent-player-yt-tracks__list">
							{availableTracks.map((track) => (
								<CheckboxControl
									key={track.trackId}
									className="fluent-player-yt-tracks__checkbox"
									label={getYouTubeTrackLabel(track)}
									checked={selectedTracks.includes(track.trackId)}
									disabled={isImporting || (!selectedTracks.includes(track.trackId) && selectedTracks.length >= maxTrackSelection)}
									onChange={() => toggleTrack(track.trackId)}
								/>
							))}
						</div>
						<Button
							className="components-button fp-btn-primary w-100"
							onClick={handleImportSelectedCaptions}
							disabled={isImporting || isGeneratingHoverPreview || selectedTracks.length === 0 || !hasYouTubeSubtitleApi}
						>
							{isImporting ? <Spinner /> : null}
							{isImporting
								? __('Importing...', 'fluent-player')
								: sprintf(__('Import Selected (%d)', 'fluent-player'), selectedTracks.length)}
						</Button>
					</div>
				)}

				{isYouTubeProvider && hasYouTubeStoryboardApi && (
					<div className="fluent-player-yt-storyboard">
						<ShowTipsMessage
							className="fluent-player-yt-storyboard__intro"
							title={__('Hover Preview', 'fluent-player')}
							description={hoverPreviewSectionHelpText}
						/>
						{!isHoverPreviewPending ? (
							<Button
								className="components-button fp-btn-secondary"
								onClick={() => handleGenerateStoryboard()}
								disabled={isFetchingCaptions || isImporting}
							>
								{hasExistingHoverPreview
									? __('Regenerate Hover Preview', 'fluent-player')
									: __('Generate Hover Preview', 'fluent-player')}
							</Button>
						) : null}
					</div>
				)}

				{isYouTubeProvider && hoverPreviewNotice && (
					<div
						className={`components-notice is-${hoverPreviewNotice.status || 'info'} fluent-player-yt-tracks__notice`}
						role="status"
					>
						<div className="components-notice__content">
							<p className="fluent-player-yt-tracks__status">
								{isGeneratingHoverPreview ? <Spinner /> : null}
								<span>{hoverPreviewNotice.message}</span>
							</p>
							{!isGeneratingHoverPreview && hoverPreviewNotice.canRefresh ? (
								<Button
									className="fp-btn-secondary"
									onClick={handleRefreshHoverPreviewStatus}
								>
									{__('Refresh status', 'fluent-player')}
								</Button>
							) : null}
						</div>
					</div>
				)}

					{subtitles.length > 0 && (
						<>
							<div className="content-divider"></div>

							<div className="subtitles-section">
								{subtitles.map((subtitle, index) => (
									<div key={subtitle.id || index}>
										{editingSubtitleKey !== '' && editingSubtitleKey === getSubtitleEditKey(subtitle, index) ? (
											<div className="subtitle-edit-form">
												<div className="fluent-player-form-row">
													<SelectControl
														label={__('Language', 'fluent-player')}
													value={editData.language}
													options={LANGUAGE_OPTIONS}
													onChange={(value) => setEditData((prev) => ({
														...prev,
														language: value,
														label: getLanguageLabel(value)
													}))}
												/>
											</div>

											<div className="subtitle-edit-actions">
												<Button
													className="fp-btn-primary"
													onClick={saveEdit}>
													{__('Update', 'fluent-player')}
												</Button>
													<Button
														className="fp-btn-secondary"
														onClick={cancelEdit}>
														{__('Cancel', 'fluent-player')}
													</Button>
												</div>
											</div>
										) : (
											<div className="subtitle-card">
												<div className="fp-card-body">
													<div className="subtitle-title-wrap fp-card-title-wrap">
														<span className="subtitle-name fp-card-title">{subtitle.label || getLanguageLabel(subtitle.language)}</span>
													</div>
													<div className="subtitle-meta fp-card-meta">
														<span className="subtitle-filename fp-card-meta-item">{subtitle.filename}</span>
													</div>
												</div>
												<div className="subtitle-actions fp-card-actions">
													<Button
														className="fp-icon-btn subtitle-edit-btn fp-card-edit-btn"
														aria-label={__('Edit subtitle', 'fluent-player')}
														onClick={() => openEdit(subtitle, index)}>
														<EditIconSVG />
													</Button>
													<Button
														className="fp-icon-btn subtitle-delete-btn fp-card-delete-btn"
														aria-label={__('Delete subtitle', 'fluent-player')}
														onClick={(event) => showDeleteConfirm(event, subtitle.id)}
														disabled={!hasSubtitleDeleteApi || !subtitle?.id}>
														<DeleteIconSVG />
													</Button>
												</div>
											</div>
										)}
									</div>
								))}
							</div>
						</>
					)}
			</BaseControl>

			<ConfirmPopover
				isOpen={deleteConfirm.isOpen}
				anchor={deleteConfirm.anchor}
				title={__('Delete Subtitle', 'fluent-player')}
				message={__('Are you sure you want to delete this subtitle? This action cannot be undone.', 'fluent-player')}
				confirmText={__('Delete', 'fluent-player')}
				cancelText={__('Cancel', 'fluent-player')}
				onConfirm={handleDelete}
				onCancel={hideDeleteConfirm}
			/>
		</>
	);
};

export default SubtitleSettings;
