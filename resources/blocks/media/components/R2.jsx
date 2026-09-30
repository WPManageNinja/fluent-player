const { useState, useEffect, useMemo, useRef } = wp.element;
const { __ } = wp.i18n;
const { Button } = wp.components;
const apiFetch = wp.apiFetch;
import Skeleton from './common/Skeleton.jsx';
import useNotification from './common/useNotification.js';
import ConfirmPopover from './common/ConfirmPopover.jsx';
import { BackArrowSmallSVG, UploadIconSVG, DirectoryIconSVG, SearchIconSVG, DeleteIconSVG, EditIconSVG, PlusIconSVG, CloseIconSVG } from './common/Icons.jsx';
import { buildR2MediaData } from './r2/buildR2MediaData.js';

const restBase = () => {
    const rest = window.fluentPlayerBlockVars?.rest || {};
    return `${rest.namespace}/${rest.version}`;
};

const formatBytes = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};


const R2 = ({
    onCancel,
    setAttributes,
    setSelectedMedia,
    setMediaData,
    mediaData,
    defaultSettings,
    saveMediaToServer
}) => {
    const [files, setFiles] = useState([]);
    const [folders, setFolders] = useState([]);
    const [truncated, setTruncated] = useState(false);
    const [currentPrefix, setCurrentPrefix] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedKey, setSelectedKey] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { showNotification, updateNotification, hideNotification } = useNotification();
    const mediaUploaderRef = useRef(null);

    // Folder CRUD UI state
    const [createFolderOpen, setCreateFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [renameTarget, setRenameTarget] = useState(null); // folder being renamed
    const [renameValue, setRenameValue] = useState('');
    const [deleteFileTarget, setDeleteFileTarget] = useState(null);
    const [deleteFileAnchor, setDeleteFileAnchor] = useState(null);
    const [deleteFolderTarget, setDeleteFolderTarget] = useState(null);
    const [deleteFolderAnchor, setDeleteFolderAnchor] = useState(null);

    const r2Request = (action, method, data) => apiFetch({
        path: `${restBase()}/r2/${action}`,
        method,
        data,
    });

    const notifyError = (message) => showNotification({
        type: 'error', message, duration: 6000, position: 'top-right',
    });

    const filteredFiles = useMemo(() => {
        if (!searchQuery.trim()) return files;
        const q = searchQuery.toLowerCase().trim();
        return files.filter((f) => (f.name || '').toLowerCase().includes(q));
    }, [files, searchQuery]);

    const filteredFolders = useMemo(() => {
        if (!searchQuery.trim()) return folders;
        const q = searchQuery.toLowerCase().trim();
        return folders.filter((d) => (d.name || '').toLowerCase().includes(q));
    }, [folders, searchQuery]);

    const loadObjects = async (prefix = '') => {
        setLoading(true);
        setFiles([]);
        setFolders([]);
        setTruncated(false);
        try {
            const response = await apiFetch({
                path: `${restBase()}/r2/objects?prefix=${encodeURIComponent(prefix)}`
            });
            setFiles(response?.files || []);
            setFolders(response?.folders || []);
            setTruncated(!!response?.truncated);
            setCurrentPrefix(response?.prefix ?? prefix);
        } catch (error) {
            showNotification({
                type: 'error',
                message: __('Failed to load R2 objects', 'fluent-player') + ': ' + (error.message || 'Unknown error'),
                duration: 6000,
                position: 'top-right'
            });
        } finally {
            setLoading(false);
        }
    };

    const parentPrefix = (prefix) => {
        const trimmed = prefix.replace(/\/$/, '');
        const idx = trimmed.lastIndexOf('/');
        return idx === -1 ? '' : trimmed.slice(0, idx + 1);
    };

    const getBreadcrumbs = () => {
        if (!currentPrefix) return [];
        const parts = currentPrefix.split('/').filter((p) => p.length > 0);
        let path = '';
        return parts.map((part) => {
            path += part + '/';
            return { name: part, path };
        });
    };

    const selectObject = async (file) => {
        if (!file || isSelecting) return;
        setIsSelecting(true);
        setSelectedKey(file.key);
        try {
            const presetSlug = window.fluentPlayerBlockVars?.defaultPreset?.slug
                || defaultSettings?.defaultPresetSlug
                || defaultSettings?.preset_slug
                || 'course';

            // R2 objects carry no duration metadata, and streaming the remote
            // file just to read it fired a dozen+ range requests and stalled the
            // click. Select instantly; the player resolves the real duration at
            // playback.
            const duration = Number(file.duration) || 0;

            const updatedMediaData = buildR2MediaData(
                { ...file, duration },
                { presetSlug, untitledLabel: __('Untitled R2 Video', 'fluent-player') }
            );

            if (typeof saveMediaToServer === 'function') {
                await saveMediaToServer(updatedMediaData);
            } else {
                if (typeof setMediaData === 'function') setMediaData(updatedMediaData);
                if (typeof setSelectedMedia === 'function') setSelectedMedia('new-media');
            }

            if (typeof setAttributes === 'function') {
                setAttributes({ preview: true, provider: 'cloudflare_r2' });
            }
        } catch (error) {
            showNotification({
                type: 'error',
                message: __('Unable to select video', 'fluent-player') + ': ' + (error.message || 'Unknown error'),
                duration: 5000,
                position: 'top-right'
            });
        } finally {
            setTimeout(() => setIsSelecting(false), 800);
        }
    };

    // Server-proxied upload has no browser progress events, so simulate it
    // (matches the BunnyCDN Storage upload UX).
    const startSimulatedProgress = (onProgress) => {
        let p = 0;
        return setInterval(() => {
            p = Math.min(90, p + Math.max(1, Math.round((90 - p) * 0.08)));
            if (typeof onProgress === 'function') onProgress(p);
        }, 300);
    };

    const uploadVideo = async (attachment) => {
        setIsUploading(true);
        const fileName = attachment.filename
            || (attachment.url ? attachment.url.split('/').pop().split('?')[0] : (attachment.title || 'video'));
        const notifId = showNotification({
            type: 'info',
            message: __('Uploading…', 'fluent-player') + ' 0%',
            progress: 0,
            duration: 0,
            position: 'top-right'
        });
        const interval = startSimulatedProgress((p) => {
            updateNotification(notifId, { message: __('Uploading…', 'fluent-player') + ` ${p}%`, progress: p });
        });

        try {
            // The server streams the WP media-library attachment straight to R2.
            await apiFetch({
                path: `${restBase()}/r2/upload`,
                method: 'POST',
                data: { attachment_id: attachment.id, filename: fileName, prefix: currentPrefix }
            });

            clearInterval(interval);
            updateNotification(notifId, { type: 'success', message: __('Upload complete', 'fluent-player'), progress: 100 });
            setTimeout(() => hideNotification(notifId), 2000);

            // Refresh the listing so the new video appears in the current folder.
            // Do NOT auto-select it — the user picks it explicitly.
            await loadObjects(currentPrefix);
        } catch (error) {
            clearInterval(interval);
            updateNotification(notifId, {
                type: 'error',
                message: __('Upload failed', 'fluent-player') + ': ' + (error.message || 'Unknown error'),
                progress: undefined
            });
            setTimeout(() => hideNotification(notifId), 4000);
        } finally {
            setIsUploading(false);
        }
    };

    const openMediaUploader = () => {
        if (typeof wp === 'undefined' || !wp.media) {
            notifyError(__('WordPress Media Library is not available', 'fluent-player'));
            return;
        }
        if (mediaUploaderRef.current) {
            mediaUploaderRef.current.open();
            return;
        }
        const uploader = wp.media({
            title: __('Select or Upload Video', 'fluent-player'),
            button: { text: __('Use this video', 'fluent-player') },
            multiple: false,
            library: { type: 'video' }
        });
        uploader.on('select', () => {
            const attachment = uploader.state().get('selection').first().toJSON();
            uploadVideo(attachment);
        });
        mediaUploaderRef.current = uploader;
        uploader.open();
    };

    const createFolder = async () => {
        const name = newFolderName.trim();
        if (!name) return;
        setCreateFolderOpen(false);
        setNewFolderName('');
        try {
            await r2Request('folder', 'POST', { name, prefix: currentPrefix });
            await loadObjects(currentPrefix);
        } catch (e) {
            notifyError(__('Failed to create folder', 'fluent-player') + ': ' + (e.message || ''));
        }
    };

    const deleteFile = async () => {
        const file = deleteFileTarget;
        setDeleteFileTarget(null);
        setDeleteFileAnchor(null);
        if (!file) return;
        try {
            await r2Request('object', 'DELETE', { key: file.key });
            if (selectedKey === file.key) setSelectedKey(null);
            await loadObjects(currentPrefix);
        } catch (e) {
            notifyError(__('Failed to delete file', 'fluent-player') + ': ' + (e.message || ''));
        }
    };

    const deleteFolder = async () => {
        const folder = deleteFolderTarget;
        setDeleteFolderTarget(null);
        setDeleteFolderAnchor(null);
        if (!folder) return;
        try {
            await r2Request('folder', 'DELETE', { prefix: folder.prefix });
            await loadObjects(currentPrefix);
        } catch (e) {
            notifyError(__('Failed to delete folder', 'fluent-player') + ': ' + (e.message || ''));
        }
    };

    const renameFolder = async () => {
        const folder = renameTarget;
        const to = renameValue.trim();
        setRenameTarget(null);
        setRenameValue('');
        if (!folder || !to) return;
        try {
            await r2Request('folder/rename', 'POST', { from: folder.prefix, to });
            await loadObjects(currentPrefix);
        } catch (e) {
            notifyError(__('Failed to rename folder', 'fluent-player') + ': ' + (e.message || ''));
        }
    };

    const onItemKeyDown = (event, handler) => {
        // Ignore keys bubbling up from nested action buttons — only activate when
        // the grid item itself is the keyboard target.
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handler();
        }
    };

    useEffect(() => {
        // Load exactly one prefix on mount — the pre-selected key's folder if the
        // media already has an R2 object, otherwise the root. Firing loadObjects
        // twice raced: the two async listings clobbered each other's state.
        const key = mediaData?.settings?.r2?.key;
        if (key) {
            setSelectedKey(key);
        }
        const slash = key ? key.lastIndexOf('/') : -1;
        loadObjects(slash > 0 ? key.slice(0, slash + 1) : '');
    }, []);

    return (
        <div className="fluent-player-bunny fluent-player-r2">
            {!loading && (
                <div className="fluent-player-bunny-toolbar">
                    <nav className="fluent-player-bunny-breadcrumb" aria-label={__('Bucket folders', 'fluent-player')}>
                        <Button isLink onClick={() => { setSearchQuery(''); loadObjects(''); }} disabled={loading}>
                            {__('Root', 'fluent-player')}
                        </Button>
                        {getBreadcrumbs().map((crumb, index) => (
                            <span key={index}>
                                <span className="fluent-player-bunny-breadcrumb-separator" aria-hidden="true">/</span>
                                <Button isLink onClick={() => loadObjects(crumb.path)} disabled={loading}>
                                    {crumb.name}
                                </Button>
                            </span>
                        ))}
                    </nav>
                    <div className="fluent-player-bunny-search">
                        <SearchIconSVG />
                        <input
                            type="text"
                            aria-label={__('Search files', 'fluent-player')}
                            placeholder={__('Search files…', 'fluent-player')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="fluent-player-bunny-search-input"
                            disabled={loading}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="fluent-player-bunny-search-clear"
                                aria-label={__('Clear search', 'fluent-player')}
                                onClick={() => setSearchQuery('')}
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="fluent-player-bunny-content">
                    <div className="fluent-player-bunny-video">
                        <h5>{__('Videos', 'fluent-player')}</h5>
                        <Skeleton.VideoCardGrid count={6} />
                    </div>
                </div>
            ) : (
                <div className="fluent-player-bunny-content">
                    {filteredFolders.length > 0 && (
                        <div className="fluent-player-bunny-directory">
                            <h5>{__('Folders', 'fluent-player')}</h5>
                            <div className="fluent-player-bunny-directory-grid">
                                {filteredFolders.map((dir, index) => (
                                    <div
                                        key={index}
                                        className="fluent-player-bunny-directory-grid-item"
                                        role="button"
                                        tabIndex={0}
                                        aria-label={__('Open folder', 'fluent-player') + ': ' + dir.name}
                                        onClick={() => loadObjects(dir.prefix)}
                                        onKeyDown={(e) => onItemKeyDown(e, () => loadObjects(dir.prefix))}
                                    >
                                        <span className="fluent-player-bunny-directory-grid-item-icon" aria-hidden="true"><DirectoryIconSVG /></span>
                                        <span className="fluent-player-bunny-directory-grid-item-name">{dir.name}</span>
                                        <div className="fluent-player-bunny-directory-grid-item-action" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                className="fluent-player-bunny-directory-grid-item-action-btn fp-icon-btn"
                                                aria-label={__('Rename folder', 'fluent-player') + ': ' + dir.name}
                                                onClick={() => { setRenameTarget(dir); setRenameValue(dir.name); }}
                                            >
                                                <EditIconSVG />
                                            </Button>
                                            <Button
                                                className="fluent-player-bunny-directory-grid-item-action-btn fp-icon-btn"
                                                aria-label={__('Delete folder', 'fluent-player') + ': ' + dir.name}
                                                onClick={(e) => { setDeleteFolderTarget(dir); setDeleteFolderAnchor(e.currentTarget); }}
                                            >
                                                <DeleteIconSVG />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="fluent-player-bunny-video">
                        <h5>{__('Videos', 'fluent-player')}</h5>
                        {truncated && (
                            <p className="fluent-player-bunny-truncated-notice" role="status">
                                {__('Showing the first 1000 items. Refine in a subfolder or the Cloudflare dashboard.', 'fluent-player')}
                            </p>
                        )}
                        {!filteredFiles.length ? (
                            <div className="fluent-player-bunny-video-error">
                                <p>
                                    {searchQuery
                                        ? __('No videos match your search.', 'fluent-player')
                                        : __('No videos found in this folder. Upload one to get started.', 'fluent-player')}
                                </p>
                            </div>
                        ) : (
                            <ul className="fluent-player-bunny-video-grid" role="list">
                                {filteredFiles.map((file, index) => (
                                    <li
                                        key={index}
                                        className={`fluent-player-bunny-video-grid-item ${selectedKey === file.key ? 'selected' : ''}`}
                                        role="button"
                                        tabIndex={0}
                                        aria-pressed={selectedKey === file.key}
                                        aria-label={__('Select video', 'fluent-player') + ': ' + file.name}
                                        onClick={() => selectObject(file)}
                                        onKeyDown={(e) => onItemKeyDown(e, () => selectObject(file))}
                                    >
                                        <div className="fluent-player-bunny-video-grid-item-action" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                className="fluent-player-bunny-video-grid-item-action-btn fp-icon-btn"
                                                aria-label={__('Delete video', 'fluent-player') + ': ' + file.name}
                                                onClick={(e) => { setDeleteFileTarget(file); setDeleteFileAnchor(e.currentTarget); }}
                                            >
                                                <DeleteIconSVG />
                                            </Button>
                                        </div>
                                        <div className="fluent-player-bunny-video-grid-item-thumbnail">
                                            <span className="dashicons dashicons-video-alt3" aria-hidden="true"></span>
                                        </div>
                                        <div className="fluent-player-bunny-video-grid-item-info">
                                            <div className="fluent-player-bunny-video-grid-item-info-title">{file.name}</div>
                                            <div className="fluent-player-bunny-video-grid-item-info-meta">
                                                <span>{formatBytes(file.size)}</span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
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
                        onClick={openMediaUploader}
                        className="components-button fp-btn-secondary r2-upload-button"
                        disabled={loading || isUploading}
                    >
                        <UploadIconSVG />
                        {__('Upload Video', 'fluent-player')}
                    </Button>
                    <Button
                        onClick={() => { setNewFolderName(''); setCreateFolderOpen(true); }}
                        className="components-button fp-btn-secondary icon-lg-svg"
                        disabled={loading || isUploading}
                    >
                        <PlusIconSVG />
                        {__('Create Folder', 'fluent-player')}
                    </Button>
                </div>
            </div>

            <ConfirmPopover
                isOpen={!!deleteFileTarget}
                anchor={deleteFileAnchor}
                title={__('Delete Video', 'fluent-player')}
                message={__('Delete this video from the bucket? This cannot be undone.', 'fluent-player')}
                confirmText={__('Delete', 'fluent-player')}
                cancelText={__('Cancel', 'fluent-player')}
                onConfirm={deleteFile}
                onCancel={() => { setDeleteFileTarget(null); setDeleteFileAnchor(null); }}
            />

            <ConfirmPopover
                isOpen={!!deleteFolderTarget}
                anchor={deleteFolderAnchor}
                title={__('Delete Folder', 'fluent-player')}
                message={__('Delete this folder and everything inside it? This cannot be undone.', 'fluent-player')}
                confirmText={__('Delete', 'fluent-player')}
                cancelText={__('Cancel', 'fluent-player')}
                onConfirm={deleteFolder}
                onCancel={() => { setDeleteFolderTarget(null); setDeleteFolderAnchor(null); }}
            />

            {createFolderOpen && (
                <div className="fluent-player-bunny-modal-overlay">
                    <div className="fluent-player-bunny-modal-content" role="dialog" aria-modal="true" aria-label={__('Create Folder', 'fluent-player')}>
                        <div className="fluent-player-bunny-modal-header">
                            <h2>{__('Create Folder', 'fluent-player')}</h2>
                            <button className="fluent-player-bunny-close-modal" type="button" aria-label={__('Close', 'fluent-player')} onClick={() => setCreateFolderOpen(false)}>
                                <CloseIconSVG />
                            </button>
                        </div>
                        <div className="fluent-player-bunny-modal-body">
                            <div className="fluent-player-bunny-form-row">
                                <label htmlFor="r2-new-folder">{__('Folder Name', 'fluent-player')}</label>
                                <input
                                    id="r2-new-folder"
                                    type="text"
                                    autoFocus
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') createFolder(); }}
                                    placeholder={__('Enter folder name', 'fluent-player')}
                                    className="fluent-player-bunny-form-control"
                                />
                            </div>
                        </div>
                        <div className="fluent-player-bunny-modal-footer">
                            <Button className="fp-btn-secondary" onClick={() => setCreateFolderOpen(false)}>{__('Cancel', 'fluent-player')}</Button>
                            <Button className="fp-btn-primary" disabled={!newFolderName.trim()} onClick={createFolder}>{__('Create', 'fluent-player')}</Button>
                        </div>
                    </div>
                </div>
            )}

            {!!renameTarget && (
                <div className="fluent-player-bunny-modal-overlay">
                    <div className="fluent-player-bunny-modal-content" role="dialog" aria-modal="true" aria-label={__('Rename Folder', 'fluent-player')}>
                        <div className="fluent-player-bunny-modal-header">
                            <h2>{__('Rename Folder', 'fluent-player')}</h2>
                            <button className="fluent-player-bunny-close-modal" type="button" aria-label={__('Close', 'fluent-player')} onClick={() => { setRenameTarget(null); setRenameValue(''); }}>
                                <CloseIconSVG />
                            </button>
                        </div>
                        <div className="fluent-player-bunny-modal-body">
                            <div className="fluent-player-bunny-form-row">
                                <label htmlFor="r2-rename-folder">{__('New Name', 'fluent-player')}</label>
                                <input
                                    id="r2-rename-folder"
                                    type="text"
                                    autoFocus
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') renameFolder(); }}
                                    placeholder={__('Enter new folder name', 'fluent-player')}
                                    className="fluent-player-bunny-form-control"
                                />
                            </div>
                        </div>
                        <div className="fluent-player-bunny-modal-footer">
                            <Button className="fp-btn-secondary" onClick={() => { setRenameTarget(null); setRenameValue(''); }}>{__('Cancel', 'fluent-player')}</Button>
                            <Button className="fp-btn-primary" disabled={!renameValue.trim()} onClick={renameFolder}>{__('Rename', 'fluent-player')}</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default R2;
