const { useState, useEffect, useCallback, useMemo, useRef } = wp.element;
const { __ } = wp.i18n;
const { Button } = wp.components;
const apiFetch = wp.apiFetch;
import ConfirmPopover from './common/ConfirmPopover.jsx';
import Skeleton from './common/Skeleton.jsx';
import useNotification from './common/useNotification.js';
import { BackArrowSmallSVG, UploadIconSVG, SearchIconSVG, EditIconSVG, DeleteIconSVG, CloseIconSVG } from './common/Icons.jsx';
import { buildGumletMediaData } from './common/buildGumletMediaData.js';
import { defaultPostStatus } from '@share/helper.js';
import { gumletDeleteErrorMessage } from './common/gumletMessages.js';

const GumletProvider = ({
    attributes,
    setAttributes,
    mediaData,
    setMediaData,
    onCancel,
    defaultSettings,
    setSelectedMedia,
    saveMediaToServer,
}) => {
    const { showNotification, updateNotification, hideNotification } = useNotification();
    const [assets, setAssets] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [hasMore, setHasMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pollIntervalRef = useRef(null);
    const selectingRef = useRef(false);
    const audioByAssetId = useRef({});

    // Edit modal state
    const [assetToEdit, setAssetToEdit] = useState(null);
    const [editTitle, setEditTitle] = useState('');

    // Delete popover state
    const [assetToDelete, setAssetToDelete] = useState(null);
    const [deleteAnchor, setDeleteAnchor] = useState(null);

    const blockVars = window.fluentPlayerBlockVars || {};
    const apiRequestPath = `${blockVars.rest?.namespace}/${blockVars.rest?.version}`;
    const presetSlug = blockVars.defaultPreset?.slug ||
        defaultSettings?.defaultPresetSlug ||
        defaultSettings?.preset_slug ||
        'course';

    const notifyError = (message) => showNotification({
        type: 'error', message, duration: 6000, position: 'top-right',
    });

    const filteredAssets = useMemo(() => {
        if (!searchQuery.trim()) return assets;
        const q = searchQuery.toLowerCase().trim();
        return assets.filter((a) =>
            (a.title || '').toLowerCase().includes(q) || (a.id || '').toLowerCase().includes(q)
        );
    }, [assets, searchQuery]);

    const fetchAssets = useCallback(async (page = 1, append = false) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ page: page.toString(), limit: '20' });
            const response = await apiFetch({ path: `${apiRequestPath}/gumlet/assets?${params.toString()}` });
            const items = response?.items || [];
            setAssets((prev) => (append ? [...prev, ...items] : items));
            setHasMore(!!response?.hasMore);
            setCurrentPage(page);
        } catch (err) {
            notifyError(err?.message || __('Failed to load Gumlet videos', 'fluent-player'));
        } finally {
            setIsLoading(false);
        }
    }, [apiRequestPath]);

    useEffect(() => { fetchAssets(1); }, [fetchAssets]);

    useEffect(() => () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }, []);

    const formatDuration = (seconds) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const selectVideo = useCallback(async (asset) => {
        if (selectingRef.current) return;
        if (!asset.ready) {
            showNotification({
                type: 'warning',
                message: __('This video is still processing. Please wait until it\'s ready.', 'fluent-player'),
                duration: 5000, position: 'top-right',
            });
            return;
        }
        selectingRef.current = true;
        setSelectedId(asset.id);

        const data = buildGumletMediaData(asset, {
            presetSlug,
            untitledLabel: __('Untitled Gumlet Video', 'fluent-player'),
            postStatus: defaultPostStatus(),
            isAudio: (typeof audioByAssetId.current[asset.id] !== 'undefined')
                ? audioByAssetId.current[asset.id]
                : asset.is_audio,
        });

        try {
            if (typeof saveMediaToServer === 'function') {
                await saveMediaToServer(data);
            }
            setAttributes({
                preview: true,
                provider: 'gumlet',
                gumlet: { asset_id: asset.id, playback_url: asset.playback_url },
            });
        } catch (e) {
            setSelectedId(null);
            notifyError(__('Unable to select video', 'fluent-player') + ': ' + (e?.message || ''));
        } finally {
            selectingRef.current = false;
        }
    }, [presetSlug, saveMediaToServer, setAttributes]);

    // ─── Upload via wp.media (import-from-URL) ───────────────────────
    const openMediaUploader = () => new Promise((resolve) => {
        if (!wp.media) { resolve(null); return; }
        const frame = wp.media({
            title: __('Select or upload a video for Gumlet', 'fluent-player'),
            button: { text: __('Use this video', 'fluent-player') },
            library: { type: ['video', 'audio'] },
            multiple: false,
        });
        frame.on('select', () => {
            const attachment = frame.state().get('selection').first().toJSON();
            resolve(attachment);
        });
        frame.on('close', () => setTimeout(() => resolve(null), 0));
        frame.open();
    });

    const pollUntilReady = (assetId, onProgress, tries = 60) => {
        let failures = 0;
        return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
                if (tries-- <= 0) {
                    clearInterval(interval);
                    pollIntervalRef.current = null;
                    reject(new Error(__('Timed out waiting for Gumlet to finish processing. The video may still be processing — check back shortly.', 'fluent-player')));
                    return;
                }
                try {
                    const status = await apiFetch({ path: `${apiRequestPath}/gumlet/assets/${assetId}/status` });
                    failures = 0;
                    if (onProgress) onProgress(status);
                    if (status?.ready) {
                        clearInterval(interval);
                        pollIntervalRef.current = null;
                        resolve(status);
                    } else if (status?.error) {
                        clearInterval(interval);
                        pollIntervalRef.current = null;
                        reject(new Error(status.error));
                    }
                } catch (e) {
                    failures++;
                    if (failures >= 8) {
                        clearInterval(interval);
                        pollIntervalRef.current = null;
                        reject(new Error(__('Lost connection while checking processing status.', 'fluent-player')));
                    }
                }
            }, 4000);
            pollIntervalRef.current = interval;
        });
    };

    const handleUpload = async () => {
        try {
            const attachment = await openMediaUploader();
            if (!attachment || !attachment.id) return;

            setIsUploading(true);

            const notifId = showNotification({
                type: 'info',
                message: __('Uploading to Gumlet…', 'fluent-player'),
                duration: 0, position: 'top-right',
            });

            // The server reads the attachment file and streams it to Gumlet —
            // no bytes are fetched/buffered in the browser (matches the other
            // providers) and it works on non-public sites.
            let created;
            try {
                created = await apiFetch({
                    path: `${apiRequestPath}/gumlet/upload`,
                    method: 'POST',
                    data: { attachment_id: attachment.id },
                });
            } catch (e) {
                hideNotification(notifId);
                notifyError(__('Upload failed', 'fluent-player') + ': ' + (e?.message || ''));
                setIsUploading(false);
                return;
            }

            if (!created?.id) {
                hideNotification(notifId);
                notifyError(__('Upload failed', 'fluent-player'));
                setIsUploading(false);
                return;
            }

            audioByAssetId.current[created.id] = (typeof created.is_audio !== 'undefined')
                ? !!created.is_audio
                : (attachment.type === 'audio' || String(attachment.mime || attachment.subtype || '').startsWith('audio'));

            // Bytes are in Gumlet's storage — poll transcode status.
            updateNotification(notifId, {
                type: 'info',
                message: __('Processing video…', 'fluent-player'),
                progress: 0,
            });

            try {
                await pollUntilReady(created.id, (status) => {
                    updateNotification(notifId, {
                        type: 'info',
                        message: __('Processing video…', 'fluent-player') + ` ${status?.progress || 0}%`,
                        progress: status?.progress || 0,
                    });
                });
                updateNotification(notifId, {
                    type: 'success', message: __('Video is ready!', 'fluent-player'), progress: 100,
                });
                setTimeout(() => hideNotification(notifId), 2500);
            } catch (e) {
                hideNotification(notifId);
                notifyError(e?.message || __('Processing failed', 'fluent-player'));
            } finally {
                fetchAssets(1);
                setIsUploading(false);
            }
        } catch (err) {
            notifyError(__('Upload failed', 'fluent-player') + ': ' + (err?.message || ''));
            setIsUploading(false);
        }
    };

    // ─── Rename / delete ─────────────────────────────────────────────
    const saveTitle = async () => {
        if (!assetToEdit || !editTitle.trim()) return;
        try {
            await apiFetch({
                path: `${apiRequestPath}/gumlet/assets/${assetToEdit.id}/rename`,
                method: 'POST',
                data: { title: editTitle.trim() },
            });
            setAssets((prev) => prev.map((a) => (a.id === assetToEdit.id ? { ...a, title: editTitle.trim() } : a)));
            setAssetToEdit(null);
            setEditTitle('');
        } catch (e) {
            notifyError(e?.message || __('Failed to rename video', 'fluent-player'));
        }
    };

    const showDeleteConfirmation = (asset, event) => {
        event.stopPropagation();
        setAssetToDelete(asset);
        setDeleteAnchor(event.currentTarget);
    };

    const hideDeleteConfirmation = () => {
        setAssetToDelete(null);
        setDeleteAnchor(null);
    };

    const confirmDelete = async () => {
        if (!assetToDelete) return;
        const target = assetToDelete;
        try {
            await apiFetch({ path: `${apiRequestPath}/gumlet/assets/${target.id}`, method: 'DELETE' });
            setAssets((prev) => prev.filter((a) => a.id !== target.id));
            if (selectedId === target.id) setSelectedId(null);
            hideDeleteConfirmation();
        } catch (e) {
            hideDeleteConfirmation();
            notifyError(gumletDeleteErrorMessage(target, e?.message, {
                processing: __('This video is still processing on Gumlet and can\'t be deleted yet. Try again once it\'s ready.', 'fluent-player'),
                fallback: __('Failed to delete video', 'fluent-player'),
            }));
        }
    };

    const onItemKeyDown = (e, asset) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectVideo(asset);
        }
    };

    return (
        <div className="fluent-player-bunny fluent-player-gumlet">
            {!isLoading && (
                <div className="fluent-player-bunny-toolbar">
                    <div></div>
                    <div className="fluent-player-bunny-search">
                        <SearchIconSVG />
                        <input
                            type="text"
                            className="fluent-player-bunny-search-input"
                            placeholder={__('Search videos…', 'fluent-player')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="fluent-player-bunny-search-clear"
                                onClick={() => setSearchQuery('')}
                                aria-label={__('Clear search', 'fluent-player')}
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
                                        ? __('No videos match your search.', 'fluent-player')
                                        : __('No videos found. Upload a video to get started.', 'fluent-player')}
                                </p>
                            </div>
                        ) : (
                            <div className="fluent-player-bunny-video-grid">
                                {filteredAssets.map((asset) => (
                                    <div
                                        key={asset.id}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={asset.title || asset.id}
                                        className={`fluent-player-bunny-video-grid-item ${!asset.ready ? 'encoding' : ''} ${selectedId === asset.id ? 'selected' : ''}`}
                                        onClick={() => selectVideo(asset)}
                                        onKeyDown={(e) => onItemKeyDown(e, asset)}
                                    >
                                        <div className="fluent-player-bunny-video-grid-item-action">
                                            <Button
                                                className="fluent-player-bunny-video-grid-item-action-btn fp-icon-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setAssetToEdit(asset);
                                                    setEditTitle(asset.title || '');
                                                }}
                                                label={__('Edit video title', 'fluent-player')}
                                                showTooltip
                                            >
                                                <EditIconSVG />
                                            </Button>
                                            <Button
                                                className="fluent-player-bunny-video-grid-item-action-btn fp-icon-btn"
                                                onClick={(e) => showDeleteConfirmation(asset, e)}
                                                label={__('Delete video', 'fluent-player')}
                                                showTooltip
                                            >
                                                <DeleteIconSVG />
                                            </Button>
                                        </div>
                                        <div className="fluent-player-bunny-video-grid-item-thumbnail">
                                            {asset.thumbnail ? (
                                                <img src={asset.thumbnail} alt={asset.title || asset.id} loading="lazy" />
                                            ) : (
                                                <div className="fluent-player-bunny-video-encoding-placeholder">
                                                    <span className="dashicons dashicons-video-alt3"></span>
                                                </div>
                                            )}
                                            {!asset.ready ? (
                                                <div className="fluent-player-bunny-video-grid-item-encoding">
                                                    <span className="fluent-player-bunny-encoding-spinner"></span>
                                                    {asset.error ? __('Error', 'fluent-player') : __('Processing', 'fluent-player')}
                                                </div>
                                            ) : (
                                                <div className="fluent-player-bunny-video-grid-item-duration">
                                                    {formatDuration(asset.duration)}
                                                </div>
                                            )}
                                            {asset.is_private && (
                                                <div className="fluent-player-gumlet-private-badge" role="img" aria-label={__('Private video', 'fluent-player')}>
                                                    {__('Private', 'fluent-player')}
                                                </div>
                                            )}
                                        </div>
                                        <div className="fluent-player-bunny-video-grid-item-info">
                                            <div className="fluent-player-bunny-video-grid-item-info-title" title={asset.title || asset.id}>
                                                {asset.title || asset.id}
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
                <Button onClick={onCancel} className="components-button back-button fp-btn-secondary">
                    <BackArrowSmallSVG />
                    {__('Back to Media Selector', 'fluent-player')}
                </Button>
                <div className="fluent-player-bunny-action-button-group">
                    <Button
                        onClick={handleUpload}
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
                anchor={deleteAnchor}
                title={__('Delete Video', 'fluent-player')}
                message={__('Are you sure you want to delete this video? This action cannot be undone.', 'fluent-player')}
                confirmText={__('Delete', 'fluent-player')}
                cancelText={__('Cancel', 'fluent-player')}
                onConfirm={confirmDelete}
                onCancel={hideDeleteConfirmation}
            />

            {assetToEdit && (
                <div className="fluent-player-bunny-modal-overlay">
                    <div className="fluent-player-bunny-modal-content">
                        <div className="fluent-player-bunny-modal-header">
                            <h2>{__('Edit Video Title', 'fluent-player')}</h2>
                            <button
                                className="fluent-player-bunny-close-modal"
                                onClick={() => { setAssetToEdit(null); setEditTitle(''); }}
                                type="button"
                                aria-label={__('Close', 'fluent-player')}
                            >
                                <CloseIconSVG />
                            </button>
                        </div>
                        <div className="fluent-player-bunny-modal-body">
                            <div className="fluent-player-bunny-form-row">
                                <label>{__('Video Title', 'fluent-player')}</label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder={__('Enter video title', 'fluent-player')}
                                    className="fluent-player-bunny-form-control"
                                />
                            </div>
                        </div>
                        <div className="fluent-player-bunny-modal-footer">
                            <Button
                                onClick={() => { setAssetToEdit(null); setEditTitle(''); }}
                                className="fp-btn-secondary"
                            >
                                {__('Cancel', 'fluent-player')}
                            </Button>
                            <Button onClick={saveTitle} disabled={!editTitle.trim()} className="fp-btn-primary">
                                {__('Save', 'fluent-player')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GumletProvider;
