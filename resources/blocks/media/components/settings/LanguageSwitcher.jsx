const { __ } = wp.i18n;
const { Button, SelectControl, BaseControl } = wp.components;
const { useState, useEffect } = wp.element;

import { EditIconSVG, DeleteIconSVG, PlusIconSVG, CloseIconSVG } from '../common/Icons.jsx';
import CustomToggle from '../common/CustomToggle.jsx';
import ConfirmPopover from '../common/ConfirmPopover.jsx';

const DEFAULT_LANGUAGE = 'en_US';

const LanguageSwitcher = ({ mediaData, setMediaData }) => {
	const [availableMedia, setAvailableMedia] = useState([]);
	const [loading, setLoading] = useState(false);
	const [isAddingNew, setIsAddingNew] = useState(false);
	const [editingIndex, setEditingIndex] = useState(null);
	const [newMapping, setNewMapping] = useState({ language: DEFAULT_LANGUAGE, media_id: '' });
	const [editMapping, setEditMapping] = useState({ language: DEFAULT_LANGUAGE, media_id: '' });
	const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, anchor: null, index: null });

	if (!mediaData) return null;

	const getLanguageOptions = () => {
		const blockVars = window.fluentPlayerBlockVars || {};
		const languages = blockVars.languages || {};
		return Object.entries(languages).map(([code, name]) => ({
			label: name,
			value: code
		}));
	};

	const getLanguageName = (code) => {
		const options = getLanguageOptions();
		const match = options.find(opt => opt.value === code);
		return match?.label || code;
	};

	const getMediaName = (mediaId) => {
		const media = availableMedia.find(m => m.value == mediaId);
		return media?.label || mediaId;
	};

	const fetchAvailableMedia = () => {
		setLoading(true);
		try {
			const blockVars = window.fluentPlayerBlockVars || {};
			if (blockVars.mediaItems && Object.keys(blockVars.mediaItems).length > 0) {
				const mediaOptions = Object.values(blockVars.mediaItems).map(item => ({
					label: item.label,
					value: item.value
				}));
				setAvailableMedia(mediaOptions);
			} else {
				setAvailableMedia([]);
			}
		} catch (error) {
			setAvailableMedia([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAvailableMedia();
	}, []);

	const languageMappings = mediaData.settings.language_mappings || [];
	const showLanguageSwitcher = mediaData.settings.show_language_switcher || false;

	const updateMediaSettings = (key, value) => {
		const newSettings = { ...mediaData.settings, [key]: value };
		setMediaData({ ...mediaData, settings: newSettings });
	};

	const addLanguageMapping = () => {
		if (!newMapping.media_id) return;
		
		const mapping = {
			...newMapping,
			id: Date.now()
		};

		const updatedMappings = [...languageMappings, mapping];
		updateMediaSettings('language_mappings', updatedMappings);
		setNewMapping({ language: DEFAULT_LANGUAGE, media_id: '' });
		setIsAddingNew(false);
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
		const updatedMappings = languageMappings.filter((_, i) => i !== deleteConfirm.index);
		updateMediaSettings('language_mappings', updatedMappings);
		hideDeleteConfirm();
	};

	const openEditMapping = (index) => {
		const mapping = languageMappings[index];
		setEditMapping({ language: mapping.language, media_id: mapping.media_id });
		setEditingIndex(index);
		setIsAddingNew(false);
	};

	const saveEditMapping = () => {
		if (!editMapping.media_id || editingIndex === null) return;
		
		const updatedMappings = [...languageMappings];
		updatedMappings[editingIndex] = {
			...updatedMappings[editingIndex],
			language: editMapping.language,
			media_id: editMapping.media_id
		};
		updateMediaSettings('language_mappings', updatedMappings);
		setEditMapping({ language: DEFAULT_LANGUAGE, media_id: '' });
		setEditingIndex(null);
	};

	const cancelEdit = () => {
		setEditMapping({ language: DEFAULT_LANGUAGE, media_id: '' });
		setEditingIndex(null);
	};

	const cancelAddNew = () => {
		setNewMapping({ language: DEFAULT_LANGUAGE, media_id: '' });
		setIsAddingNew(false);
	};

	const openAddNew = () => {
		setIsAddingNew(true);
		setEditingIndex(null);
	};

	return (
		<>
			<BaseControl>
				<div className="fluent-player-form-row">
					<SelectControl
						label={__('Primary Language', 'fluent-player')}
						value={mediaData.settings.language || DEFAULT_LANGUAGE}
						options={getLanguageOptions()}
						onChange={(value) => updateMediaSettings('language', value)}
					/>
				</div>

				<div className="fluent-player-form-row">
					<CustomToggle
						label={__('Enable Multi-Language', 'fluent-player')}
						checked={showLanguageSwitcher}
						onChange={(value) => updateMediaSettings('show_language_switcher', value)}
						help={__('Add a language selector in the player controls for viewers to switch languages.', 'fluent-player')}
					/>
				</div>

				{showLanguageSwitcher && (
					<>
						<div className="content-divider"></div>

						<div className="language-section-header">
							<span className="language-section-title">{__('Additional Languages', 'fluent-player')}</span>
						</div>

						{languageMappings.length > 0 && (
							<div className="languages-section">
								{languageMappings.map((mapping, index) => (
									<div key={mapping.id || index}>
										{editingIndex === index ? (
											<div className="language-add-form">
												<div className="fluent-player-form-row">
													<SelectControl
														label={__('Language', 'fluent-player')}
														value={editMapping.language}
														options={getLanguageOptions()}
														onChange={(value) => setEditMapping(prev => ({ ...prev, language: value }))}
													/>
												</div>

												<div className="fluent-player-form-row">
													<SelectControl
														label={__('Video', 'fluent-player')}
														value={editMapping.media_id}
														options={[
															{ label: __('Select video...', 'fluent-player'), value: '' },
															...availableMedia
														]}
														onChange={(value) => setEditMapping(prev => ({ ...prev, media_id: value }))}
														disabled={loading}
													/>
												</div>

												<div className="language-add-actions">
													<Button
														className="fp-btn-primary"
														onClick={saveEditMapping}
														disabled={!editMapping.media_id}>
														{__('Update', 'fluent-player')}
													</Button>
													<Button
														className="fp-icon-btn fp-icon-btn--secondary"
														aria-label={__('Cancel', 'fluent-player')}
														onClick={cancelEdit}>
														<CloseIconSVG />
													</Button>
												</div>
											</div>
										) : (
											<div className="language-card">
												<div className="fp-card-body">
													<div className="language-title-wrap fp-card-title-wrap">
														<span className="language-name fp-card-title">{getLanguageName(mapping.language)}</span>
													</div>
													<div className="language-meta fp-card-meta">
														<span className="language-video fp-card-meta-item">{getMediaName(mapping.media_id)}</span>
													</div>
												</div>
												<div className="language-actions fp-card-actions">
													<Button
														className="fp-icon-btn language-edit-btn fp-card-edit-btn"
														aria-label={__('Edit language', 'fluent-player')}
														onClick={() => openEditMapping(index)}>
														<EditIconSVG />
													</Button>
													<Button
														className="fp-icon-btn language-delete-btn fp-card-delete-btn"
														aria-label={__('Delete language', 'fluent-player')}
														onClick={(e) => showDeleteConfirm(e, index)}>
														<DeleteIconSVG />
													</Button>
												</div>
											</div>
										)}
									</div>
								))}
							</div>
						)}

						{isAddingNew && (
							<div className="language-add-form">
								<div className="fluent-player-form-row">
									<SelectControl
										label={__('Language', 'fluent-player')}
										value={newMapping.language}
										options={getLanguageOptions()}
										onChange={(value) => setNewMapping(prev => ({ ...prev, language: value }))}
									/>
								</div>

								<div className="fluent-player-form-row">
									<SelectControl
										label={__('Video', 'fluent-player')}
										value={newMapping.media_id}
										options={[
											{ label: __('Select video...', 'fluent-player'), value: '' },
											...availableMedia
										]}
										onChange={(value) => setNewMapping(prev => ({ ...prev, media_id: value }))}
										disabled={loading}
									/>
								</div>

								<div className="language-add-actions">
									<Button
										className="fp-btn-primary"
										onClick={addLanguageMapping}
										disabled={!newMapping.media_id}>
										{__('Add', 'fluent-player')}
									</Button>
									<Button
										className="fp-icon-btn fp-icon-btn--secondary"
										aria-label={__('Cancel', 'fluent-player')}
										onClick={cancelAddNew}>
										<CloseIconSVG />
									</Button>
								</div>
							</div>
						)}

						{!isAddingNew && (
							<Button
								className="components-button components-button fp-btn-secondary w-100 add-language-btn"
								onClick={openAddNew}>
								<PlusIconSVG />
								{__('Add New', 'fluent-player')}
							</Button>
						)}
					</>
				)}
			</BaseControl>

			<ConfirmPopover
				isOpen={deleteConfirm.isOpen}
				anchor={deleteConfirm.anchor}
				title={__('Delete Language', 'fluent-player')}
				message={__('Are you sure you want to delete this language mapping? This action cannot be undone.', 'fluent-player')}
				confirmText={__('Delete', 'fluent-player')}
				cancelText={__('Cancel', 'fluent-player')}
				onConfirm={handleDelete}
				onCancel={hideDeleteConfirm}
			/>
		</>
	);
};

export default LanguageSwitcher;
