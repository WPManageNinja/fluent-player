const { useState, useEffect, useCallback, useMemo } = wp.element;
const { __ } = wp.i18n;
const { Button } = wp.components;
const apiFetch = wp.apiFetch;
import ConfirmPopover from './common/ConfirmPopover.jsx';
import Skeleton from './common/Skeleton.jsx';
import useNotification from './common/useNotification.js';
import { BackArrowSmallSVG, UploadIconSVG, SearchIconSVG, EditIconSVG, DeleteIconSVG, CloseIconSVG } from './common/Icons.jsx';

const MuxProvider = ({
    attributes,
    setAttributes,
    mediaData,
    setMediaData,
    onCancel,
    defaultSettings,
    setSelectedMedia,
    saveMediaToServer
}) => {
    const { showNotification, updateNotification, hideNotification } = useNotification();
    const [assets, setAssets] = useState([]);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const pollIntervalRef = wp.element.useRef(null);

    // Edit modal state
    const [assetToEdit, setAssetToEdit] = useState(null);
    const [editAssetTitle, setEditAssetTitle] = useState('');

    // Delete popover state
    const [assetToDelete, setAssetToDelete] = useState(null);
    const [deleteConfirmAnchor, setDeleteConfirmAnchor] = useState(null);

    const blockVars = window.fluentPlayerBlockVars || {};
    const apiRequestPath = `${blockVars.rest?.namespace}/${blockVars.rest?.version}`;

    // Filter assets client-side based on search query
    const filteredAssets = useMemo(() => {
        if (!searchQuery.trim()) return assets;

        const query = searchQuery.toLowerCase().trim();
        return assets.filter(asset => {
            const id = (asset.id || '').toLowerCase();
            const passthrough = (asset.passthrough || '').toLowerCase();
            return id.includes(query) || passthrough.includes(query);
        });
    }, [assets, searchQuery]);

    const fetchAssets = useCallback(async (page = 1, append = false) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
            });

            const response = await apiFetch({
                path: `${apiRequestPath}/mux/assets?${params.toString()}`,
            });

            const items = response?.items || [];
            setAssets(prev => append ? [...prev, ...items] : items);
            setHasMore(items.length >= 20);
            setCurrentPage(page);
        } catch (err) {
            showNotification({
                type: 'error',
                message: err?.message || __('Failed to load Mux assets', 'fluent-player'),
                duration: 5000,
                position: 'top-right'
            });
        } finally {
            setIsLoading(false);
        }
    }, [apiRequestPath, showNotification]);

    useEffect(() => {
        fetchAssets(1);
    }, [fetchAssets]);

    // Clean up polling on unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    const getAssetTitle = (asset) => {
        return asset.meta?.title || asset.passthrough || asset.id?.substring(0, 20) || __('Untitled', 'fluent-player');
    };

    const applyMuxSelection = useCallback((asset) => {
        const playbackId = asset.public_playback_id || '';
        const signedOnly = asset.playback_policy === 'signed' && asset.has_public_playback !== true;

        setSelectedAsset(asset);

        const assetTitle = getAssetTitle(asset);
        const videoSrc = asset.playback_url || `https://stream.mux.com/${playbackId}.m3u8`;
        const posterSrc = asset.thumbnail_url || `https://image.mux.com/${playbackId}/thumbnail.jpg`;
        const defaultPresetSlug = window.fluentPlayerBlockVars?.defaultPreset?.slug ||
                                  defaultSettings?.defaultPresetSlug ||
                                  defaultSettings?.preset_slug ||
                                  'course';

        const muxSettings = {
            asset_id: asset.id || '',
            playback_id: playbackId,
            thumbnail: posterSrc,
            duration: asset.duration || 0,
            status: asset.status || 'ready',
        };

        // Signed-only: persist policy; Pro filterPlayerSettings signs stream/poster on load (no client JWT).
        if (signedOnly) {
            muxSettings.playback_policy = 'signed';
            muxSettings.playback_token = '';
        } else {
            muxSettings.playback_policy = 'public';
            muxSettings.playback_token = '';
        }

        const updatedMediaData = {
            title: assetTitle,
            settings: {
                provider: 'mux',
                src: videoSrc,
                posterSrc: posterSrc,
                title: assetTitle,
                post_status: 'publish',
                viewType: 'video',
                playsInline: true,
                mutedAutoplay: false,
                autoplay: false,
                loadStrategy: 'visible',
                aspectRatio: 'default',
                save_play_position: false,
                preset_slug: defaultPresetSlug,
                mux: muxSettings,
                streamType: 'on-demand',
                mediaType: 'video',
                duration: asset.duration || 0,
            }
        };

        if (asset.tracks && Array.isArray(asset.tracks)) {
            const subtitleTracks = asset.tracks.filter(
                (t) => t.type === 'text' && (t.text_type === 'subtitles' || t.text_type === 'captions')
            );
            if (subtitleTracks.length > 0) {
                updatedMediaData.settings.subtitles = subtitleTracks.map((track, index) => ({
                    id: track.id,
                    language: track.language_code || 'en',
                    label: track.name || track.language_code || 'English',
                    url: '',
                    is_default: index === 0,
                }));
            }
        }

        saveMediaToServer(updatedMediaData);
        setAttributes({
            preview: true,
            provider: 'mux',
            mux: {
                asset_id: asset.id || '',
                playback_id: playbackId,
            }
        });
    }, [defaultSettings?.defaultPresetSlug, defaultSettings?.preset_slug, saveMediaToServer, setAttributes]);

    const handleSelectAsset = (asset) => {
        if (asset.status !== 'ready') {
            showNotification({
                type: 'warning',
                message: __('This asset is still processing. Please wait until it\'s ready.', 'fluent-player'),
                duration: 5000,
                position: 'top-right'
            });
            return;
        }

        const playbackId = asset.public_playback_id || '';
        if (!playbackId) {
            showNotification({
                type: 'error',
                message: __('No playback ID found for this asset', 'fluent-player'),
                duration: 5000,
                position: 'top-right'
            });
            return;
        }

        applyMuxSelection(asset);
    };

    const updateAssetTitle = async () => {
        if (!assetToEdit || !editAssetTitle.trim()) return;

        try {
            await apiFetch({
                path: `${apiRequestPath}/mux/assets/${assetToEdit.id}`,
                method: 'PUT',
                data: {
                    passthrough: editAssetTitle.trim()
                }
            });

            setAssets(prev => prev.map(a =>
                a.id === assetToEdit.id
                    ? { ...a, passthrough: editAssetTitle.trim() }
                    : a
            ));

            setAssetToEdit(null);
            setEditAssetTitle('');
        } catch (error) {
            showNotification({
                type: 'error',
                message: error?.message || __('Failed to update asset', 'fluent-player'),
                duration: 5000,
                position: 'top-right'
            });
        }
    };

    const showDeleteConfirmation = (asset, event) => {
        event.stopPropagation();
        setAssetToDelete(asset);
        setDeleteConfirmAnchor(event.currentTarget);
    };

    const hideDeleteConfirmation = () => {
        setAssetToDelete(null);
        setDeleteConfirmAnchor(null);
    };

    const deleteAsset = async () => {
        if (!assetToDelete) return;

        try {
            await apiFetch({
                path: `${apiRequestPath}/mux/assets/${assetToDelete.id}`,
                method: 'DELETE',
            });

            if (selectedAsset && selectedAsset.id === assetToDelete.id) {
                setSelectedAsset(null);
            }

            hideDeleteConfirmation();
            await fetchAssets(1);
        } catch (error) {
            showNotification({
                type: 'error',
                message: error?.message || __('Failed to delete asset', 'fluent-player'),
                duration: 5000,
                position: 'top-right'
            });
            hideDeleteConfirmation();
        }
    };

    const handleDirectUpload = async () => {
        try {
            // Step 1: Open file picker and preload upchunk in parallel
            const [upchunkModule, file] = await Promise.all([
                import('@mux/upchunk'),
                new Promise((resolve) => {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = 'video/*';
                    fileInput.addEventListener('cancel', () => resolve(null));
                    fileInput.onchange = (e) => resolve(e.target.files?.[0] || null);
                    fileInput.click();
                }),
            ]);

            if (!file) return;

            setIsUploading(true);

            // Step 2: Get upload URL with file name as title
            const fileName = file.name.replace(/\.[^/.]+$/, ''); // strip extension
            const uploadData = await apiFetch({
                path: `${apiRequestPath}/mux/uploads`,
                method: 'POST',
                data: { passthrough: fileName },
            });

            if (!uploadData?.url) {
                throw new Error(__('Failed to create upload URL', 'fluent-player'));
            }

            const uploadUrl = uploadData.url;
            const uploadId = uploadData.id;

            // Step 3: Start upload
            const notifId = showNotification({
                type: 'info',
                message: __('Uploading... 0%', 'fluent-player'),
                progress: 0,
                duration: 0,
                position: 'top-right'
            });

            await new Promise((resolve, reject) => {
                const upload = upchunkModule.createUpload({
                    endpoint: uploadUrl,
                    file,
                    chunkSize: 5120, // 5MB chunks
                });

                upload.on('progress', (progress) => {
                    const pct = Math.round(progress.detail);
                    updateNotification(notifId, {
                        message: __('Uploading...', 'fluent-player') + ` ${pct}%`,
                        progress: pct
                    });
                });

                upload.on('success', () => resolve());

                upload.on('error', (err) => {
                    reject(new Error(err?.detail?.message || __('Upload failed', 'fluent-player')));
                });
            });

            // Step 4: Upload complete — poll for asset readiness
            updateNotification(notifId, {
                type: 'success',
                message: __('Upload complete', 'fluent-player'),
                progress: 100
            });
            setTimeout(() => hideNotification(notifId), 2000);

            const processingNotifId = showNotification({
                type: 'info',
                message: __('Processing video...', 'fluent-player'),
                duration: 0,
                position: 'top-right'
            });

            let pollFailures = 0;
            const interval = setInterval(async () => {
                try {
                    const status = await apiFetch({
                        path: `${apiRequestPath}/mux/uploads/${uploadId}`,
                    });

                    pollFailures = 0;

                    if (status?.status === 'asset_created' && status?.asset_id) {
                        clearInterval(interval);
                        pollIntervalRef.current = null;

                        // Ensure passthrough (title) is set on the Mux asset
                        if (fileName) {
                            await apiFetch({
                                path: `${apiRequestPath}/mux/assets/${status.asset_id}`,
                                method: 'PUT',
                                data: { passthrough: fileName },
                            }).catch(() => {}); // best-effort
                        }

                        const asset = await apiFetch({
                            path: `${apiRequestPath}/mux/assets/${status.asset_id}`,
                        });

                        hideNotification(processingNotifId);

                        if (asset?.status === 'ready') {
                            showNotification({
                                type: 'success',
                                message: __('Video is ready!', 'fluent-player'),
                                duration: 5000,
                                position: 'top-right'
                            });
                        } else {
                            showNotification({
                                type: 'info',
                                message: __('Video uploaded. It may take a moment to finish processing.', 'fluent-player'),
                                duration: 5000,
                                position: 'top-right'
                            });
                        }

                        fetchAssets(1);
                        setIsUploading(false);
                    } else if (status?.status === 'errored') {
                        clearInterval(interval);
                        pollIntervalRef.current = null;
                        hideNotification(processingNotifId);
                        showNotification({
                            type: 'error',
                            message: __('Upload processing failed', 'fluent-player'),
                            duration: 6000,
                            position: 'top-right'
                        });
                        setIsUploading(false);
                    }
                } catch {
                    pollFailures++;
                    if (pollFailures >= 10) {
                        clearInterval(interval);
                        pollIntervalRef.current = null;
                        hideNotification(processingNotifId);
                        showNotification({
                            type: 'error',
                            message: __('Upload status check failed. Please refresh and check your assets.', 'fluent-player'),
                            duration: 6000,
                            position: 'top-right'
                        });
                        setIsUploading(false);
                    }
                }
            }, 3000);

            pollIntervalRef.current = interval;
        } catch (err) {
            showNotification({
                type: 'error',
                message: __('Upload failed', 'fluent-player') + ': ' + (err.message || 'Unknown error'),
                duration: 6000,
                position: 'top-right'
            });
            setIsUploading(false);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fluent-player-bunny">
            {!isLoading && (
                <div className="fluent-player-bunny-toolbar">
                    <div></div>
                    <div className="fluent-player-bunny-search">
                        <SearchIconSVG />
                        <input
                            type="text"
                            className="fluent-player-bunny-search-input"
                            placeholder={__('Search assets...', 'fluent-player')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="fluent-player-bunny-search-clear"
                                onClick={() => setSearchQuery('')}
                            >
                                &times;
                            </button>
                        )}
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="fluent-player-bunny-content">
                    <div className="fluent-player-bunny-video">
                        <h5>{__('Videos', 'fluent-player')}</h5>
                        <Skeleton.VideoCardGrid count={6} />
                    </div>
                </div>
            ) : (
                <div className="fluent-player-bunny-content">
                    <div className="fluent-player-bunny-video">
                        <h5>{__('Videos', 'fluent-player')}</h5>
                        {!filteredAssets || filteredAssets.length === 0 ? (
                            <div className="fluent-player-bunny-video-error">
                                <p>
                                    {searchQuery
                                        ? __('No assets match your search.', 'fluent-player')
                                        : __('No assets found. Upload a video to get started.', 'fluent-player')}
                                </p>
                            </div>
                        ) : (
                            <div className="fluent-player-bunny-video-grid">
                                {filteredAssets.map((asset) => (
                                    <div
                                        key={asset.id}
                                        className={`fluent-player-bunny-video-grid-item ${asset.status !== 'ready' ? 'encoding' : ''} ${selectedAsset?.id === asset.id ? 'selected' : ''}`}
                                        onClick={() => handleSelectAsset(asset)}
                                    >
                                        <div className="fluent-player-bunny-video-grid-item-action">
                                            <Button
                                                className="fluent-player-bunny-video-grid-item-action-btn fp-icon-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setAssetToEdit(asset);
                                                    setEditAssetTitle(asset.passthrough || '');
                                                }}
                                                title={__('Edit video title', 'fluent-player')}
                                            >
                                                <EditIconSVG />
                                            </Button>
                                            <Button
                                                className="fluent-player-bunny-video-grid-item-action-btn fp-icon-btn"
                                                onClick={(e) => showDeleteConfirmation(asset, e)}
                                                title={__('Delete video', 'fluent-player')}
                                            >
                                                <DeleteIconSVG />
                                            </Button>
                                        </div>
                                        <div className="fluent-player-bunny-video-grid-item-thumbnail">
                                            {asset.thumbnail_url ? (
                                                <img
                                                    src={asset.thumbnail_url}
                                                    alt={getAssetTitle(asset)}
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="fluent-player-bunny-video-encoding-placeholder">
                                                    <span className="dashicons dashicons-video-alt3"></span>
                                                </div>
                                            )}
                                            {asset.status !== 'ready' ? (
                                                <div className="fluent-player-bunny-video-grid-item-encoding">
                                                    <span className="fluent-player-bunny-encoding-spinner"></span>
                                                    {__('Processing', 'fluent-player')}
                                                </div>
                                            ) : (
                                                <div className="fluent-player-bunny-video-grid-item-duration">
                                                    {formatDuration(asset.duration)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="fluent-player-bunny-video-grid-item-info">
                                            <div className="fluent-player-bunny-video-grid-item-info-title" title={asset.passthrough || asset.id}>
                                                {getAssetTitle(asset)}
                                            </div>
                                            <div className="fluent-player-bunny-video-grid-item-info-meta">
                                                <span>{formatDuration(asset.duration)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {hasMore && !isLoading && (
                            <div className="fluent-player-bunny-load-more">
                                <Button
                                    className="components-button fp-btn-secondary"
                                    onClick={() => fetchAssets(currentPage + 1, true)}
                                >
                                    {__('Load More', 'fluent-player')}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="fluent-player-bunny-action-button">
                <Button
                    onClick={onCancel}
                    className="components-button back-button fp-btn-secondary"
                >
                    <BackArrowSmallSVG />
                    {__('Back to Media Selector', 'fluent-player')}
                </Button>
                <div className="fluent-player-bunny-action-button-group">
                    <Button
                        onClick={handleDirectUpload}
                        className="components-button fp-btn-secondary"
                        disabled={isLoading || isUploading}
                    >
                        <UploadIconSVG />
                        {__('Upload Video', 'fluent-player')}
                    </Button>
                </div>
            </div>

            <ConfirmPopover
                isOpen={!!assetToDelete}
                anchor={deleteConfirmAnchor}
                title={__('Delete Video', 'fluent-player')}
                message={__('Are you sure you want to delete this video? This action cannot be undone.', 'fluent-player')}
                confirmText={__('Delete', 'fluent-player')}
                cancelText={__('Cancel', 'fluent-player')}
                onConfirm={deleteAsset}
                onCancel={hideDeleteConfirmation}
            />

            {assetToEdit && (
                <div className="fluent-player-bunny-modal-overlay">
                    <div className="fluent-player-bunny-modal-content">
                        <div className="fluent-player-bunny-modal-header">
                            <h2>{__('Edit Video Title', 'fluent-player')}</h2>
                            <button
                                className="fluent-player-bunny-close-modal"
                                onClick={() => {
                                    setAssetToEdit(null);
                                    setEditAssetTitle('');
                                }}
                                type="button"
                            >
                                <CloseIconSVG />
                            </button>
                        </div>
                        <div className="fluent-player-bunny-modal-body">
                            <div className="fluent-player-bunny-form-row">
                                <label>{__('Video Title', 'fluent-player')}</label>
                                <input
                                    type="text"
                                    value={editAssetTitle}
                                    onChange={(e) => setEditAssetTitle(e.target.value)}
                                    placeholder={__('Enter video title', 'fluent-player')}
                                    className="fluent-player-bunny-form-control"
                                />
                            </div>
                        </div>
                        <div className="fluent-player-bunny-modal-footer">
                            <Button
                                onClick={() => {
                                    setAssetToEdit(null);
                                    setEditAssetTitle('');
                                }}
                                className="fp-btn-secondary"
                            >
                                {__('Cancel', 'fluent-player')}
                            </Button>
                            <Button
                                onClick={updateAssetTitle}
                                disabled={!editAssetTitle.trim()}
                                className="fp-btn-primary"
                            >
                                {__('Save', 'fluent-player')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MuxProvider;
