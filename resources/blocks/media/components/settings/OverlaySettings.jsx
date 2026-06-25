const { __ } = wp.i18n;
const { Button, BaseControl } = wp.components;
const { useState } = wp.element;

import { EditIconSVG, DeleteIconSVG, PlusIconSVG, TimeIconSVG, PinMarkerSVG, LockIconSVG, OverlayIconSVG } from '../common/Icons.jsx';
import ConfirmPopover from '../common/ConfirmPopover.jsx';
import OverlayManageModal from '../overlays/OverlayManageModal.jsx';
import ProModal from '../common/ProModal.jsx';
import useNotification from '../common/useNotification.js';

const formatTime = (seconds) => {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const positionOptions = [
	{ label: __('Top Left', 'fluent-player'), value: 'position-top-left' },
	{ label: __('Top Right', 'fluent-player'), value: 'position-top-right' },
	{ label: __('Bottom Left', 'fluent-player'), value: 'position-bottom-left' },
	{ label: __('Bottom Right', 'fluent-player'), value: 'position-bottom-right' },
];

const OverlaySettings = ({ mediaData, setMediaData, presets, onVideoModalOpen }) => {
	const { showNotification } = useNotification();
	const hasPro = !!window.fluentPlayerBlockVars?.hasPro;
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingOverlay, setEditingOverlay] = useState(null);
	const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, anchor: null, id: null });
	const [isProModalOpen, setIsProModalOpen] = useState(false);

	if (!mediaData) return null;

	if (!hasPro) {
		return (
			<div className="components-base-control">
				<div
					className="layer-card"
					style={{ cursor: 'pointer' }}
					role="button"
					tabIndex={0}
					aria-label={__('Text & Button Overlays — a Pro feature. Upgrade to enable.', 'fluent-player')}
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
								<span className="layer-icon"><OverlayIconSVG /></span>
								<span className="layer-title">{__('Text & Button Overlays', 'fluent-player')}</span>
							</div>
							<LockIconSVG size={14} />
						</div>
					</div>
					<p style={{ margin: 0, fontSize: '13px', color: 'var(--fp-text-sub-600, #525866)' }}>
						{__('Show text and button overlays on your video at specific positions.', 'fluent-player')}
					</p>
				</div>
				{isProModalOpen && (
					<ProModal
						onClose={() => setIsProModalOpen(false)}
						feature={__('Text & Button Overlays', 'fluent-player')}
					/>
				)}
			</div>
		);
	}

	const overlays = mediaData?.settings?.overlays || [];
	const overlaysSorted = [...overlays].sort((a, b) => (a.displayTime || 0) - (b.displayTime || 0));
	const hasOverlays = overlays.length > 0;

	const openModal = (overlay = null) => {
		setEditingOverlay(overlay);
		setIsModalOpen(true);
		onVideoModalOpen?.();
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setEditingOverlay(null);
	};

	const showDeleteConfirm = (event, id) => {
		setDeleteConfirm({
			isOpen: true,
			anchor: event.currentTarget,
			id,
		});
	};

	const hideDeleteConfirm = () => {
		setDeleteConfirm({ isOpen: false, anchor: null, id: null });
	};

	const handleDelete = () => {
		const updatedOverlays = overlays.filter(overlay => overlay.id !== deleteConfirm.id);
		setMediaData({
			...mediaData,
			settings: {
				...mediaData.settings,
				overlays: updatedOverlays,
			},
		});
		showNotification({ type: 'success', message: __('Overlay deleted.', 'fluent-player') });
		hideDeleteConfirm();
	};

	const getPositionLabel = (positionValue) => {
		return positionOptions.find(option => option.value === positionValue)?.label || positionValue;
	};

	return (
		<>
			<BaseControl>
				{hasOverlays && (
					<div className="overlays-section">
						{overlaysSorted.map((overlay) => (
							<div key={overlay.id} className="overlay-card">
								<div className="overlay-info">
									<div className="overlay-title-row">
										<span className="overlay-title">{overlay.text || __('Untitled Overlay', 'fluent-player')}</span>
										<div className="overlay-time">
											<TimeIconSVG />
											<span>{formatTime(overlay.displayTime)}</span>
										</div>
									</div>
									<div className="overlay-position-row">
										<PinMarkerSVG />
										<span>{overlay.dynamic_position ? __('Dynamic', 'fluent-player') : getPositionLabel(overlay.position)}</span>
									</div>
								</div>
								<div className="overlay-actions">
									<Button
										className="fp-btn-secondary overlay-edit-btn"
										onClick={() => openModal(overlay)}>
										<EditIconSVG />
										{__('Edit', 'fluent-player')}
									</Button>
									<Button
										className="fp-icon-btn fp-icon-btn--secondary"
										aria-label={__('Delete overlay', 'fluent-player')}
										onClick={(e) => showDeleteConfirm(e, overlay.id)}>
										<DeleteIconSVG />
									</Button>
								</div>
							</div>
						))}
					</div>
				)}

				<Button
					className="components-button fp-btn-secondary w-100"
					onClick={() => openModal()}>
					<PlusIconSVG />
					{__('Add Overlay', 'fluent-player')}
				</Button>
			</BaseControl>

			{isModalOpen && (
				<OverlayManageModal
					isOpen={isModalOpen}
					onClose={closeModal}
					mediaData={mediaData}
					setMediaData={setMediaData}
					presets={presets}
					editingOverlay={editingOverlay}
					positionOptions={positionOptions}
				/>
			)}

			<ConfirmPopover
				isOpen={deleteConfirm.isOpen}
				anchor={deleteConfirm.anchor}
				title={__('Delete Overlay', 'fluent-player')}
				message={__('Are you sure you want to delete this overlay? This action cannot be undone.', 'fluent-player')}
				confirmText={__('Delete', 'fluent-player')}
				cancelText={__('Cancel', 'fluent-player')}
				onConfirm={handleDelete}
				onCancel={hideDeleteConfirm}
			/>
		</>
	);
};

export default OverlaySettings;
