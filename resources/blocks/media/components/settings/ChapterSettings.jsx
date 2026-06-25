const { __ } = wp.i18n;
const { Button, BaseControl } = wp.components;
const { useState } = wp.element;

import { EditIconSVG, DeleteIconSVG, PlusIconSVG, TimeIconSVG, StopwatchIconSVG } from '../common/Icons.jsx';
import ConfirmPopover from '../common/ConfirmPopover.jsx';
import ChapterManageModal from './ChapterManageModal.jsx';
import useNotification from '../common/useNotification.js';

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

const ChapterSettings = ({ mediaData, setMediaData, presets, onVideoModalOpen }) => {
	const { showNotification } = useNotification();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingChapter, setEditingChapter] = useState(null);
	const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, anchor: null, index: null });

	if (!mediaData) return null;

	const chapters = mediaData?.settings?.chapters || [];
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
				{hasChapters && (
					<div className="chapters-section">
						{chaptersSorted.map((chapter, index) => {
							const originalIndex = chapters.indexOf(chapter);
							return (
							<div key={`chapter-${index}-${chapter.startTime}`} className="chapter-card">
								<div className="chapter-info">
									<div className="chapter-title-row">
										<span className="chapter-title">{chapter.title}</span>
										<div className="chapter-start-time">
											<TimeIconSVG />
											<span>{formatTime(chapter.startTime)}</span>
										</div>
									</div>
									<div className="chapter-duration-row">
										<StopwatchIconSVG />
										<span>{formatDuration(chapter.startTime, chapter.endTime)}</span>
									</div>
								</div>
								<div className="chapter-actions">
									<Button
										className="fp-btn-secondary chapter-edit-btn"
										onClick={() => openModal({ ...chapter, index: originalIndex })}>
										<EditIconSVG />
										{__('Edit', 'fluent-player')}
									</Button>
									<Button
										className="fp-icon-btn fp-icon-btn--secondary"
										onClick={(e) => showDeleteConfirm(e, originalIndex)}>
										<DeleteIconSVG />
									</Button>
								</div>
							</div>
							);
						})}
					</div>
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
