const {__} = wp.i18n;
const {Modal, Button} = wp.components;
const {useState, useEffect, useRef} = wp.element;

import FluentPlayer from '../player/FluentPlayer.jsx';
import LayersSidebar from './LayersSidebar.jsx';
import VideoTimeSlider from '../common/VideoTimeSlider.jsx';
import './LayersStyles.scss';
import LayerPreview from './LayerPreview.jsx';
import useNotification from '../common/useNotification.js';
import ProModal from '../common/ProModal.jsx';

/**
 * Layers Management Modal Component
 * Main modal for managing all video layers
 */
const LayersManageModal = ({
    isOpen,
    onClose,
    mediaData,
    setMediaData,
    presets,
    requestPath,
    editingLayer: initialEditingLayer
}) => {
    const { showNotification } = useNotification();
    const hasPro = !!window.fluentPlayerBlockVars?.hasPro;
    const [currentTime, setCurrentTime] = useState(0);
    const [sidebarView, setSidebarView] = useState('layers');
    const [selectedLayerType, setSelectedLayerType] = useState(null);
    const [editingLayer, setEditingLayer] = useState(null);
    const [playerRef, setPlayerRef] = useState(null);
    const [duration, setDuration] = useState(0);
    const [mediaSettings, setMediaSettings] = useState({});
    const [activeTab, setActiveTab] = useState('all');
    const [previewLayer, setPreviewLayer] = useState(null);
    const [isProModalOpen, setIsProModalOpen] = useState(false);
    const [proFeature, setProFeature] = useState(__('This feature', 'fluent-player'));
    const layerSettingsRef = useRef(null);
    
    const layers = mediaData?.settings?.layers || [];

    const canUseLayerWithoutPro = (layer) => {
        if (layer?.type === 'form') {
            return true;
        }

        if (layer?.type === 'cta' && layer?.cta_type === 'email') {
            return true;
        }

        return false;
    };

    const getProFeature = (layer) => {
        if (layer?.title) {
            return layer.title;
        }

        if (layer?.type === 'cta' && layer?.cta_type === 'email') {
            return __('Email Capture', 'fluent-player');
        }

        if (layer?.type === 'cta') {
            return __('CTA', 'fluent-player');
        }

        if (layer?.type === 'hotspot') {
            return __('Hotspot', 'fluent-player');
        }

        if (layer?.type === 'ad') {
            return __('Ad', 'fluent-player');
        }

        if (layer?.type === 'shortcode') {
            return __('Shortcode', 'fluent-player');
        }

        return __('This feature', 'fluent-player');
    };

    const openProModal = (featureLayer) => {
        setProFeature(getProFeature(featureLayer));
        setPlayerRef(null);
        setIsProModalOpen(true);
    };

    // Handle initial editing layer from props
    useEffect(() => {
        if (initialEditingLayer) {
            if (!hasPro && !canUseLayerWithoutPro(initialEditingLayer)) {
                openProModal(initialEditingLayer);
                return;
            }
            setEditingLayer(initialEditingLayer);
            setSidebarView('layer-settings');
            const layerTime = initialEditingLayer.displayTime || 0;
            setCurrentTime(layerTime);
            if (playerRef) {
                playerRef.currentTime = layerTime;
                playerRef.pause();
            }
        }
    }, [initialEditingLayer, playerRef, hasPro]);

    // Update layers in media data
    const updateLayers = (newLayers) => {
        setMediaData({
            ...mediaData,
            settings: {
                ...mediaData.settings,
                layers: newLayers
            }
        });
    };

    // Add new layer (success notification shown from each layer settings component)
    const addLayer = (layerData) => {
        if (layerData.id) {
            updateLayer(layerData.id, layerData);
            onClose();
            return;
        }

        const newLayer = {
            id: Date.now().toString(),
            displayTime: currentTime,
            ...layerData
        };
        
        updateLayers([...layers, newLayer]);
        reSetSidebarView();
        onClose();
    };

    // Handle add/update layer button click from form actions
    const handleFormActionAdd = () => {
        if (layerSettingsRef.current && layerSettingsRef.current.handleAdd) {
            layerSettingsRef.current.handleAdd();
        }
    };

    // Update existing layer
    const updateLayer = (layerId, updates) => {
        const updatedLayers = layers.map(layer =>
            layer.id === layerId ? { ...layer, ...updates } : layer
        );
        updateLayers(updatedLayers);
        reSetSidebarView();
    };

    // Clear preview layer when navigating away from layer settings
    useEffect(() => {
        if (sidebarView !== 'layer-settings') {
            setPreviewLayer(null);
        }
    }, [sidebarView]);

    const reSetSidebarView = () => {
        setSidebarView('layers');
        setEditingLayer(null);
        setSelectedLayerType(null);
        setPreviewLayer(null)
    };

    // Remove layer
    const removeLayer = (layerId) => {
        const layer = layers.find(l => l.id === layerId);
        if (!hasPro && !canUseLayerWithoutPro(layer)) {
            openProModal(layer);
            return;
        }
        const filteredLayers = layers.filter(layer => layer.id !== layerId);
        updateLayers(filteredLayers);
        showNotification({ type: 'success', message: __('Layer deleted.', 'fluent-player') });
        reSetSidebarView();
    };

    const canAddLayer = currentTime > 0 && !layers.find(layer => layer.displayTime === currentTime);

    const pausePlayer = () => {
        if (!playerRef || typeof playerRef.pause !== 'function') {
            return;
        }
        if (!document.contains(playerRef)) {
            return;
        }

        if (playerRef.readyState !== undefined && playerRef.readyState < 2) {
            return;
        }

        playerRef.pause();
    };

    // Handle layer type selection
    const handleLayerTypeSelect = (layerType) => {
        if (layerType.disabled) {
            return;
        }
        if (!hasPro && !canUseLayerWithoutPro(layerType)) {
            openProModal(layerType);
            return;
        }
        if (playerRef && document.contains(playerRef)) {
            pausePlayer();
            setCurrentTime(Math.floor(playerRef.currentTime || 0));
        }
        setSelectedLayerType(layerType);
        setSidebarView('layer-settings');
    };

    // Handle layer edit
    const handleLayerEdit = (layer) => {
        if (!hasPro && !canUseLayerWithoutPro(layer)) {
            openProModal(layer);
            return;
        }
        setEditingLayer(layer);
        setSidebarView('layer-settings');
        const layerTime = layer.displayTime || 0;
        setCurrentTime(layerTime);
        if (playerRef) {
            playerRef.currentTime = layerTime;
            pausePlayer();
        }
    };

    // Handle back navigation
    const handleBack = () => {
        if (sidebarView === 'layer-settings') {
            setSidebarView(selectedLayerType ? 'add-layer' : 'layers');
            if (!selectedLayerType) {
                setEditingLayer(null);
            }
        } else if (sidebarView === 'add-layer') {
            setSidebarView('layers');
            setSelectedLayerType(null);
        }
    };

    // Only sync current time when user seeks (slider or video progress), not while playing
    useEffect(() => {
        if (!playerRef) return;
        const syncTimeFromPlayer = () => {
            const time = playerRef.currentTime;
            if (time != null && !Number.isNaN(time)) {
                setCurrentTime(Math.floor(Number(time)));
            }
        };
        playerRef.addEventListener('seeked', syncTimeFromPlayer);
        return () => {
            playerRef.removeEventListener('seeked', syncTimeFromPlayer);
        };
    }, [playerRef, sidebarView]);

    // Set player time when editing layer is set and player is ready
    useEffect(() => {
        if (playerRef && editingLayer && editingLayer.displayTime !== undefined) {
            const layerTime = editingLayer.displayTime || 0;
            
            const setPlayerTime = () => {
                if (playerRef) {
                    playerRef.currentTime = layerTime;
                    setCurrentTime(layerTime);
                    playerRef.pause();
                }
            };

            if (playerRef.readyState >= 2) {
                setPlayerTime();
            } else {
                const handleCanPlay = () => {
                    setPlayerTime();
                    if (playerRef) {
                        playerRef.removeEventListener('canplay', handleCanPlay);
                    }
                };
                playerRef.addEventListener('canplay', handleCanPlay);
                
                return () => {
                    if (playerRef) {
                        playerRef.removeEventListener('canplay', handleCanPlay);
                    }
                };
            }
        }
    }, [playerRef, editingLayer]);

    // Pause player when navigating away from layers view
    useEffect(() => {
        if (playerRef && sidebarView !== 'layers') {
            const listener = () => {
                playerRef.pause();
                playerRef.removeEventListener('play', listener);
            };
            playerRef.addEventListener('play', listener);
        }
    }, [playerRef, sidebarView]);

    // Add effect to get preset settings
    useEffect(() => {
        let setting = {...mediaData.settings};
        if (presets.length) {
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

    // Update the time change handler
    const handleTimeChange = (time) => {
        setCurrentTime(Math.floor(time));
        if (playerRef && document.contains(playerRef)) {
            playerRef.currentTime = time;
        }
    };

    // Update the pause player function
    // Update the add layer click handler
    const handleAddLayerClick = () => {
        pausePlayer();
        setSidebarView('add-layer');
    };

    // Single polling for player element and duration when modal is open; clear when found or on unmount
    useEffect(() => {
        if (!isOpen || isProModalOpen) return;
        let interval = setInterval(() => {
            const playerElement = document.querySelector('.fluent-player-preview-player media-player');
            if (playerElement) {
                setPlayerRef(playerElement);
                if (playerElement.duration) {
                    setDuration(playerElement.duration);
                    if (editingLayer && editingLayer.displayTime != null) {
                        playerElement.currentTime = editingLayer.displayTime;
                        playerElement.pause();
                        setCurrentTime(editingLayer.displayTime);
                    }
                    clearInterval(interval);
                }
            }
        }, 50);
        return () => clearInterval(interval);
    }, [isOpen, isProModalOpen, editingLayer?.displayTime]);

    if (isOpen && !hasPro && isProModalOpen) {
        return (
            <ProModal
                onClose={() => setIsProModalOpen(false)}
                feature={proFeature}
            />
        );
    }

    if (!isOpen) return null;

    return (
        <Modal
            title={(initialEditingLayer || editingLayer) ? __('Edit Layer', 'fluent-player') : __('Manage Layers', 'fluent-player')}
            onRequestClose={onClose}
            className="fluent-player-block-modal"
        >
            <div className="fluent-player-block-content" style={{'--media-brand': mediaSettings?.brandingColor || '#DD1F13'}}>
                    <div className="fluent-player-form-layout">
                        {/* Left Side - Preview */}
                        <div className="fluent-player-preview-section">
                            <div className={`fluent-player-preview-player ${previewLayer && previewLayer.type ? 'fluent-player-preview-layer' : ''}`}>
                                <FluentPlayer
                                    mediaData={mediaSettings}
                                    isPresetPreview={true}
                                />
                                {previewLayer && previewLayer.type && <LayerPreview layer={previewLayer} requestPath={requestPath}/>}
                            </div>
                            
                            <VideoTimeSlider
                                currentTime={currentTime}
                                duration={duration}
                                items={layers}
                                type="layers"
                                onTimeChange={handleTimeChange}
                                onItemEdit={handleLayerEdit}
                            />
                        </div>

                        {/* Right Side - Dynamic Sidebar */}
                        <div className="fluent-player-settings-section">
                            <LayersSidebar
                                ref={layerSettingsRef}
                                view={sidebarView}
                                layers={layers}
                                currentTime={currentTime}
                                canAddLayer={canAddLayer}
                                selectedLayerType={selectedLayerType}
                                editingLayer={editingLayer}
                                requestPath={requestPath}
                                onAddLayerClick={handleAddLayerClick}
                                onLayerTypeSelect={handleLayerTypeSelect}
                                onLayerEdit={handleLayerEdit}
                                onLayerRemove={removeLayer}
                                onLayerUpdate={updateLayer}
                                onAddLayer={addLayer}
                                onBack={handleBack}
                                onClose={onClose}
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                setPreviewLayer={setPreviewLayer}
                                onTimeChange={handleTimeChange}
                            />
                        </div>
                    </div>
                    {/* Form Actions - Generic for all layer types */}
                    {sidebarView === 'layer-settings' && (
                            <div className="form-actions">
                                <Button className="fp-btn-secondary" onClick={onClose}>
                                    {__('Cancel', 'fluent-player')}
                                </Button>
                                <Button className="fp-btn-primary" onClick={handleFormActionAdd}>
                                    {editingLayer ? __('Update Layer', 'fluent-player') : __('Add Layer', 'fluent-player')}
                                </Button>
                            </div>
                        )}
                </div>
        </Modal>
    );
};

export default LayersManageModal;