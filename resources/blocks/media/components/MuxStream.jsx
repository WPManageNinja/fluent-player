const { useState, useEffect, useCallback } = wp.element;
const { __ } = wp.i18n;
const { Button, SelectControl } = wp.components;
const apiFetch = wp.apiFetch;
import ConfirmPopover from './common/ConfirmPopover.jsx';
import Skeleton from './common/Skeleton.jsx';
import useNotification from './common/useNotification.js';
import { BackArrowSmallSVG, DeleteIconSVG, CloseIconSVG } from './common/Icons.jsx';
import { detectStreamAudioHint } from './common/detectStreamAudioHint.js';
import { defaultPostStatus } from '@share/helper.js';

const CopyIconSVG = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M7 3.75C7 3.33579 7.33579 3 7.75 3H14.25C14.6642 3 15 3.33579 15 3.75V12.25C15 12.6642 14.6642 13 14.25 13H13V14.5H14.25C15.4926 14.5 16.5 13.4926 16.5 12.25V3.75C16.5 2.50736 15.4926 1.5 14.25 1.5H7.75C6.50736 1.5 5.5 2.50736 5.5 3.75V5H7V3.75ZM3.5 7.75C3.5 6.50736 4.50736 5.5 5.75 5.5H12.25C13.4926 5.5 14.5 6.50736 14.5 7.75V16.25C14.5 17.4926 13.4926 18.5 12.25 18.5H5.75C4.50736 18.5 3.5 17.4926 3.5 16.25V7.75ZM5.75 7C5.33579 7 5 7.33579 5 7.75V16.25C5 16.6642 5.33579 17 5.75 17H12.25C12.6642 17 13 16.6642 13 16.25V7.75C13 7.33579 12.6642 7 12.25 7H5.75Z" fill="currentColor" />
    </svg>
);

const EyeIconSVG = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 4.5C5.81818 4.5 2.28182 7.07727 1 10.75C2.28182 14.4227 5.81818 17 10 17C14.1818 17 17.7182 14.4227 19 10.75C17.7182 7.07727 14.1818 4.5 10 4.5ZM10 14.9167C7.70182 14.9167 5.83636 13.0495 5.83636 10.75C5.83636 8.45045 7.70182 6.58333 10 6.58333C12.2982 6.58333 14.1636 8.45045 14.1636 10.75C14.1636 13.0495 12.2982 14.9167 10 14.9167ZM10 8.25C8.61818 8.25 7.50909 9.36045 7.50909 10.75C7.50909 12.1395 8.61818 13.25 10 13.25C11.3818 13.25 12.4909 12.1395 12.4909 10.75C12.4909 9.36045 11.3818 8.25 10 8.25Z" fill="currentColor" />
    </svg>
);

const EyeOffIconSVG = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M2.70711 1.29289L1.29289 2.70711L4.34233 5.75655C2.78922 6.93585 1.54578 8.58776 1 10.75C2.28182 14.4227 5.81818 17 10 17C11.5668 17 13.0432 16.5998 14.3345 15.9017L17.2929 18.8601L18.7071 17.4459L2.70711 1.29289ZM10 14.9167C7.70182 14.9167 5.83636 13.0495 5.83636 10.75C5.83636 10.0741 6.01364 9.44318 6.31818 8.89318L7.69091 10.2659C7.66364 10.4218 7.63636 10.5818 7.63636 10.75C7.63636 12.0568 8.69273 13.1136 10 13.1136C10.1682 13.1136 10.3318 13.0864 10.4845 13.0591L11.8573 14.4318C11.2909 14.7409 10.6636 14.9167 10 14.9167ZM19 10.75C17.9 13.9273 15.2045 16.2318 12.0273 17L10.2818 15.2545C12.6727 14.85 14.1636 13.0091 14.1636 10.75C14.1636 10.0864 14.0045 9.45909 13.7273 8.89091L16.5818 6.03636C17.6364 7.24545 18.4727 8.95909 19 10.75ZM10 6.58333C10.1364 6.58333 10.2682 6.59242 10.4 6.60606L6.60606 10.4C6.59242 10.2682 6.58333 10.1364 6.58333 10C6.58333 8.00909 8.00909 6.58333 10 6.58333Z" fill="currentColor" />
    </svg>
);

