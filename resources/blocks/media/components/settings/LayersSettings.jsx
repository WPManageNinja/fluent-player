const { __ } = wp.i18n;
const { Button, BaseControl } = wp.components;
const { useState, useEffect } = wp.element;
const { apiFetch } = wp;

import LayersManageModal from "../layers/LayersManageModal.jsx";
import ProModal from "../common/ProModal.jsx";
import { formatTime, getIconByName, getLayerIconKey, getLayerSubType } from "@share/helper.js";
import { EditIconSVG, DeleteIconSVG, PlusIconSVG, TimeIconSVG } from '../common/Icons.jsx';
import CRMInactiveWarning from '../common/CRMInactiveWarning.jsx';
import ConfirmPopover from '../common/ConfirmPopover.jsx';
import useNotification from '../common/useNotification.js';

const LayersSettings = ({ mediaData, setMediaData, requestPath, presets, onVideoModalOpen }) => {
	const { showNotification } = useNotification();
	const hasPro = !!window.fluentPlayerBlockVars?.hasPro;
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingLayer, setEditingLayer] = useState(null);
	const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, anchor: null, layerId: null });
	const [providersMeta, setProvidersMeta] = useState({});
	const [isProModalOpen, setIsProModalOpen] = useState(false);
	const [proFeature, setProFeature] = useState(__('This feature', 'fluent-player'));

	const layers = mediaData?.settings?.layers || [];
	const layersSorted = [...layers].sort((a, b) => (a.displayTime || 0) - (b.displayTime || 0));
	const hasLayers = layers.length > 0;

	const hasInactiveCRMProvider = (layer) => {
		if (window.fluentPlayerBlockVars?.has_fluentcrm) return false;
		if (layer?.type !== 'cta' || layer?.cta_type !== 'email') return false;
		return layer.email_capture?.providers?.some(p => p.enabled && p.type === 'fluentcrm');
	};


	const canUseLayerWithoutPro = (layer) => {
		if (layer?.type === 'form') {
			return true;
		}

		if (layer?.type === 'cta' && layer?.cta_type === 'email') {
			return true;
		}

		return false;
	};

	useEffect(() => {
		if (requestPath) {
			apiFetch({ path: `${requestPath}/email-providers` })
				.then(response => {
					if (response?.providers_meta) {
						setProvidersMeta(response.providers_meta);
					}
				})
				.catch(error => {
					console.error('Failed to fetch providers meta:', error);
				});
		}
	}, [requestPath]);

	const openProModal = (layer) => {
		const feature = getLayerSubType(layer, providersMeta) || layer?.title || __('This feature', 'fluent-player');
		setProFeature(feature);
		setIsProModalOpen(true);
	};

	const openModal = (layer = null) => {
		setEditingLayer(layer);
		setIsModalOpen(true);
		onVideoModalOpen?.();
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setEditingLayer(null);
	};

	const showDeleteConfirm = (event, layerId) => {
		setDeleteConfirm({
			isOpen: true,
			anchor: event.currentTarget,
			layerId,
		});
	};

	const hideDeleteConfirm = () => {
		setDeleteConfirm({ isOpen: false, anchor: null, layerId: null });
	};

	const handleDelete = () => {
		const updatedLayers = layers.filter((layer) => layer.id !== deleteConfirm.layerId);
		setMediaData({
			...mediaData,
			settings: {
				...mediaData.settings,
				layers: updatedLayers,
			},
		});
		showNotification({ type: 'success', message: __('Layer deleted.', 'fluent-player') });
		hideDeleteConfirm();
	};

	return (
		<>
			{isProModalOpen && !hasPro && (
				<ProModal
					onClose={() => setIsProModalOpen(false)}
					feature={proFeature}
				/>
			)}

			<BaseControl>
				{hasLayers && (
					<div className="layers-section">
						{layersSorted.map((layer, index) => (
							<div key={layer.id || index} className="layer-card">
								<div className="layer-info">
									<div className="layer-title-row">
										<div className="layer-type-info">
											<span
												className="layer-icon"
												dangerouslySetInnerHTML={{
													__html: getIconByName(getLayerIconKey(layer)),
												}}
											/>
											<span className="layer-title">{getLayerSubType(layer, providersMeta)}</span>
										</div>
										<div className="layer-time">
											<TimeIconSVG />
											<span>{formatTime(layer.displayTime)}</span>
										</div>
									</div>
									{hasInactiveCRMProvider(layer) && <CRMInactiveWarning hasOtherProviders={layer.email_capture?.providers?.some(p => p.enabled && p.type !== 'fluentcrm')} />}
								</div>
								<div className="layer-actions">
									<Button
										className="fp-btn-secondary layer-edit-btn"
										onClick={() => {
											if (!hasPro && !canUseLayerWithoutPro(layer)) {
												openProModal(layer);
												return;
											}
											openModal(layer);
										}}>
										<EditIconSVG />
										{__('Edit', 'fluent-player')}
									</Button>
									<Button
										className="fp-icon-btn fp-icon-btn--secondary"
										onClick={(e) => {
											if (!hasPro && !canUseLayerWithoutPro(layer)) {
												openProModal(layer);
												return;
											}
											showDeleteConfirm(e, layer.id);
										}}>
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
					{__('Add Layer', 'fluent-player')}
				</Button>
			</BaseControl>

			{isModalOpen && (
				<LayersManageModal
					isOpen={isModalOpen}
					onClose={closeModal}
					mediaData={mediaData}
					setMediaData={setMediaData}
					requestPath={requestPath}
					presets={presets}
					editingLayer={editingLayer}
					setEditingLayer={setEditingLayer}
				/>
			)}

			<ConfirmPopover
				isOpen={deleteConfirm.isOpen}
				anchor={deleteConfirm.anchor}
				title={__('Delete Layer', 'fluent-player')}
				message={__('Are you sure you want to delete this layer? This action cannot be undone.', 'fluent-player')}
				confirmText={__('Delete', 'fluent-player')}
				cancelText={__('Cancel', 'fluent-player')}
				onConfirm={handleDelete}
				onCancel={hideDeleteConfirm}
			/>
		</>
	);
};

export default LayersSettings;
