import { formatTime } from "@share/helper.js";

const { __ } = wp.i18n;
const { Button, Icon } = wp.components;
const { useState, useImperativeHandle, forwardRef, useRef } = wp.element;

import { BackArrowSmallSVG } from '../common/Icons.jsx';
import LayerItem from "./LayerItem.jsx";
import LayerTypeSelector from "./LayerTypeSelector.jsx";
import FormLayerSettings from "./FormLayerSettings.jsx";
import EmailLayerSettings from "./EmailLayerSettings.jsx";
import CTALayerSettings from "./CTALayerSettings.jsx";
import AdLayerSettings from "./AdLayerSettings.jsx";
import HotspotLayerSettings from "./HotspotLayerSettings.jsx";
import ShortcodeLayerSettings from "./ShortcodeLayerSettings.jsx";

/**
 * Dynamic Layers Sidebar Component
 */
const LayersSidebar = forwardRef(
	(
		{
			view,
			layers,
			currentTime,
			canAddLayer,
			selectedLayerType,
			editingLayer,
			requestPath,
			onAddLayerClick,
			onLayerTypeSelect,
			onLayerEdit,
			onLayerRemove,
			onLayerUpdate,
			onAddLayer,
			onBack,
			onClose,
			activeTab,
			setActiveTab,
			setPreviewLayer,
			onTimeChange,
		},
		ref,
	) => {
		const [animationClass, setAnimationClass] = useState("");
		const settingsComponentRef = useRef(null);

		useImperativeHandle(ref, () => ({
			handleAdd: () => {
				if (
					settingsComponentRef.current &&
					settingsComponentRef.current.handleAdd
				) {
					settingsComponentRef.current.handleAdd();
				}
			},
		}));

		// Handle view transitions with animation
		const handleViewChange = (callback) => {
			setAnimationClass("slide-out");
			setTimeout(() => {
				callback();
				setAnimationClass("slide-in");
				setTimeout(() => setAnimationClass(""), 300);
			}, 150);
		};

		// Render layer type selector view
		const renderAddLayerView = () => (
			<div className={`sidebar-content ${animationClass}`}>
				<div className="sidebar-header">
					<div className="sidebar-header-title">
						<Button
							size="small"
							variant="tertiary"
							onClick={(e) => {
								e.currentTarget.blur();
								if (onClose) {
									onClose();
								} else {
									handleViewChange(onBack);
								}
							}}
							className="back-button fp-icon-btn">
							<BackArrowSmallSVG />
						</Button>
						<h3>{__("Choose Layer Type", "fluent-player")}</h3>
					</div>
					<p>
						{__(
							"Add a FluentPlayer media to your content.",
							"fluent-player",
						)}
					</p>
				</div>

				<LayerTypeSelector
					activeTab={activeTab}
					setActiveTab={setActiveTab}
					onSelect={(layerType) =>
						handleViewChange(() => onLayerTypeSelect(layerType))
					}
				/>
			</div>
		);

		// Render layer settings view
		const renderLayerSettingsView = () => {
			let SettingsComponent, title, type, layerData;

			if (editingLayer) {
				// Editing existing layer
				title = __("Edit Layer", "fluent-player");
				type = editingLayer.type;
				layerData = editingLayer;
			} else if (selectedLayerType) {
				// Adding new layer
				title =
					selectedLayerType.title || __("Add Layer", "fluent-player");
				type = selectedLayerType.type;
				layerData = selectedLayerType;
			}

			switch (type) {
				case "form":
					SettingsComponent = FormLayerSettings;
					break;
				case "cta":
					if (layerData.cta_type === "email") {
						SettingsComponent = EmailLayerSettings;
						break;
					}
					SettingsComponent = CTALayerSettings;
					break;
				case "hotspot":
					SettingsComponent = HotspotLayerSettings;
					break;
				case "ad":
					SettingsComponent = AdLayerSettings;
					break;
				case "shortcode":
					SettingsComponent = ShortcodeLayerSettings;
					break;
				default:
					SettingsComponent = CTALayerSettings;
			}

			return (
				<div className={`sidebar-content ${animationClass}`}>
					<div className="sidebar-header">
						<div className="sidebar-header-title">
							<Button
								size="small"
								variant="tertiary"
								onClick={(e) => {
									e.currentTarget.blur();
									handleViewChange(onBack);
								}}
								className="back-button fp-icon-btn">
								<BackArrowSmallSVG />
							</Button>
							<h3>{title}</h3>
						</div>
						<p className="time-info">
							{__("Layer will appear at", "fluent-player")}{" "}
							{formatTime(
								editingLayer
									? editingLayer.displayTime
									: currentTime,
							)}
						</p>
					</div>

					{SettingsComponent && (
						<SettingsComponent
							key={editingLayer?.id || `${type || 'layer'}-new`}
							ref={settingsComponentRef}
							onAdd={onAddLayer}
							onCancel={onBack}
							currentTime={currentTime}
							requestPath={requestPath}
							editingLayer={editingLayer}
							selectedLayerType={selectedLayerType}
							onUpdate={onLayerUpdate}
							setPreviewLayer={setPreviewLayer}
							formType={selectedLayerType?.formType || ""}
							onTimeChange={onTimeChange}
						/>
					)}
				</div>
			);
		};

		// Render based on current view
		switch (view) {
			case "add-layer":
				return renderAddLayerView();
			case "layer-settings":
				return renderLayerSettingsView();
			default:
				return renderAddLayerView();
		}
	},
);

export default LayersSidebar;
