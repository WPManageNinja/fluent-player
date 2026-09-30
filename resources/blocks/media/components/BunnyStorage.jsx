const { useState, useEffect, useMemo } = wp.element;
const { __ } = wp.i18n;
const { Button } = wp.components;
const apiFetch = wp.apiFetch;
import ConfirmPopover from './common/ConfirmPopover.jsx';
import Skeleton from './common/Skeleton.jsx';
import useNotification from './common/useNotification.js';
import { BackArrowSmallSVG, UploadIconSVG, DirectoryIconSVG, DeleteIconSVG, PlusIconSVG, SearchIconSVG, CloseIconSVG } from './common/Icons.jsx';
import { isAudioSource } from '../../../js/utils/videoSrc.js';
import { defaultPostStatus } from '@share/helper.js';
import { canManageProviders } from './common/capabilities.js';

const BunnyStorage = ({
    onCancel,
    setAttributes,
    setSelectedMedia,
    setMediaData,
    mediaData,
    defaultSettings,
    saveMediaToServer
}) => {
    const [videos, setVideos] = useState([]);
    const [directories, setDirectories] = useState([]);
    const [currentPath, setCurrentPath] = useState('');
    const [parentPath, setParentPath] = useState('');
    const [videoLoading, setVideoLoading] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const canManage = canManageProviders();
    const { showNotification, updateNotification, hideNotification } = useNotification();
    const [isSelecting, setIsSelecting] = useState(false);
    const [videoToDelete, setVideoToDelete] = useState(null);
    const [deleteConfirmAnchor, setDeleteConfirmAnchor] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [createFolderModalVisible, setCreateFolderModalVisible] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    let mediaUploader = null;

    // Filter videos client-side based on search query
    const filteredVideos = useMemo(() => {
        if (!searchQuery.trim()) return videos;

        const query = searchQuery.toLowerCase().trim();
        return videos.filter(video => {
            const fileName = video.title.split('/').pop().toLowerCase();
            return fileName.includes(query);
        });
    }, [videos, searchQuery]);

    // Filter directories client-side based on search query
    const filteredDirectories = useMemo(() => {
        if (!searchQuery.trim()) return directories;

        const query = searchQuery.toLowerCase().trim();
        return directories.filter(dir => dir.name.toLowerCase().includes(query));
    }, [directories, searchQuery]);

    const loadStorageVideos = async (path = '') => {
        setVideoLoading(true);
        setVideos([]);
        setDirectories([]);

        try {
            const response = await apiFetch({
                path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/bunny/storage/videos?path=${encodeURIComponent(path)}`
            });

            if (response && (response.videos || response.directories)) {
                setVideos(response.videos || []);
                setDirectories(response.directories || []);
                setCurrentPath(response.current_path || '');
                setParentPath(response.parent_path || '');

                if (selectedVideo && mediaData?.settings?.bunny_storage) {
                    const filePath = mediaData.settings.bunny_storage.file_path;
                    const matchingVideo = response.videos.find(v => v.title === filePath);
                    if (matchingVideo) {
                        selectVideo(matchingVideo);
                    }
                }
            } else {
                showNotification({
                    type: 'error',
                    message: response?.message || __('Failed to load videos', 'fluent-player'),
                    duration: 5000,
                    position: 'top-right'
                });
            }
        } catch (error) {
            console.error('Failed to load videos:', error);
            showNotification({
                type: 'error',
                message: __('Failed to load videos', 'fluent-player') + ': ' + (error.message || 'Unknown error'),
                duration: 6000,
                position: 'top-right'
            });
        } finally {
            setVideoLoading(false);
        }
    };

    const navigateToDirectory = (directory) => {
        loadStorageVideos(directory.path);
    };

    const navigateToParent = () => {
        if (parentPath) {
            loadStorageVideos(parentPath);
        }
    };

    const navigateToBreadcrumb = (breadcrumb) => {
        loadStorageVideos(breadcrumb.path);
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Probe an MP4 URL to extract duration from metadata
    const probeVideoDuration = (url) => {
        return new Promise((resolve) => {
            if (!url) return resolve(0);

            const vid = document.createElement('video');
            vid.preload = 'metadata';

            vid.addEventListener('loadedmetadata', () => {
                const duration = isFinite(vid.duration) ? Math.round(vid.duration) : 0;
                vid.removeAttribute('src');
                vid.load();
                resolve(duration);
            }, { once: true });

            vid.addEventListener('error', () => {
                vid.removeAttribute('src');
                vid.load();
                resolve(0);
            }, { once: true });

            vid.src = url;
        });
    };

    const selectVideo = async (video) => {
        if (!video) {
            console.error('Video not available');
            showNotification({
                type: 'error',
                message: __('Unable to select video: Missing data', 'fluent-player'),
                duration: 5000,
                position: 'top-right'
            });
            return;
        }

        if (isSelecting) return;
        setIsSelecting(true);

        try {
            setSelectedVideo(video);

            const defaultPresetSlug = window.fluentPlayerBlockVars?.defaultPreset?.slug ||
                                   defaultSettings?.defaultPresetSlug ||
                                   defaultSettings?.preset_slug ||
                                   'course';

            // Use CDN URL for public access
            const videoSrc = video.url;

            // Probe the MP4 to get duration (poster is auto-captured by Vidstack on playback)
            const probedDuration = await probeVideoDuration(videoSrc);

            // Bunny Storage keeps the real file (no transcode), so the stored filename's
            // extension is authoritative. Prefer the list's is_audio flag, else detect
            // from the file path.
            const isAudio = (typeof video.is_audio !== 'undefined')
                ? !!video.is_audio
                : isAudioSource({ src: video.title || '' });

            const updatedMediaData = {
                title: video.title.split('/').pop() || __('Untitled Bunny Storage Video', 'fluent-player'),
                settings: {
                    provider: 'bunny_storage',
                    src: videoSrc,
                    posterSrc: '',
                    title: video.title.split('/').pop() || __('Untitled Bunny Storage Video', 'fluent-player'),
                    post_status: defaultPostStatus(),
                    viewType: isAudio ? 'audio' : 'video',
                    playsInline: true,
                    mutedAutoplay: false,
                    autoplay: false,
                    loadStrategy: 'visible',
                    aspectRatio: 'default',
                    preset_slug: defaultPresetSlug || defaultSettings?.defaultPresetSlug || 'course',
                    bunny_storage: {
                        file_path: video.title,
                        title: video.title.split('/').pop(),
                        size: video.size || 0,
                        url: video.url,
                        updated_at: video.updated_at,
                        created_at: video.created_at,
                        is_audio: isAudio
                    },
                    streamType: 'on-demand',
                    mediaType: isAudio ? 'audio' : 'video',
                    duration: probedDuration
                }
            };

            // Save the media to server
            if (typeof saveMediaToServer === 'function') {
                await saveMediaToServer(updatedMediaData);
            } else {
                console.error('BunnyStorage selectVideo - saveMediaToServer function not available');

                if (typeof setMediaData === 'function') {
                    setMediaData(updatedMediaData);
                }

                if (typeof setSelectedMedia === 'function') {
                    setSelectedMedia('new-media');
                }
            }

            if (typeof setAttributes === 'function') {
                setAttributes({
                    preview: true,
                    provider: 'bunny_storage',
                    bunny_storage: {
                        file_path: video.title,
                        title: video.title.split('/').pop(),
                        size: video.size || 0,
                        url: video.url,
                        updated_at: video.updated_at,
                        created_at: video.created_at
                    }
                });
            }

        } catch (error) {
            console.error('Error selecting video:', error);
        } finally {
            setTimeout(() => {
                setIsSelecting(false);
            }, 1000);
        }
    };

    const showDeleteConfirmation = (video, event) => {
        event.stopPropagation();
        setVideoToDelete(video);
        setDeleteConfirmAnchor(event.currentTarget);
    };

    const hideDeleteConfirmation = () => {
        setVideoToDelete(null);
        setDeleteConfirmAnchor(null);
    };

    const startSimulatedProgress = (attachment, onProgress) => {
        const estimatedFileSize = attachment?.filesize ? Math.ceil(attachment.filesize / 1024 / 1024) : 10;
        const totalSteps = 90;
        const interval = Math.max(100, Math.min(500, estimatedFileSize * 20));

        const progressCurve = Array(totalSteps).fill().map((_, i) => {
            if (i < totalSteps * 0.1) {
                return (i / (totalSteps * 0.1)) * 10;
            }
            if (i < totalSteps * 0.7) {
                return 10 + ((i - totalSteps * 0.1) / (totalSteps * 0.6)) * 70;
            }
            return 80 + ((i - totalSteps * 0.7) / (totalSteps * 0.3)) * 10;
        });

        let step = 0;
        return setInterval(() => {
            if (step < progressCurve.length) {
                const p = Math.round(progressCurve[step]);
                if (typeof onProgress === 'function') onProgress(p);
                step++;
            }
        }, interval);
    };

    // Open WordPress media uploader
    const openMediaUploader = () => {
        if (typeof wp === 'undefined' || !wp.media) {
            showNotification({
                type: 'error',
                message: __('WordPress Media Library is not available', 'fluent-player'),
                duration: 5000,
                position: 'top-right'
            });
            return;
        }

        if (mediaUploader) {
            mediaUploader.open();
            return;
        }

        mediaUploader = wp.media({
            title: __('Select or Upload Video', 'fluent-player'),
            button: {
                text: __('Use this video', 'fluent-player')
            },
            multiple: false,
            library: {
                type: ['video', 'audio']
            }
        });

        mediaUploader.on('select', function() {
            const attachment = mediaUploader.state().get('selection').first().toJSON();
            uploadVideo(attachment);
        });

        mediaUploader.open();
    };

    const uploadVideo = async (attachment) => {
        setIsUploading(true);
        const notifId = showNotification({
            type: 'info',
            message: __('Uploading... 0%', 'fluent-player'),
            progress: 0,
            duration: 0,
            position: 'top-right'
        });

        const progressInterval = startSimulatedProgress(attachment, (p) => {
            updateNotification(notifId, {
                message: __('Uploading...', 'fluent-player') + ` ${p}%`,
                progress: p
            });
        });

        try {
            const fileName = attachment.filename || (attachment.url ? attachment.url.split('/').pop().split('?')[0] : attachment.title || 'video');
            await apiFetch({
                path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/bunny/storage/videos/upload`,
                method: 'POST',
                data: {
                    attachment_id: attachment.id,
                    file_name: fileName,
                    directory: currentPath
                }
            });

            clearInterval(progressInterval);
            updateNotification(notifId, {
                type: 'success',
                message: __('Upload complete', 'fluent-player'),
                progress: 100
            });
            await loadStorageVideos(currentPath);
            setTimeout(() => hideNotification(notifId), 2000);
        } catch (err) {
            clearInterval(progressInterval);
            updateNotification(notifId, {
                type: 'error',
                message: __('Upload failed', 'fluent-player') + ': ' + (err.message || 'Unknown error'),
                progress: undefined
            });
            setTimeout(() => hideNotification(notifId), 4000);
        } finally {
            setIsUploading(false);
        }
    };

    // Delete video with confirmation
    const deleteVideo = async () => {
        if (!videoToDelete) return;

        try {
            const response = await apiFetch({
                path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/bunny/storage/videos/delete`,
                method: 'DELETE',
                data: {
                    file_name: videoToDelete.title
                }
            });

            if (response && response.message) {
                hideDeleteConfirmation();

                if (selectedVideo && selectedVideo.title === videoToDelete.title) {
                    setSelectedVideo(null);

                    if (typeof setMediaData === 'function') {
                        setMediaData(prev => ({
                            ...prev,
                            settings: {
                                ...prev.settings,
                                bunny_storage: {},
                                src: ''
                            }
                        }));
                    }
                }

                await loadStorageVideos(currentPath);
            } else {
                showNotification({
                    type: 'error',
                    message: response?.message || __('Failed to delete video', 'fluent-player'),
                    duration: 5000,
                    position: 'top-right'
                });
                hideDeleteConfirmation();
            }
        } catch (error) {
            console.error('Failed to delete video:', error);
            showNotification({
                type: 'error',
                message: __('Failed to delete video', 'fluent-player') + ': ' + (error.message || 'Unknown error'),
                duration: 6000,
                position: 'top-right'
            });
            hideDeleteConfirmation();
        }
    };

    const isVideoSelected = (video) => {
        return selectedVideo && selectedVideo.title === video.title;
    };

    // Create a new folder (async with immediate UI feedback)
    const createFolder = () => {
        if (!newFolderName.trim()) {
            return;
        }

        const folderName = newFolderName.trim();

        // Close modal immediately for better UX
        setNewFolderName('');
        setCreateFolderModalVisible(false);

        // Show progress notification
        const notifId = showNotification({
            type: 'info',
            message: __('Creating folder...', 'fluent-player'),
            duration: 0,
            position: 'top-right'
        });

        // Perform the creation asynchronously
        apiFetch({
            path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/bunny/storage/directories`,
            method: 'POST',
            data: {
                name: folderName,
                current_path: currentPath
            }
        })
            .then(() => {
                updateNotification(notifId, {
                    type: 'success',
                    message: __('Folder created successfully.', 'fluent-player')
                });
                setTimeout(() => hideNotification(notifId), 3000);

                // Reload the current directory in the background
                loadStorageVideos(currentPath);
            })
            .catch((error) => {
                console.error('Failed to create folder:', error);
                updateNotification(notifId, {
                    type: 'error',
                    message: __('Failed to create folder. Please try again.', 'fluent-player')
                });
                setTimeout(() => hideNotification(notifId), 4000);
            });
    };

    const getBreadcrumbs = () => {
        if (!currentPath) return [];

        const parts = currentPath.split('/').filter(part => part.length > 0);
        let path = '';

        return parts.map(part => {
            path += part + '/';
            return {
                name: part,
                path: path
            };
        });
    };

    useEffect(() => {
        loadStorageVideos();

        // If we're editing and already have a bunny_storage video selected
        if (mediaData?.settings?.bunny_storage && mediaData.settings.bunny_storage.file_path) {
            // Extract the directory path from the file path
            const filePath = mediaData.settings.bunny_storage.file_path;
            const lastSlashIndex = filePath.lastIndexOf('/');

            if (lastSlashIndex > 0) {
                // There's a directory path, navigate to it
                const dirPath = filePath.substring(0, lastSlashIndex + 1);
                loadStorageVideos(dirPath);
            } else {
                // No directory, just load the root
                loadStorageVideos();
            }

            setSelectedVideo({
                title: filePath,
                url: mediaData.settings.bunny_storage.url,
                size: mediaData.settings.bunny_storage.size
            });

        }
    }, []);

    // Render the component
    return (
        <div className="fluent-player-bunny">
            {!videoLoading && (
                <div className="fluent-player-bunny-toolbar">
                    <div className="fluent-player-bunny-breadcrumb">
                        <Button
                            isLink
                            onClick={() => {
                                setSearchQuery('');
                                loadStorageVideos('');
                            }}
                            disabled={videoLoading}
                        >
                            {__('Root', 'fluent-player')}
                        </Button>
                        {getBreadcrumbs().map((crumb, index) => (
                            <span key={index}>
                                <span className="fluent-player-bunny-breadcrumb-separator">/</span>
                                <Button
                                    isLink
                                    onClick={() => navigateToBreadcrumb(crumb)}
                                    disabled={videoLoading}
                                >
                                    {crumb.name}
                                </Button>
                            </span>
                        ))}
                    </div>
                    <div className="fluent-player-bunny-search">
                        <SearchIconSVG />
                        <input
                            type="text"
                            placeholder={__('Search files...', 'fluent-player')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="fluent-player-bunny-search-input"
                            disabled={videoLoading}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="fluent-player-bunny-search-clear"
                                onClick={() => setSearchQuery('')}
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>
            )}

            {videoLoading ? (
                <div className="fluent-player-bunny-content">
                    <div className="fluent-player-bunny-video">
                        <h5>{__('Videos', 'fluent-player')}</h5>
                        <Skeleton.VideoCardGrid count={6} />
                    </div>
                </div>
            ) : (
                <div className="fluent-player-bunny-content">
                    {filteredDirectories.length > 0 && (
                        <div className="fluent-player-bunny-directory">
                            <h5>{__('Directories', 'fluent-player')}</h5>
                            <div className="fluent-player-bunny-directory-grid">
                                {filteredDirectories.map((directory, index) => (
                                    <div
                                        key={index}
                                        className="fluent-player-bunny-directory-grid-item"
                                        onClick={() => navigateToDirectory(directory)}
                                    >
                                        <span className="fluent-player-bunny-directory-grid-item-icon"><DirectoryIconSVG /></span>
                                        <span className="fluent-player-bunny-directory-grid-item-name">{directory.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="fluent-player-bunny-video">
                        <h5>{__('Videos', 'fluent-player')}</h5>
                        {!filteredVideos || filteredVideos.length === 0 ? (
                            <div className="fluent-player-bunny-video-error">
                                <p>
                                    {searchQuery
                                        ? __('No videos match your search.', 'fluent-player')
                                        : __('No videos found in this directory.', 'fluent-player')}
                                </p>
                            </div>
                        ) : (
                            <div className="fluent-player-bunny-video-grid">
                                {filteredVideos.map((video, index) => (
                                    <div
                                        key={index}
                                        className={`fluent-player-bunny-video-grid-item ${isVideoSelected(video) ? 'selected' : ''}`}
                                        onClick={() => selectVideo(video)}
                                    >
                                        {canManage && (
                                        <div className="fluent-player-bunny-video-grid-item-action">
                                            <Button
                                                className="fluent-player-bunny-video-grid-item-action-btn fp-icon-btn"
                                                onClick={(e) => showDeleteConfirmation(video, e)}
                                                aria-label={__('Delete video', 'fluent-player') + ': ' + video.title.split('/').pop()}
                                                title={__('Delete video', 'fluent-player')}
                                            >
                                                <DeleteIconSVG />
                                            </Button>
                                        </div>
                                        )}
                                        <div className="fluent-player-bunny-video-grid-item-thumbnail">
                                            <span className="dashicons dashicons-video-alt3"></span>
                                        </div>
                                        <div className="fluent-player-bunny-video-grid-item-info">
                                            <div className="fluent-player-bunny-video-grid-item-info-title">{video.title.split('/').pop()}</div>
                                            <div className="fluent-player-bunny-video-grid-item-info-meta">
                                                <span>{formatBytes(video.size)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
                        onClick={openMediaUploader}
                        className="components-button fp-btn-secondary bunny-upload-button"
                        disabled={videoLoading || isUploading}
                    >
                        <UploadIconSVG />
                        {__('Upload Video', 'fluent-player')}
                    </Button>
                    <Button
                        onClick={() => setCreateFolderModalVisible(true)}
                        className="components-button fp-btn-secondary icon-lg-svg"
                    >
                        <PlusIconSVG />
                        {__('Create Folder', 'fluent-player')}
                    </Button>
                </div>
            </div>

            <ConfirmPopover
                isOpen={!!videoToDelete}
                anchor={deleteConfirmAnchor}
                title={__('Delete Video', 'fluent-player')}
                message={__('Are you sure you want to delete this video? This action cannot be undone.', 'fluent-player')}
                confirmText={__('Delete', 'fluent-player')}
                cancelText={__('Cancel', 'fluent-player')}
                onConfirm={deleteVideo}
                onCancel={hideDeleteConfirmation}
            />

            {createFolderModalVisible && (
                <div className="fluent-player-bunny-modal-overlay">
                    <div className="fluent-player-bunny-modal-content">
                        <div className="fluent-player-bunny-modal-header">
                            <h2>{__('Create Folder', 'fluent-player')}</h2>
                            <button
                                className="fluent-player-bunny-close-modal"
                                onClick={() => {
                                    setCreateFolderModalVisible(false);
                                    setNewFolderName('');
                                }}
                                type="button"
                            >
                                <CloseIconSVG />
                            </button>
                        </div>
                        <div className="fluent-player-bunny-modal-body">
                            <div className="fluent-player-bunny-form-row">
                                <label>{__('Folder Name', 'fluent-player')}</label>
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder={__('Enter folder name', 'fluent-player')}
                                    className="fluent-player-bunny-form-control"
                                />
                            </div>
                        </div>
                        <div className="fluent-player-bunny-modal-footer">
                            <Button
                                onClick={() => {
                                    setCreateFolderModalVisible(false);
                                    setNewFolderName('');
                                }}
                                className="fp-btn-secondary"
                            >
                                {__('Cancel', 'fluent-player')}
                            </Button>
                            <Button
                                onClick={createFolder}
                                disabled={!newFolderName.trim()}
                                className="fp-btn-primary"
                            >
                                {__('Create', 'fluent-player')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BunnyStorage;
