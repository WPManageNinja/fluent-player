const { __, _n, sprintf } = wp.i18n;
const { Button, BaseControl, SelectControl } = wp.components;
const { useState } = wp.element;

import { EditIconSVG, DeleteIconSVG, PlusIconSVG, TimeIconSVG, StopwatchIconSVG, DownloadIconSVG, LockIconSVG } from '../common/Icons.jsx';
import ProModal from '../common/ProModal.jsx';
import ConfirmPopover from '../common/ConfirmPopover.jsx';
import ChapterManageModal from './ChapterManageModal.jsx';
import useNotification from '../common/useNotification.js';
import { readVimeoChapters } from './subtitles/vimeoChapters.js';

const formatTime = (seconds) => {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDuration = (startTime, endTime) => {
	const duration = endTime - startTime;
	const mins = Math.floor(duration / 60);
	const secs = Math.floor(duration % 60);
	return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const ChapterSettings = ({ mediaData, setMediaData, presets, onVideoModalOpen, playerRef }) => {
	const { showNotification } = useNotification();
	const hasPro = !!window.fluentPlayerBlockVars?.hasPro;
	const [isDisplayProModalOpen, setIsDisplayProModalOpen] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingChapter, setEditingChapter] = useState(null);
	const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, anchor: null, index: null });

	if (!mediaData) return null;

	const isVimeoProvider = mediaData?.settings?.provider === 'vimeo';
	const chapters = mediaData?.settings?.chapters || [];

	// Vimeo ships chapters; Vidstack loads them into the preview player's chapters track.
	const handleImportVimeoChapters = () => {
		const imported = readVimeoChapters(playerRef?.current);
		if (!imported.length) {
			showNotification({
				type: 'warning',
				message: __('No chapters found on this Vimeo video yet. Start the preview so chapters load, then try again.', 'fluent-player'),
			});
			return;
		}
		setMediaData({
			...mediaData,
			settings: { ...mediaData.settings, chapters: imported },
		});
		showNotification({
			type: 'success',
			message: sprintf(
				/* translators: %d: number of chapters. */
				_n('Imported %d chapter from Vimeo.', 'Imported %d chapters from Vimeo.', imported.length, 'fluent-player'),
				imported.length
			),
		});
	};
	const chaptersSorted = [...chapters].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
	const hasChapters = chapters.length > 0;

	const openModal = (chapter = null) => {
		setEditingChapter(chapter);
		setIsModalOpen(true);
		onVideoModalOpen?.();
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setEditingChapter(null);
	};

	const showDeleteConfirm = (event, index) => {
		setDeleteConfirm({
			isOpen: true,
			anchor: event.currentTarget,
			index,
		});
	};

	const hideDeleteConfirm = () => {
		setDeleteConfirm({ isOpen: false, anchor: null, index: null });
	};

	const handleDelete = () => {
		const updatedChapters = [...chapters];
		updatedChapters.splice(deleteConfirm.index, 1);

		if (deleteConfirm.index < updatedChapters.length) {
			const previousEndTime = deleteConfirm.index > 0 ? updatedChapters[deleteConfirm.index - 1].endTime : 0;

			for (let i = deleteConfirm.index; i < updatedChapters.length; i++) {
				const timeDifference = updatedChapters[i].endTime - updatedChapters[i].startTime;

				if (i === deleteConfirm.index) {
					updatedChapters[i] = {
						...updatedChapters[i],
						startTime: previousEndTime,
						endTime: previousEndTime + timeDifference
					};
				} else {
					updatedChapters[i] = {
						...updatedChapters[i],
						startTime: updatedChapters[i - 1].endTime,
						endTime: updatedChapters[i - 1].endTime + timeDifference
					};
				}
			}
		}

		setMediaData({
			...mediaData,
			settings: {
				...mediaData.settings,
				chapters: updatedChapters,
			},
		});
		showNotification({ type: 'success', message: __('Chapter deleted.', 'fluent-player') });
		hideDeleteConfirm();
	};

	return (
		<>
			<BaseControl>
				{hasChapters && hasPro && (
					<SelectControl
						label={__('Chapters display', 'fluent-player')}
						help={__('Show chapters as the built-in menu button, or as an inline scrolling list below the player.', 'fluent-player')}
						value={mediaData?.settings?.chaptersDisplay || 'menu'}
						options={[
							{ label: __('Menu button (default)', 'fluent-player'), value: 'menu' },
							{ label: __('Inline scroll', 'fluent-player'), value: 'strip' },
						]}
						onChange={(value) =>
							setMediaData({
								...mediaData,
								settings: { ...mediaData.settings, chaptersDisplay: value },
							})
						}
					/>
				)}
				{hasChapters && !hasPro && (
					<div className="components-base-control">
						<div
							className="layer-card"
							style={{ cursor: 'pointer' }}
							role="button"
							tabIndex={0}
							aria-label={__('Chapters display — a Pro feature. Upgrade to enable.', 'fluent-player')}
							onClick={() => setIsDisplayProModalOpen(true)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									setIsDisplayProModalOpen(true);
								}
							}}
						>
							<div className="layer-info">
								<div className="layer-title-row">
									<div className="layer-type-info">
										<span className="layer-title">{__('Chapters display', 'fluent-player')}</span>
									</div>
									<LockIconSVG size={14} />
								</div>
							</div>
							<p style={{ margin: 0, fontSize: '13px', color: 'var(--fp-text-sub-600, #525866)' }}>
								{__('Show chapters as an inline scrolling list below the player.', 'fluent-player')}
							</p>
						</div>
						{isDisplayProModalOpen && (
							<ProModal
								onClose={() => setIsDisplayProModalOpen(false)}
								feature={__('Chapters display', 'fluent-player')}
							/>
						)}
					</div>
				)}
				{hasChapters && (
					<div className="chapters-section">
						{chaptersSorted.map((chapter, index) => {
							const originalIndex = chapters.indexOf(chapter);
							return (
							<div key={`chapter-${index}-${chapter.startTime}`} className="chapter-card">
								<div className="fp-card-body">
									<div className="chapter-title-wrap fp-card-title-wrap">
										<span className="chapter-title fp-card-title">{chapter.title}</span>
									</div>
									<div className="chapter-meta fp-card-meta">
										<span className="chapter-start-time fp-card-meta-item">
											<TimeIconSVG />
											<span>{formatTime(chapter.startTime)}</span>
										</span>
										<span className="chapter-duration fp-card-meta-item">
											<StopwatchIconSVG />
											<span>{formatDuration(chapter.startTime, chapter.endTime)}</span>
										</span>
									</div>
								</div>
								<div className="chapter-actions fp-card-actions">
									<Button
										className="fp-icon-btn chapter-edit-btn fp-card-edit-btn"
										aria-label={__('Edit chapter', 'fluent-player')}
										onClick={() => openModal({ ...chapter, index: originalIndex })}>
										<EditIconSVG />
									</Button>
									<Button
										className="fp-icon-btn chapter-delete-btn fp-card-delete-btn"
										aria-label={__('Delete chapter', 'fluent-player')}
										onClick={(e) => showDeleteConfirm(e, originalIndex)}>
										<DeleteIconSVG />
									</Button>
								</div>
							</div>
							);
						})}
					</div>
				)}

				{isVimeoProvider && (
					<Button
						className="components-button fp-btn-secondary import-vimeo-chapters-btn w-100"
						style={{ marginBottom: '8px' }}
						onClick={handleImportVimeoChapters}>
						<DownloadIconSVG />
						{__('Import from Vimeo', 'fluent-player')}
					</Button>
				)}

				<Button
					className="components-button fp-btn-secondary add-chapter-btn w-100"
					onClick={() => openModal()}>
					<PlusIconSVG />
					{__('Add Chapter', 'fluent-player')}
				</Button>
			</BaseControl>

			{isModalOpen && (
				<ChapterManageModal
					isOpen={isModalOpen}
					onClose={closeModal}
					mediaData={mediaData}
					setMediaData={setMediaData}
					presets={presets}
					editingChapter={editingChapter}
				/>
			)}

			<ConfirmPopover
				isOpen={deleteConfirm.isOpen}
				anchor={deleteConfirm.anchor}
				title={__('Delete Chapter', 'fluent-player')}
				message={__('Are you sure you want to delete this chapter? This action cannot be undone.', 'fluent-player')}
				confirmText={__('Delete', 'fluent-player')}
				cancelText={__('Cancel', 'fluent-player')}
				onConfirm={handleDelete}
				onCancel={hideDeleteConfirm}
			/>
		</>
	);
};

export default ChapterSettings;
