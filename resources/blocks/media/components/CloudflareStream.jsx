const { useState, useEffect, useRef, useMemo } = wp.element;
const { __ } = wp.i18n;
const { Button } = wp.components;
const apiFetch = wp.apiFetch;

import { defaultPostStatus } from '@share/helper.js';
import { buildStreamMediaData } from './cloudflareStream/buildStreamMediaData.js';
import useNotification from './common/useNotification.js';
import ConfirmPopover from './common/ConfirmPopover.jsx';
import Skeleton from './common/Skeleton.jsx';
import { UploadIconSVG, SearchIconSVG, BackArrowSmallSVG, EditIconSVG, DeleteIconSVG, CloseIconSVG } from './common/Icons.jsx';

const restBase = () => {
    const rest = window.fluentPlayerBlockVars?.rest || {};
    return `/${rest.namespace || 'fluent-player'}/${rest.version || 'v2'}`;
};

const streamRequest = (path, method = 'GET', data) =>
    apiFetch({ path: `${restBase()}/cloudflare-stream/${path}`, method, ...(data ? { data } : {}) });

const formatDuration = (secs) => {
    const s = Math.max(0, Math.round(secs || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Cloudflare Stream source: pick/upload a video through the WP media library
 * (server streams it to Cloudflare), browse existing videos, rename + delete —
 * mirroring the R2 source structure, including its notification-based progress.
 */
const CloudflareStream = ({ defaultSettings, saveMediaToServer, onCancel }) => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [selectedUid, setSelectedUid] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [videoToEdit, setVideoToEdit] = useState(null);
    const [editVideoTitle, setEditVideoTitle] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteAnchor, setDeleteAnchor] = useState(null);

    const { showNotification, updateNotification, hideNotification } = useNotification();
    const mediaUploaderRef = useRef(null);
    const selectingRef = useRef(false);
    const presetSlug = defaultSettings?.defaultPresetSlug || 'course';

    const notifyError = (message) => showNotification({ type: 'error', message, duration: 4000, position: 'top-right' });

    const loadVideos = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await streamRequest('videos?limit=100');
            setVideos(Array.isArray(res?.videos) ? res.videos : []);
        } catch (e) {
            setError(__('Could not load videos. Check the connection settings.', 'fluent-player'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadVideos(); }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q ? videos.filter((v) => (v.name || v.uid || '').toLowerCase().includes(q)) : videos;
    }, [videos, search]);

    const startSimulatedProgress = (onProgress) => {
        let p = 0;
        return setInterval(() => {
            p = Math.min(90, p + Math.max(1, Math.round((90 - p) * 0.08)));
            onProgress(p);
        }, 300);
    };

    const openMediaUploader = () => {
        if (typeof wp === 'undefined' || !wp.media) {
            notifyError(__('WordPress Media Library is not available', 'fluent-player'));
            return;
        }
        if (mediaUploaderRef.current) { mediaUploaderRef.current.open(); return; }
        const uploader = wp.media({
            title: __('Select or Upload Video', 'fluent-player'),
            button: { text: __('Use this video', 'fluent-player') },
            multiple: false,
            // Cloudflare Stream is a video-only platform — it rejects audio-only files
            // at the API ("not a valid video file"). Audio should use Cloudflare R2.
            library: { type: 'video' },
        });
        uploader.on('select', () => {
            const attachment = uploader.state().get('selection').first().toJSON();
            uploadVideo(attachment);
        });
        mediaUploaderRef.current = uploader;
        uploader.open();
    };

    const uploadVideo = async (attachment) => {
        // Cloudflare Stream rejects audio at the API. Guard with a clear message
        // (pointing to R2) rather than surfacing the raw vendor error.
        const attachmentIsAudio = attachment?.type === 'audio'
            || String(attachment?.mime || attachment?.subtype || '').startsWith('audio');
        if (attachmentIsAudio) {
            notifyError(__('Cloudflare Stream does not support audio files. Use Cloudflare R2 for audio instead.', 'fluent-player'));
            return;
        }

        setIsUploading(true);
        const notifId = showNotification({
            type: 'info',
            message: __('Uploading to Cloudflare Stream…', 'fluent-player') + ' 0%',
            progress: 0,
            duration: 0,
            position: 'top-right',
        });
        const interval = startSimulatedProgress((p) => {
            updateNotification(notifId, { message: __('Uploading to Cloudflare Stream…', 'fluent-player') + ` ${p}%`, progress: p });
        });
        try {
            const res = await streamRequest('upload', 'POST', { attachment_id: attachment.id });
            clearInterval(interval);
            const uid = res?.video?.uid;
            let finalVideo = res?.video;
            if (uid && !res.video.ready) {
                updateNotification(notifId, { message: __('Processing video…', 'fluent-player') + ' 0%', progress: 90 });
                finalVideo = await pollUntilReady(uid, (v) => {
                    const pct = Math.max(0, Math.min(100, Math.round(v.pct || 0)));
                    updateNotification(notifId, {
                        message: __('Processing video…', 'fluent-player') + ` ${pct}%`,
                        progress: 90 + Math.round(pct * 0.1),
                    });
                });
            }
            if (finalVideo && finalVideo.error) {
                updateNotification(notifId, {
                    type: 'error',
                    message: __('Processing failed', 'fluent-player') + (finalVideo.error_reason ? ': ' + finalVideo.error_reason : ''),
                    progress: undefined,
                });
                setTimeout(() => hideNotification(notifId), 6000);
                await loadVideos();
                return;
            }
            const stillProcessing = uid && !res.video.ready && !(finalVideo && finalVideo.ready);
            updateNotification(notifId, {
                type: 'success',
                message: stillProcessing ? __('Uploaded — still processing…', 'fluent-player') : __('Upload complete', 'fluent-player'),
                progress: 100,
            });
            setTimeout(() => hideNotification(notifId), stillProcessing ? 4000 : 2000);
            await loadVideos();
        } catch (error) {
            clearInterval(interval);
            updateNotification(notifId, { type: 'error', message: __('Upload failed', 'fluent-player') + ': ' + (error.message || ''), progress: undefined });
            setTimeout(() => hideNotification(notifId), 4000);
        } finally {
            setIsUploading(false);
        }
    };

    const pollUntilReady = async (uid, onProgress, tries = 60) => {
        for (let i = 0; i < tries; i++) {
            const res = await streamRequest(`videos/${encodeURIComponent(uid)}`);
            const v = res?.video;
            if (v) {
                if (typeof onProgress === 'function') onProgress(v);
                if (v.ready || v.error) return v;
            }
            await new Promise((r) => setTimeout(r, 3000));
        }
        return null;
    };

    const selectVideo = async (v) => {
        // Ref guard (synchronous) so rapid clicks can't fire concurrent saves.
        if (selectingRef.current) return;
        selectingRef.current = true;
        setSelectedUid(v.uid);
        const data = buildStreamMediaData(
            { uid: v.uid, meta: { name: v.name }, duration: v.duration, thumbnail: v.thumbnail, playback: { hls: v.hls }, readyToStream: v.ready, requireSignedURLs: v.require_signed_urls },
            { presetSlug, untitledLabel: __('Untitled Stream Video', 'fluent-player'), postStatus: defaultPostStatus() }
        );
        try {
            if (typeof saveMediaToServer === 'function') await saveMediaToServer(data);
        } catch (e) {
            setSelectedUid(null);
            notifyError(__('Unable to select video', 'fluent-player') + ': ' + (e.message || ''));
        } finally {
            selectingRef.current = false;
        }
    };

    const openRename = (v) => { setVideoToEdit(v); setEditVideoTitle(v.name || ''); };
    const updateVideoTitle = async () => {
        const name = editVideoTitle.trim();
        if (!videoToEdit || !name) return;
        const uid = videoToEdit.uid;
        setVideoToEdit(null); setEditVideoTitle('');
        try {
            await streamRequest(`videos/${encodeURIComponent(uid)}/rename`, 'POST', { name });
            await loadVideos();
            showNotification({ type: 'success', message: __('Video title updated.', 'fluent-player'), duration: 3000, position: 'top-right' });
        } catch (e) { notifyError(__('Rename failed', 'fluent-player') + ': ' + (e.message || '')); }
    };

    const deleteVideo = async () => {
        const uid = deleteTarget?.uid;
        setDeleteTarget(null); setDeleteAnchor(null);
        if (!uid) return;
        try {
            await streamRequest(`videos/${encodeURIComponent(uid)}`, 'DELETE');
            await loadVideos();
        } catch (e) { notifyError(__('Delete failed', 'fluent-player') + ': ' + (e.message || '')); }
    };

    return (
        <div className="fluent-player-bunny fluent-player-cf-stream">
            <div className="fluent-player-bunny-toolbar">
                <div className="fluent-player-bunny-search">
                    <SearchIconSVG />
                    <input
                        type="text"
                        aria-label={__('Search videos', 'fluent-player')}
                        placeholder={__('Search videos…', 'fluent-player')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="fluent-player-bunny-search-input"
                        disabled={loading}
                    />
                    {search && (
                        <button type="button" className="fluent-player-bunny-search-clear" aria-label={__('Clear search', 'fluent-player')} onClick={() => setSearch('')}>×</button>
                    )}
                </div>
            </div>

            <div className="fluent-player-bunny-content">
                <div className="fluent-player-bunny-video">
                    {loading && <Skeleton.VideoCardGrid count={6} />}
                    {!loading && error && <div className="fluent-player-bunny-video-error">{error}</div>}
                    {!loading && !error && !filtered.length && (
                        <div className="fluent-player-bunny-video-empty">{__('No videos yet. Use “Upload Video” below.', 'fluent-player')}</div>
                    )}
                    {!loading && !error && !!filtered.length && (
                        <ul className="fluent-player-bunny-video-grid" role="list">
                            {filtered.map((v) => (
                                <li
                                    key={v.uid}
                                    className={`fluent-player-bunny-video-grid-item ${selectedUid === v.uid ? 'selected' : ''}`}
                                    role="button"
                                    tabIndex={0}
                                    aria-pressed={selectedUid === v.uid}
                                    aria-label={__('Select video', 'fluent-player') + ': ' + (v.name || v.uid)}
                                    onClick={() => selectVideo(v)}
                                    onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectVideo(v); } }}
                                >
                                    <div className="fluent-player-bunny-video-grid-item-action" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            className="fluent-player-bunny-video-grid-item-action-btn fp-icon-btn"
                                            aria-label={__('Rename video', 'fluent-player')}
                                            onClick={() => openRename(v)}
                                        >
                                            <EditIconSVG />
                                        </Button>
                                        <Button
                                            className="fluent-player-bunny-video-grid-item-action-btn fp-icon-btn"
                                            aria-label={__('Delete video', 'fluent-player')}
                                            onClick={(e) => { setDeleteTarget(v); setDeleteAnchor(e.currentTarget); }}
                                        >
                                            <DeleteIconSVG />
                                        </Button>
                                    </div>
                                    <div className="fluent-player-bunny-video-grid-item-thumbnail">
                                        {v.thumbnail
                                            ? <img src={v.thumbnail} alt="" loading="lazy" />
                                            : <span className="dashicons dashicons-video-alt3" aria-hidden="true"></span>}
                                    </div>
                                    <div className="fluent-player-bunny-video-grid-item-info">
                                        <div className="fluent-player-bunny-video-grid-item-info-title">{v.name || v.uid}</div>
                                        <div className="fluent-player-bunny-video-grid-item-info-meta">
                                            <span>{formatDuration(v.duration)}</span>
                                            {v.require_signed_urls ? <span className="fluent-player-cf-stream-badge">{__('Private', 'fluent-player')}</span> : null}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className="fluent-player-bunny-action-button">
                <Button onClick={onCancel} className="components-button back-button fp-btn-secondary">
                    <BackArrowSmallSVG />
                    {__('Back to Media Selector', 'fluent-player')}
                </Button>
                <div className="fluent-player-bunny-action-button-group">
                    <Button onClick={openMediaUploader} className="components-button fp-btn-secondary r2-upload-button" disabled={loading || isUploading}>
                        <UploadIconSVG />
                        {isUploading ? __('Uploading…', 'fluent-player') : __('Upload Video', 'fluent-player')}
                    </Button>
                </div>
            </div>

            {videoToEdit && (
                <div className="fluent-player-bunny-modal-overlay">
                    <div className="fluent-player-bunny-modal-content">
                        <div className="fluent-player-bunny-modal-header">
                            <h2>{__('Edit Video Title', 'fluent-player')}</h2>
                            <button className="fluent-player-bunny-close-modal" type="button" onClick={() => { setVideoToEdit(null); setEditVideoTitle(''); }}>
                                <CloseIconSVG />
                            </button>
                        </div>
                        <div className="fluent-player-bunny-modal-body">
                            <div className="fluent-player-bunny-form-row">
                                <label>{__('Video Title', 'fluent-player')}</label>
                                <input
                                    type="text"
                                    value={editVideoTitle}
                                    autoFocus
                                    onChange={(e) => setEditVideoTitle(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') updateVideoTitle(); }}
                                    placeholder={__('Enter video title', 'fluent-player')}
                                    className="fluent-player-bunny-form-control"
                                />
                            </div>
                        </div>
                        <div className="fluent-player-bunny-modal-footer">
                            <Button onClick={() => { setVideoToEdit(null); setEditVideoTitle(''); }} className="fp-btn-secondary">
                                {__('Cancel', 'fluent-player')}
                            </Button>
                            <Button onClick={updateVideoTitle} disabled={!editVideoTitle.trim()} className="fp-btn-primary">
                                {__('Save', 'fluent-player')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmPopover
                isOpen={!!deleteTarget}
                anchor={deleteAnchor}
                title={__('Delete Video', 'fluent-player')}
                message={__('Delete this video from Cloudflare Stream? This cannot be undone.', 'fluent-player')}
                confirmText={__('Delete', 'fluent-player')}
                cancelText={__('Cancel', 'fluent-player')}
                onConfirm={deleteVideo}
                onCancel={() => { setDeleteTarget(null); setDeleteAnchor(null); }}
            />
        </div>
    );
};

export default CloudflareStream;