const MuxStream = ({
    attributes,
    setAttributes,
    mediaData,
    setMediaData,
    onCancel,
    defaultSettings,
    setSelectedMedia,
    saveMediaToServer
}) => {
    const { showNotification } = useNotification();
    const [liveStreams, setLiveStreams] = useState([]);
    const [isLoadingLive, setIsLoadingLive] = useState(true);
    const [viewingStream, setViewingStream] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newStreamName, setNewStreamName] = useState('');
    const [latencyMode, setLatencyMode] = useState('standard');
    const [showStreamKey, setShowStreamKey] = useState(false);
    const liveStatusPollRef = wp.element.useRef(null);

    // Delete popover state
    const [streamToDelete, setStreamToDelete] = useState(null);
    const [deleteConfirmAnchor, setDeleteConfirmAnchor] = useState(null);

    const blockVars = window.fluentPlayerBlockVars || {};
    const apiRequestPath = `${blockVars.rest?.namespace}/${blockVars.rest?.version}`;

    const fetchLiveStreams = useCallback(async () => {
        setIsLoadingLive(true);
        try {
            const response = await apiFetch({
                path: `${apiRequestPath}/mux/live-streams`,
            });
            setLiveStreams(response?.items || []);
        } catch (err) {
            showNotification({
                type: 'error',
                message: err?.message || __('Failed to load live streams', 'fluent-player'),
                duration: 5000,
                position: 'top-right'
            });
        } finally {
            setIsLoadingLive(false);
        }
    }, [apiRequestPath, showNotification]);

    useEffect(() => {
        fetchLiveStreams();
    }, [fetchLiveStreams]);

    // Clean up polling on unmount
    useEffect(() => {
        return () => {
            if (liveStatusPollRef.current) {
                clearInterval(liveStatusPollRef.current);
            }
        };
    }, []);

    const createLiveStream = async () => {
        if (!newStreamName.trim()) {
            showNotification({
                type: 'warning',
                message: __('Please enter a stream name', 'fluent-player'),
                duration: 3000,
                position: 'top-right'
            });
            return;
        }

        try {
            await apiFetch({
                path: `${apiRequestPath}/mux/live-streams`,
                method: 'POST',
                data: {
                    name: newStreamName.trim(),
                    latency_mode: latencyMode,
                    playback_policy: 'public',
                },
            });

            showNotification({
                type: 'success',
                message: __('Live stream created', 'fluent-player'),
                duration: 3000,
                position: 'top-right'
            });

            setNewStreamName('');
            setLatencyMode('standard');
            setShowCreateForm(false);
            fetchLiveStreams();
        } catch (err) {
            showNotification({
                type: 'error',
                message: err?.message || __('Failed to create live stream', 'fluent-player'),
                duration: 5000,
                position: 'top-right'
            });
        }
    };

    const handleSelectLiveStream = async (stream) => {
        const streamPlaybackId = stream.playback_ids?.[0]?.id || stream.playback_id || '';
        if (!streamPlaybackId) {
            showNotification({
                type: 'error',
                message: __('No playback ID found for this stream', 'fluent-player'),
                duration: 5000,
                position: 'top-right'
            });
            return;
        }

        // Determine if the stream has a completed VOD recording
        const vodAssetId = stream.active_asset_id ||
            (stream.recent_asset_ids && stream.recent_asset_ids.length > 0 ? stream.recent_asset_ids[0] : null);
        const isCurrentlyLive = stream.status === 'active';
        const hasRecording = !isCurrentlyLive && !!vodAssetId;

        // For completed streams, fetch the VOD asset to get its playback ID
        let playbackId = streamPlaybackId;
        let vodDuration = 0;
        if (hasRecording && vodAssetId) {
            try {
                const asset = await apiFetch({
                    path: `${apiRequestPath}/mux/assets/${vodAssetId}`,
                });
                const assetData = asset?.data || asset;
                const vodPlaybackId = assetData?.playback_ids?.[0]?.id || assetData?.public_playback_id || '';
                if (vodPlaybackId) {
                    playbackId = vodPlaybackId;
                }
                vodDuration = assetData?.duration || 0;
            } catch (err) {
                showNotification({
                    type: 'error',
                    message: err?.message || __('Failed to load VOD recording. Using live stream playback ID.', 'fluent-player'),
                    duration: 5000,
                    position: 'top-right'
                });
            }
        }

        const isLive = isCurrentlyLive;
        const streamTitle = stream.passthrough || stream.name || stream.id?.substring(0, 20) || __('Live Stream', 'fluent-player');
        const videoSrc = `https://stream.mux.com/${playbackId}.m3u8`;
        const posterSrc = hasRecording ? `https://image.mux.com/${playbackId}/thumbnail.jpg?width=1280&fit_mode=smartcrop` : '';
        const defaultPresetSlug = window.fluentPlayerBlockVars?.defaultPreset?.slug ||
                                  defaultSettings?.defaultPresetSlug ||
                                  defaultSettings?.preset_slug ||
                                  'course';

        const streamIsAudio = detectStreamAudioHint('mux_stream', stream);
        const updatedMediaData = {
            title: streamTitle,
            settings: {
                provider: 'mux_stream',
                src: videoSrc,
                posterSrc: posterSrc,
                title: streamTitle,
                post_status: defaultPostStatus(),
                streamType: isLive ? 'live' : 'on-demand',
                autoplay: isLive,
                loadStrategy: isLive ? 'eager' : 'visible',
                viewType: streamIsAudio ? 'audio' : 'video',
                mediaType: streamIsAudio ? 'audio' : 'video',
                playsInline: true,
                mutedAutoplay: false,
                aspectRatio: 'default',
                preset_slug: defaultPresetSlug,
                duration: vodDuration,
                mux: {
                    live_stream_id: stream.id || '',
                    playback_id: playbackId,
                    asset_id: hasRecording ? vodAssetId : '',
                    status: stream.status || 'idle',
                    is_live: isLive,
                    is_audio: streamIsAudio,
                    duration: vodDuration,
                },
            }
        };

        saveMediaToServer(updatedMediaData);
        setAttributes({
            preview: true,
            provider: 'mux_stream',
            mux: {
                live_stream_id: stream.id || '',
                playback_id: playbackId,
            }
        });
    };

    const viewStreamDetails = async (stream) => {
        setViewingStream(stream);
        setShowStreamKey(false);

        // Clear any existing poll
        if (liveStatusPollRef.current) {
            clearInterval(liveStatusPollRef.current);
        }

        // Start polling stream status every 5 seconds
        liveStatusPollRef.current = setInterval(async () => {
            try {
                const response = await apiFetch({
                    path: `${apiRequestPath}/mux/live-streams/${stream.id}`,
                });
                const updatedStream = response?.data || response;
                if (updatedStream) {
                    setViewingStream(updatedStream);
                }
            } catch {
                // Silently fail on poll errors
            }
        }, 5000);
    };

    const resetStreamKey = async (streamId) => {
        try {
            const response = await apiFetch({
                path: `${apiRequestPath}/mux/live-streams/${streamId}/reset-stream-key`,
                method: 'POST',
            });

            const updatedStream = response?.data || response;
            if (updatedStream) {
                setViewingStream(updatedStream);
            }

            showNotification({
                type: 'success',
                message: __('Stream key has been reset', 'fluent-player'),
                duration: 3000,
                position: 'top-right'
            });
        } catch (err) {
            showNotification({
                type: 'error',
                message: err?.message || __('Failed to reset stream key', 'fluent-player'),
                duration: 5000,
                position: 'top-right'
            });
        }
    };

    const showDeleteConfirmation = (stream, event) => {
        event.stopPropagation();
        setStreamToDelete(stream);
        setDeleteConfirmAnchor(event.currentTarget);
    };

    const hideDeleteConfirmation = () => {
        setStreamToDelete(null);
        setDeleteConfirmAnchor(null);
    };

    const deleteLiveStream = async () => {
        if (!streamToDelete) return;

        try {
            await apiFetch({
                path: `${apiRequestPath}/mux/live-streams/${streamToDelete.id}`,
                method: 'DELETE',
            });

            hideDeleteConfirmation();

            if (viewingStream?.id === streamToDelete.id) {
                setViewingStream(null);
                if (liveStatusPollRef.current) {
                    clearInterval(liveStatusPollRef.current);
                }
            }

            showNotification({
                type: 'success',
                message: __('Live stream deleted', 'fluent-player'),
                duration: 3000,
                position: 'top-right'
            });

            fetchLiveStreams();
        } catch (err) {
            showNotification({
                type: 'error',
                message: err?.message || __('Failed to delete live stream', 'fluent-player'),
                duration: 5000,
                position: 'top-right'
            });
            hideDeleteConfirmation();
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            showNotification({
                type: 'success',
                message: __('Copied to clipboard', 'fluent-player'),
                duration: 2000,
                position: 'top-right'
            });
        }).catch(() => {
            showNotification({
                type: 'error',
                message: __('Failed to copy', 'fluent-player'),
                duration: 3000,
                position: 'top-right'
            });
        });
    };

    const getStreamTitle = (stream) => {
        return stream.passthrough || stream.name || stream.id?.substring(0, 20) || __('Untitled', 'fluent-player');
    };

    const getStreamStatus = (stream) => {
        return stream.status || 'idle';
    };

    const getStreamKey = (stream) => {
        return stream.stream_key || '';
    };

    const getPlaybackId = (stream) => {
        return stream.playback_ids?.[0]?.id || stream.playback_id || '';
    };

    // Detail panel view
    if (viewingStream) {
        const streamKey = getStreamKey(viewingStream);
        const playbackId = getPlaybackId(viewingStream);
        const status = getStreamStatus(viewingStream);

        return (
            <div className="fluent-player-bunny">
                <div className="fluent-player-stream-detail">
                    <h5>{getStreamTitle(viewingStream)}</h5>

                    <div className="fluent-player-stream-detail-row">
                        <span className="fluent-player-stream-detail-row-label">{__('Status', 'fluent-player')}</span>
                        <div>
                            <span className={`fluent-player-live-status fluent-player-live-status--${status === 'active' ? 'active' : 'idle'}`}>
                                <span className="fluent-player-live-status-dot"></span>
                                {status === 'active' ? __('Active', 'fluent-player') : __('Idle', 'fluent-player')}
                            </span>
                        </div>
                    </div>

                    <div className="fluent-player-stream-detail-row">
                        <span className="fluent-player-stream-detail-row-label">{__('RTMP URL', 'fluent-player')}</span>
                        <div className="fluent-player-stream-detail-row-value">
                            <span style={{ flex: 1 }}>rtmp://global-live.mux.com:5222/app</span>
                            <Button
                                className="fp-icon-btn"
                                onClick={() => copyToClipboard('rtmp://global-live.mux.com:5222/app')}
                                title={__('Copy', 'fluent-player')}
                            >
                                <CopyIconSVG />
                            </Button>
                        </div>
                    </div>

                    <div className="fluent-player-stream-detail-row">
                        <span className="fluent-player-stream-detail-row-label">{__('RTMPS URL (Secure)', 'fluent-player')}</span>
                        <div className="fluent-player-stream-detail-row-value">
                            <span style={{ flex: 1 }}>rtmps://global-live.mux.com:443/app</span>
                            <Button
                                className="fp-icon-btn"
                                onClick={() => copyToClipboard('rtmps://global-live.mux.com:443/app')}
                                title={__('Copy', 'fluent-player')}
                            >
                                <CopyIconSVG />
                            </Button>
                        </div>
                    </div>

                    {streamKey && (
                        <div className="fluent-player-stream-detail-row">
                            <span className="fluent-player-stream-detail-row-label">{__('Stream Key', 'fluent-player')}</span>
                            <div className="fluent-player-stream-detail-row-value">
                                <span style={{ flex: 1 }}>{showStreamKey ? streamKey : '••••••••••••••••'}</span>
                                <Button
                                    className="fp-icon-btn"
                                    onClick={() => setShowStreamKey(!showStreamKey)}
                                    title={showStreamKey ? __('Hide', 'fluent-player') : __('Show', 'fluent-player')}
                                >
                                    {showStreamKey ? <EyeOffIconSVG /> : <EyeIconSVG />}
                                </Button>
                                <Button
                                    className="fp-icon-btn"
                                    onClick={() => copyToClipboard(streamKey)}
                                    title={__('Copy', 'fluent-player')}
                                >
                                    <CopyIconSVG />
                                </Button>
                            </div>
                        </div>
                    )}

                    {playbackId && (
                        <div className="fluent-player-stream-detail-row">
                            <span className="fluent-player-stream-detail-row-label">{__('Playback URL', 'fluent-player')}</span>
                            <div className="fluent-player-stream-detail-row-value">
                                <span style={{ flex: 1 }}>{`https://stream.mux.com/${playbackId}.m3u8`}</span>
                                <Button
                                    className="fp-icon-btn"
                                    onClick={() => copyToClipboard(`https://stream.mux.com/${playbackId}.m3u8`)}
                                    title={__('Copy', 'fluent-player')}
                                >
                                    <CopyIconSVG />
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="fluent-player-stream-detail-actions">
                        <Button
                            className="components-button fp-btn-secondary"
                            onClick={() => {
                                if (liveStatusPollRef.current) {
                                    clearInterval(liveStatusPollRef.current);
                                }
                                setViewingStream(null);
                            }}
                        >
                            <BackArrowSmallSVG />
                            {__('Back to Streams', 'fluent-player')}
                        </Button>
                        <Button
                            className="components-button fp-btn-secondary"
                            onClick={() => resetStreamKey(viewingStream.id)}
                        >
                            {__('Reset Stream Key', 'fluent-player')}
                        </Button>
                        <Button
                            className="components-button fp-btn-primary"
                            onClick={() => handleSelectLiveStream(viewingStream)}
                        >
                            {__('Use This Stream', 'fluent-player')}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Create form view
    if (showCreateForm) {
        return (
            <div className="fluent-player-bunny">
                <h5>{__('Create Live Stream', 'fluent-player')}</h5>

                <div className="fluent-player-bunny-form-row">
                    <label>{__('Stream Name', 'fluent-player')}</label>
                    <input
                        type="text"
                        value={newStreamName}
                        onChange={(e) => setNewStreamName(e.target.value)}
                        placeholder={__('Enter stream name', 'fluent-player')}
                        className="fluent-player-bunny-form-control"
                    />
                </div>

                <div className="fluent-player-bunny-form-row">
                    <SelectControl
                        label={__('Latency Mode', 'fluent-player')}
                        value={latencyMode}
                        options={[
                            { value: 'standard', label: __('Standard (~30s)', 'fluent-player') },
                            { value: 'reduced', label: __('Reduced (~10-15s)', 'fluent-player') },
                            { value: 'low', label: __('Low (~5s)', 'fluent-player') },
                        ]}
                        onChange={setLatencyMode}
                    />
                </div>

                <div className="fluent-player-bunny-action-button">
                    <Button
                        className="components-button fp-btn-secondary"
                        onClick={() => setShowCreateForm(false)}
                    >
                        {__('Cancel', 'fluent-player')}
                    </Button>
                    <Button
                        className="components-button fp-btn-primary"
                        onClick={createLiveStream}
                        disabled={!newStreamName.trim()}
                    >
                        {__('Create Stream', 'fluent-player')}
                    </Button>
                </div>
            </div>
        );
    }

    // List view (default)
    return (
        <div className="fluent-player-bunny">
            {!isLoadingLive && (
                <div className="fluent-player-bunny-toolbar">
                    <div></div>
                    <Button
                        className="components-button fp-btn-primary"
                        onClick={() => setShowCreateForm(true)}
                    >
                        {__('Create Live Stream', 'fluent-player')}
                    </Button>
                </div>
            )}

            {isLoadingLive ? (
                <div className="fluent-player-bunny-content">
                    <div className="fluent-player-bunny-video">
                        <h5>{__('Live Streams', 'fluent-player')}</h5>
                        <Skeleton.VideoCardGrid count={4} />
                    </div>
                </div>
            ) : (
                <div className="fluent-player-bunny-content">
                    <div className="fluent-player-bunny-video">
                        <h5>{__('Live Streams', 'fluent-player')}</h5>
                        {!liveStreams || liveStreams.length === 0 ? (
                            <div className="fluent-player-bunny-video-error">
                                <p>{__('No live streams found. Create one to get started.', 'fluent-player')}</p>
                            </div>
                        ) : (
                            <div className="fluent-player-bunny-video-grid">
                                {liveStreams.map((stream) => {
                                    const status = getStreamStatus(stream);
                                    return (
                                        <div
                                            key={stream.id}
                                            className="fluent-player-bunny-video-grid-item"
                                            onClick={() => handleSelectLiveStream(stream)}
                                        >
                                            <div className="fluent-player-bunny-video-grid-item-action">
                                                <Button
                                                    className="fluent-player-bunny-video-grid-item-action-btn fp-icon-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        viewStreamDetails(stream);
                                                    }}
                                                    title={__('View details', 'fluent-player')}
                                                >
                                                    <EyeIconSVG />
                                                </Button>
                                                <Button
                                                    className="fluent-player-bunny-video-grid-item-action-btn fp-icon-btn"
                                                    onClick={(e) => showDeleteConfirmation(stream, e)}
                                                    title={__('Delete stream', 'fluent-player')}
                                                >
                                                    <DeleteIconSVG />
                                                </Button>
                                            </div>
                                            <div className="fluent-player-bunny-video-grid-item-thumbnail">
                                                <div className="fluent-player-bunny-video-encoding-placeholder">
                                                    <span className="dashicons dashicons-video-alt3"></span>
                                                </div>
                                                <div className={`fluent-player-bunny-video-grid-item-duration`}>
                                                    <span className={`fluent-player-live-status fluent-player-live-status--${status === 'active' ? 'active' : 'idle'}`}>
                                                        <span className="fluent-player-live-status-dot"></span>
                                                        {status === 'active' ? __('Active', 'fluent-player') : __('Idle', 'fluent-player')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="fluent-player-bunny-video-grid-item-info">
                                                <div className="fluent-player-bunny-video-grid-item-info-title" title={getStreamTitle(stream)}>
                                                    {getStreamTitle(stream)}
                                                </div>
                                                <div className="fluent-player-bunny-video-grid-item-info-meta">
                                                    <span>{__('Live Stream', 'fluent-player')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
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
            </div>

            <ConfirmPopover
                isOpen={!!streamToDelete}
                anchor={deleteConfirmAnchor}
                title={__('Delete Live Stream', 'fluent-player')}
                message={__('Are you sure you want to delete this live stream? This action cannot be undone.', 'fluent-player')}
                confirmText={__('Delete', 'fluent-player')}
                cancelText={__('Cancel', 'fluent-player')}
                onConfirm={deleteLiveStream}
                onCancel={hideDeleteConfirmation}
            />
        </div>
    );
};

export default MuxStream;
