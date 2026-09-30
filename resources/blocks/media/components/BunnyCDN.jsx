const { useState, useEffect, useMemo, useCallback, useRef } = wp.element;
const { __ } = wp.i18n;
const { Button, SelectControl } = wp.components;
const apiFetch = wp.apiFetch;
import ConfirmPopover from './common/ConfirmPopover.jsx';
import Skeleton from './common/Skeleton.jsx';
import useNotification from './common/useNotification.js';
import { BackArrowSmallSVG, UploadIconSVG, DirectoryIconSVG, DeleteIconSVG, PlusIconSVG, EditIconSVG, SearchIconSVG, CloseIconSVG } from './common/Icons.jsx';
import { detectStreamAudioHint } from './common/detectStreamAudioHint.js';
import { defaultPostStatus } from '@share/helper.js';

// Debounce hook for search
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

const BunnyCDN = ({
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
    // Source audio flag by Bunny video id, captured from the upload MIME. Covers the
    // brief window before the metaTag propagates to the video list (getVideos).
    const audioByVideoId = useRef({});
    const [libraries, setLibraries] = useState([]);
    const [videos, setVideos] = useState([]);
    const [collections, setCollections] = useState([]);
    const [selectedLibrary, setSelectedLibrary] = useState('');
    const [selectedCollection, setSelectedCollection] = useState(null);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const [collectionLoading, setCollectionLoading] = useState(false);
    const [videoToDelete, setVideoToDelete] = useState(null);
    const [deleteConfirmAnchor, setDeleteConfirmAnchor] = useState(null);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [createCollectionModalVisible, setCreateCollectionModalVisible] = useState(false);
    const [collectionChangeByUser, setCollectionChangeByUser] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    const [videosLoadCompleted, setVideosLoadCompleted] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [collectionToEdit, setCollectionToEdit] = useState(null);
    const [collectionToDelete, setCollectionToDelete] = useState(null);
    const [editCollectionName, setEditCollectionName] = useState('');
    const [collectionDeleteAnchor, setCollectionDeleteAnchor] = useState(null);
    const [videoToEdit, setVideoToEdit] = useState(null);
    const [editVideoTitle, setEditVideoTitle] = useState('');
    let mediaUploader = null;

    // Debounced search query
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    // Fetch presets on component mount
    useEffect(() => {
        if (!window.fluentPlayerBlockVars?.defaultPreset) {
            apiFetch({
                path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/presets`
            }).then(response => {
                const defaultPreset = response.find(preset => preset.slug === defaultSettings.defaultPresetSlug);
                if (defaultPreset) {
                    if (!window.fluentPlayerBlockVars) {
                        window.fluentPlayerBlockVars = {};
                    }
                    window.fluentPlayerBlockVars.defaultPreset = defaultPreset;
                }
            }).catch(error => {
                console.error('Failed to load presets:', error);
            });
        }
    }, []);

    // Load libraries on component mount
    useEffect(() => {
        loadLibraries();
    }, []);

    // Load collections and videos when library is selected
    useEffect(() => {
        if (selectedLibrary) {
            setVideosLoadCompleted(false);
            const fetchCollections = async () => {
                await loadCollections();

                // Only load videos if we don't have a collection ID from editing
                // or if the collection wasn't found
                if (!mediaData?.settings?.bunny?.collection_id || !selectedCollection) {
                    loadVideos();
                }
            };

            fetchCollections();
        }
    }, [selectedLibrary]);

    // Load videos when collection changes, but only if it's a user action
    // not the initial setting from loadCollections
    useEffect(() => {
        if (selectedLibrary && selectedCollection !== undefined && collectionChangeByUser) {
            setVideosLoadCompleted(false);
            setCurrentPage(1);
            loadVideos();
            setCollectionChangeByUser(false);
        }
    }, [selectedCollection]);

    // Trigger search when debounced search query changes
    useEffect(() => {
        if (selectedLibrary && videosLoadCompleted) {
            setCurrentPage(1);
            loadVideos(undefined, 1, debouncedSearchQuery);
        }
    }, [debouncedSearchQuery]);

    // Load libraries from API
    const loadLibraries = async () => {
        setIsLoading(true);
        try {
            const response = await apiFetch({
                path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/bunny/stream/libraries`
            });

            const libraryItems = response.items || [];
            setLibraries(libraryItems);

            if (mediaData?.settings?.bunny?.library_id) {
                setSelectedLibrary(mediaData.settings.bunny.library_id);
            }

        } catch (error) {
            console.error('Failed to load libraries:', error);
            showNotification({
                type: 'error',
                message: __('Failed to load libraries. Please check your BunnyCDN API key in the integration settings.', 'fluent-player'),
                duration: 7000,
                position: 'top-right'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Load collections for the selected library
    const loadCollections = async () => {
        if (!selectedLibrary) return;

        setCollectionLoading(true);
        try {
            const response = await apiFetch({
                path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/bunny/stream/collections?library_id=${selectedLibrary}`
            });

            setCollections(response.items || []);

            if (mediaData?.settings?.bunny?.collection_id) {
                const foundCollection = response.items.find(c => c.guid === mediaData.settings.bunny.collection_id);
                if (foundCollection) {
                    setSelectedCollection(foundCollection);
                    await loadVideos(foundCollection);
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Failed to load collections:', error);
            showNotification({
                type: 'error',
                message: __('Failed to load collections.', 'fluent-player'),
                duration: 6000,
                position: 'top-right'
            });
            return false;
        } finally {
            setCollectionLoading(false);
        }
    };

    // Load videos for the selected library and collection
    const loadVideos = async (collectionOverride = undefined, page = 1, search = '') => {
        if (!selectedLibrary) return;

        const isLoadMore = page > 1;
        if (isLoadMore) {
            setIsLoadingMore(true);
        } else {
            setVideoLoading(true);
        }

        try {
            const params = {
                library_id: selectedLibrary,
                page: page,
                per_page: 24
            };

            let collectionToUse;
            if (collectionOverride !== undefined) {
                collectionToUse = collectionOverride;
            } else {
                collectionToUse = selectedCollection;
            }

            // If a collection is selected, filter by that collection
            if (collectionToUse) {
                params.collection_id = collectionToUse.guid;
            } else {
                // If no collection is selected, explicitly request root videos
                params.show_only_uncategorized = 'true';
            }

            // Add search parameter if provided
            const searchTerm = search !== undefined ? search : searchQuery;
            if (searchTerm && searchTerm.trim()) {
                params.search = searchTerm.trim();
            }

            const queryString = Object.entries(params)
                .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
                .join('&');

            const response = await apiFetch({
                path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/bunny/stream/videos?${queryString}`
            });

            // Include all videos (including encoding ones with length === 0)
            const fetchedVideos = response.items || [];

            // Update pagination state
            setTotalItems(response.totalItems || fetchedVideos.length);
            setHasMore(fetchedVideos.length === params.per_page);
            setCurrentPage(page);

            if (isLoadMore) {
                // Append to existing videos
                setVideos(prev => [...prev, ...fetchedVideos]);
            } else {
                setVideos(fetchedVideos);
            }

            // If we're editing, find the selected video
            if (mediaData?.settings?.bunny?.video_id) {
                const allVideos = isLoadMore ? [...videos, ...fetchedVideos] : fetchedVideos;
                const foundVideo = allVideos.find(v => v.guid === mediaData.settings.bunny.video_id);
                if (foundVideo) {
                    setSelectedVideo(foundVideo);
                }
            }
        } catch (error) {
            console.error('Failed to load videos:', error);
            showNotification({
                type: 'error',
                message: __('Failed to load videos.', 'fluent-player'),
                duration: 6000,
                position: 'top-right'
            });
        } finally {
            setVideoLoading(false);
            setIsLoadingMore(false);
            setVideosLoadCompleted(true);
        }
    };

    // Load more videos handler
    const loadMoreVideos = () => {
        if (!isLoadingMore && hasMore) {
            loadVideos(undefined, currentPage + 1, searchQuery);
        }
    };

    // Select a collection
    const selectCollection = (collection) => {
        if (selectedCollection?.guid === collection.guid) {
            return;
        }

        setCollectionChangeByUser(true);
        setSelectedCollection(collection);
    };

    // Check if video is still encoding
    const isVideoEncoding = (video) => {
        return !video.length || video.length === 0;
    };

    const selectVideo = (video) => {
        if (isSelecting || !video) {
            return;
        }

        // Prevent selecting videos that are still encoding
        if (isVideoEncoding(video)) {
            showNotification({
                type: 'warning',
                message: __('This video is still encoding. Please wait until encoding is complete.', 'fluent-player'),
                duration: 4000,
                position: 'top-right'
            });
            return;
        }

        setIsSelecting(true);

        try {
            // Get the default preset slug from the block variables or defaultSettings
            const defaultPresetSlug = window.fluentPlayerBlockVars?.defaultPreset?.slug ||
                                   defaultSettings?.defaultPresetSlug ||
                                   defaultSettings?.preset_slug ||
                                   'course';



            // Audio detection for the selected Bunny video, most authoritative first:
            //  1. the source MIME captured at upload through our picker (this session), then
            //  2. the fp_media_type metaTag we persisted on the Bunny video, then
            //  3. the original-filename title extension (for dashboard-uploaded videos).
            const isAudio = (typeof audioByVideoId.current[video.guid] !== 'undefined')
                ? audioByVideoId.current[video.guid]
                : detectStreamAudioHint('bunny', video);

            // Create the media data structure with all necessary fields
            const updatedMediaData = {
                title: video.title || __('Untitled Bunny Video', 'fluent-player'),
                settings: {
                    provider: 'bunny',
                    src: video.playlistURL,
                    posterSrc: video.thumbnailURL,
                    title: video.title || __('Untitled Bunny Video', 'fluent-player'),
                    post_status: defaultPostStatus(),
                    viewType: isAudio ? 'audio' : 'video',
                    playsInline: true,
                    mutedAutoplay: false,
                    autoplay: false,
                    loadStrategy: 'visible',
                    aspectRatio: 'default',
                    preset_slug: defaultPresetSlug || defaultSettings?.defaultPresetSlug || 'course',
                    bunny: {
                        library_id: selectedLibrary,
                        video_id: video.guid,
                        collection_id: selectedCollection?.guid || null,
                        title: video.title,
                        thumbnail: video.thumbnailURL,
                        duration: video.length,
                        token_auth_enabled: false,
                        is_audio: isAudio
                    },
                    streamType: 'on-demand',
                    mediaType: isAudio ? 'audio' : 'video',
                    duration: video.length
                }
            };
                // Store MP4 fallback URLs if available
                if (video.MP4URLs) {
                    // MP4URLs can be a string or array, normalize to array
                    const mp4Urls = Array.isArray(video.MP4URLs) ? video.MP4URLs : [video.MP4URLs];
                    updatedMediaData.settings.bunny.mp4_urls = mp4Urls;
                }

                // Auto-populate subtitles from BunnyCDN captions
                if (video.captions && video.captions.length > 0) {
                    updatedMediaData.settings.subtitles = video.captions
                        .filter(cap => cap.url && cap.srclang)
                        .map((cap, index) => ({
                            url: cap.url,
                            label: cap.label || cap.srclang,
                            language: cap.srclang,
                            is_default: index === 0
                        }));
                }

                if (typeof saveMediaToServer === 'function') {
                    saveMediaToServer(updatedMediaData);
                } else {
                    console.error('BunnyCDN selectVideo - saveMediaToServer function not available');

                    if (typeof setMediaData === 'function') {
                        setMediaData(updatedMediaData);
                    }

                    // Set selectedMedia to a non-null value to trigger the transition
                    if (typeof setSelectedMedia === 'function') {
                        setSelectedMedia('new-media');
                    }
                }

                // Update attributes for block editor
                if (typeof setAttributes === 'function') {
                    setAttributes({
                        preview: true,
                        provider: 'bunny',
                        bunnycdn: {
                            library_id: selectedLibrary,
                            video_id: video.guid,
                            collection_id: selectedCollection?.guid || null,
                            title: video.title,
                            thumbnail: video.thumbnailURL,
                            duration: video.length,
                            token_auth_enabled: false
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

    // Format video duration from seconds to MM:SS format
    const formatDuration = (seconds) => {
        if (!seconds) return '00:00';

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);

        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Format file size from bytes to human-readable format
    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return '';

        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));

        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    };

    // Show collections flag
    const showCollections = selectedLibrary && collections.length > 0;

    // Create a new collection
    const createCollection = async () => {
        if (!newCollectionName.trim()) {
            return;
        }

        try {
            const response = await apiFetch({
                path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/bunny/stream/collections`,
                method: 'POST',
                data: {
                    library_id: selectedLibrary,
                    name: newCollectionName.trim()
                }
            });

            setCollections([...collections, response]);

            setNewCollectionName('');
            setCreateCollectionModalVisible(false);

        } catch (error) {
            console.error('Failed to create collection:', error);
            showNotification({
                type: 'error',
                message: __('Failed to create collection. Please try again.', 'fluent-player'),
                duration: 3000,
                position: 'top-right'
            });
        }
    };

    // Open the WordPress media uploader
    const openMediaUploader = () => {
        if (!selectedLibrary) {
            showNotification({
                type: 'warning',
                message: __('Please select a library first', 'fluent-player'),
                duration: 3000,
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

    const startSimulatedProgress = (attachment, onProgress) => {
        const fileSize = attachment?.filesize || 1000000;
        const totalTime = Math.min(Math.max(fileSize / 100000, 5), 60);
        const interval = 100;
        const increment = 90 / (totalTime * 1000 / interval);

        let p = 0;
        return setInterval(() => {
            p = Math.min(90, p + increment);
            if (typeof onProgress === 'function') onProgress(Math.round(p));
        }, interval);
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
            const collectionId = selectedCollection?.guid || '';

            const fileBaseName = attachment.filename
                ? attachment.filename.replace(/\.[^/.]+$/, "")
                : (attachment.url ? attachment.url.split("/").pop().split("?")[0].replace(/\.[^/.]+$/, "") : null);
            const videoTitle = fileBaseName || attachment.title || "video";
            const createResponse = await apiFetch({
                path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/bunny/stream/videos`,
                method: 'POST',
                data: {
                    library_id: selectedLibrary,
                    collection_id: collectionId,
                    title: videoTitle
                }
            });

            if (!createResponse || !createResponse.guid) {
                throw new Error(__('Failed to create video entry', 'fluent-player'));
            }

            const videoId = createResponse.guid;

            // Bunny transcodes audio into video, so the upload response's is_audio
            // (derived from the attachment MIME) is the only reliable audio signal here.
            const uploadResp = await apiFetch({
                path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/bunny/stream/videos/upload`,
                method: 'POST',
                data: {
                    attachment_id: attachment.id.toString(),
                    library_id: selectedLibrary,
                    video_id: videoId
                }
            });

            const uploadedIsAudio = (uploadResp && typeof uploadResp.is_audio !== 'undefined')
                ? !!uploadResp.is_audio
                : (attachment.type === 'audio' || String(attachment.mime || attachment.subtype || '').startsWith('audio'));
            audioByVideoId.current[videoId] = uploadedIsAudio;

            clearInterval(progressInterval);
            updateNotification(notifId, {
                type: 'success',
                message: __('Upload complete', 'fluent-player'),
                progress: 100
            });

            await loadCollections();
            await loadVideos();

            setTimeout(() => hideNotification(notifId), 2000);

        } catch (error) {
            console.error('Failed to upload video:', error);
            clearInterval(progressInterval);
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

    const showDeleteConfirmation = (video, e) => {
        e.stopPropagation();
        setVideoToDelete(video);
        setDeleteConfirmAnchor(e.currentTarget);
    };

    const deleteVideo = async () => {
        if (!videoToDelete || !videoToDelete.guid) return;

        try {
            await apiFetch({
                path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/bunny/stream/videos/${videoToDelete.guid}`,
                method: 'DELETE',
                data: {
                    library_id: selectedLibrary
                }
            });
            cancelDelete();
            await loadVideos();
        } catch (error) {
            console.error('Failed to delete video:', error);
            showNotification({
                type: 'error',
                message: __('Failed to delete video. Please try again.', 'fluent-player'),
                duration: 6000,
                position: 'top-right'
            });
        }
    };

    const cancelDelete = () => {
        setVideoToDelete(null);
        setDeleteConfirmAnchor(null);
    };

    // Update collection name
    const updateCollection = async () => {
        if (!collectionToEdit || !editCollectionName.trim()) return;

        try {
            await apiFetch({
                path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/bunny/stream/collections/${collectionToEdit.guid}`,
                method: 'PUT',
                data: {
                    library_id: selectedLibrary,
                    name: editCollectionName.trim()
                }
            });

            // Update local state
            setCollections(collections.map(c =>
                c.guid === collectionToEdit.guid
                    ? { ...c, name: editCollectionName.trim() }
                    : c
            ));

            // Update selected collection if it was renamed
            if (selectedCollection?.guid === collectionToEdit.guid) {
                setSelectedCollection({ ...selectedCollection, name: editCollectionName.trim() });
            }

            setCollectionToEdit(null);
            setEditCollectionName('');

            showNotification({
                type: 'success',
                message: __('Collection renamed successfully.', 'fluent-player'),
                duration: 3000,
                position: 'top-right'
            });
        } catch (error) {
            console.error('Failed to update collection:', error);
            showNotification({
                type: 'error',
                message: __('Failed to rename collection. Please try again.', 'fluent-player'),
                duration: 4000,
                position: 'top-right'
            });
        }
    };

    // Delete collection
    const deleteCollection = async () => {
        if (!collectionToDelete) return;

        try {
            await apiFetch({
                path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/bunny/stream/collections/${collectionToDelete.guid}`,
                method: 'DELETE',
                data: {
                    library_id: selectedLibrary
                }
            });

            // Update local state
            setCollections(collections.filter(c => c.guid !== collectionToDelete.guid));

            // If deleted collection was selected, go back to root
            if (selectedCollection?.guid === collectionToDelete.guid) {
                setSelectedCollection(null);
                loadVideos(null);
            }

            setCollectionToDelete(null);
            setCollectionDeleteAnchor(null);

            showNotification({
                type: 'success',
                message: __('Collection deleted successfully.', 'fluent-player'),
                duration: 3000,
                position: 'top-right'
            });
        } catch (error) {
            console.error('Failed to delete collection:', error);
            showNotification({
                type: 'error',
                message: __('Failed to delete collection. Please try again.', 'fluent-player'),
                duration: 4000,
                position: 'top-right'
            });
        }
    };

    const cancelCollectionDelete = () => {
        setCollectionToDelete(null);
        setCollectionDeleteAnchor(null);
    };

    // Update video title
    const updateVideoTitle = async () => {
        if (!videoToEdit || !editVideoTitle.trim()) return;

        try {
            await apiFetch({
                path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/bunny/stream/videos/${videoToEdit.guid}`,
                method: 'PUT',
                data: {
                    library_id: selectedLibrary,
                    title: editVideoTitle.trim()
                }
            });

            // Update local state
            setVideos(videos.map(v =>
                v.guid === videoToEdit.guid
                    ? { ...v, title: editVideoTitle.trim() }
                    : v
            ));

            setVideoToEdit(null);
            setEditVideoTitle('');

            showNotification({
                type: 'success',
                message: __('Video title updated successfully.', 'fluent-player'),
                duration: 3000,
                position: 'top-right'
            });
        } catch (error) {
            console.error('Failed to update video title:', error);
            showNotification({
                type: 'error',
                message: __('Failed to update video title. Please try again.', 'fluent-player'),
                duration: 4000,
                position: 'top-right'
            });
        }
    };

    return (
        <div className="fluent-player-bunny">
            <div className="fluent-player-bunny-form-row">
                <label>{__('Select Library', 'fluent-player')}</label>
                {!isLoading && (!libraries || libraries.length === 0) ? (
                    <div className="fluent-player-bunny-video-error">
                        <p>{__('No Library found. Please create a video library from stream.', 'fluent-player')}</p>
                    </div>
                ) : (
                    <SelectControl
                        value={selectedLibrary || ''}
                        options={[
                            { label: __('Select a library', 'fluent-player'), value: '' },
                            ...(libraries || []).map(lib => ({ label: lib.name, value: lib.id }))
                        ]}
                        onChange={setSelectedLibrary}
                        disabled={isLoading || videoLoading || collectionLoading}
                    />
                )}
            </div>

            {selectedLibrary && !isLoading && (
                <div className="fluent-player-bunny-toolbar">
                    <div className="fluent-player-bunny-breadcrumb">
                        <Button
                            isLink
                            onClick={() => {
                                setSelectedCollection(null);
                                setSearchQuery('');
                                setCurrentPage(1);
                                loadVideos(null);
                            }}
                            disabled={videoLoading || collectionLoading}
                        >
                            {__('Root', 'fluent-player')}
                        </Button>

                        {selectedCollection && (
                            <>
                                <span className="fluent-player-bunny-breadcrumb-separator">/</span>
                                <Button isLink disabled={true}>
                                    {selectedCollection.name}
                                </Button>
                            </>
                        )}
                    </div>
                    <div className="fluent-player-bunny-search">
                        <SearchIconSVG />
                        <input
                            type="text"
                            placeholder={__('Search videos...', 'fluent-player')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="fluent-player-bunny-search-input"
                            disabled={videoLoading || collectionLoading}
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

            {isLoading ? (
                <div className="fluent-player-bunny-content">
                    <div className="fluent-player-bunny-video">
                        <h5>{__('Videos', 'fluent-player')}</h5>
                        <Skeleton.VideoCardGrid count={6} />
                    </div>
                </div>
            ) : (
                <div className="fluent-player-bunny-content">
                    {selectedLibrary && showCollections && collections.length > 0 && (
                        <div className="fluent-player-bunny-directory">
                            <h5>{__('Collections', 'fluent-player')}</h5>
                            <div className="fluent-player-bunny-directory-grid">
                                {collections.map(collection => (
                                    <div
                                        key={collection.guid}
                                        className="fluent-player-bunny-directory-grid-item"
                                        onClick={() => selectCollection(collection)}
                                    >
                                        <div className="fluent-player-bunny-directory-grid-item-action">
                                            <Button
                                                className="fluent-player-bunny-directory-grid-item-action-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCollectionToEdit(collection);
                                                    setEditCollectionName(collection.name);
                                                }}
                                                title={__('Edit collection', 'fluent-player')}
                                            >
                                                <EditIconSVG />
                                            </Button>
                                            <Button
                                                className="fluent-player-bunny-directory-grid-item-action-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCollectionToDelete(collection);
                                                    setCollectionDeleteAnchor(e.currentTarget);
                                                }}
                                                title={__('Delete collection', 'fluent-player')}
                                            >
                                                <DeleteIconSVG />
                                            </Button>
                                        </div>
                                        <span className="fluent-player-bunny-directory-grid-item-icon"><DirectoryIconSVG /></span>
                                        <span className="fluent-player-bunny-directory-grid-item-name">{collection.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedLibrary && (
                        <div className="fluent-player-bunny-video">
                            <h5>{__('Videos', 'fluent-player')}</h5>
                            {videoLoading || !videosLoadCompleted ? (
                                <Skeleton.VideoCardGrid count={6} />
                            ) : videos.length === 0 ? (
                                <div className="fluent-player-bunny-video-error">
                                    <p>
                                        {selectedCollection
                                            ? __(`No videos found in collection ${selectedCollection.name}.`, 'fluent-player')
                                            : __('No videos found in this library.', 'fluent-player')}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="fluent-player-bunny-video-grid">
                                        {videos.map(video => {
                                            const encoding = isVideoEncoding(video);
                                            return (
                                                <div
                                                    key={video.guid}
                                                    className={`fluent-player-bunny-video-grid-item ${selectedVideo?.guid === video.guid ? 'selected' : ''} ${encoding ? 'encoding' : ''}`}
                                                    onClick={() => selectVideo(video)}
                                                >
                                                    <div className="fluent-player-bunny-video-grid-item-action">
                                                        <Button
                                                            className="fluent-player-bunny-video-grid-item-action-btn fp-icon-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setVideoToEdit(video);
                                                                setEditVideoTitle(video.title);
                                                            }}
                                                            title={__('Edit video title', 'fluent-player')}
                                                        >
                                                            <EditIconSVG />
                                                        </Button>
                                                        <Button
                                                            className="fluent-player-bunny-video-grid-item-action-btn fp-icon-btn"
                                                            onClick={(e) => showDeleteConfirmation(video, e)}
                                                            title={__('Delete video', 'fluent-player')}
                                                        >
                                                            <DeleteIconSVG />
                                                        </Button>
                                                    </div>
                                                    <div className="fluent-player-bunny-video-grid-item-thumbnail">
                                                        {encoding ? (
                                                            <div className="fluent-player-bunny-video-encoding-placeholder">
                                                                <span className="dashicons dashicons-video-alt3"></span>
                                                            </div>
                                                        ) : (
                                                            <img
                                                                src={video.thumbnailURL}
                                                                alt={video.title}
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE2IDhBOCA4IDAgMSAwIDE2IDI0QTggOCAwIDEgMCAxNiA4WiIgZmlsbD0iI2NjYyIvPjwvc3ZnPg==';
                                                                }}
                                                            />
                                                        )}
                                                        {encoding ? (
                                                            <div className="fluent-player-bunny-video-grid-item-encoding">
                                                                <span className="fluent-player-bunny-encoding-spinner"></span>
                                                                {__('Encoding...', 'fluent-player')}
                                                            </div>
                                                        ) : (
                                                            <div className="fluent-player-bunny-video-grid-item-duration">{formatDuration(video.length)}</div>
                                                        )}
                                                    </div>
                                                    <div className="fluent-player-bunny-video-grid-item-info">
                                                        <div className="fluent-player-bunny-video-grid-item-info-title">{video.title}</div>
                                                        <div className="fluent-player-bunny-video-grid-item-info-meta">
                                                            {formatFileSize(video.storageSize || 0)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {hasMore && (
                                        <div className="fluent-player-bunny-load-more">
                                            <Button
                                                onClick={loadMoreVideos}
                                                className="fp-btn-secondary"
                                                disabled={isLoadingMore}
                                            >
                                                {isLoadingMore ? __('Loading...', 'fluent-player') : __('Load More', 'fluent-player')}
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="fluent-player-bunny-action-button">
                <Button onClick={onCancel} className="components-button fp-btn-secondary">
                    <BackArrowSmallSVG />
                    {__('Back to Media Selector', 'fluent-player')}
                </Button>
                <div className="fluent-player-bunny-action-button-group">
                {selectedLibrary && (
                    <>
                        <Button
                            onClick={openMediaUploader}
                            className="components-button fp-btn-secondary bunny-upload-button"
                            disabled={!selectedLibrary || isUploading}
                        >
                            <UploadIconSVG />
                            {__('Upload Video', 'fluent-player')}
                        </Button>
                        <Button
                            onClick={() => setCreateCollectionModalVisible(true)}
                            className="components-button fp-btn-secondary icon-lg-svg"
                        >
                            <PlusIconSVG />
                            {__('Create Collection', 'fluent-player')}
                        </Button>
                    </>
                    )}
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
                onCancel={cancelDelete}
            />

            <ConfirmPopover
                isOpen={!!collectionToDelete}
                anchor={collectionDeleteAnchor}
                title={__('Delete Collection', 'fluent-player')}
                message={__('Are you sure you want to delete this collection? Videos in this collection will not be deleted.', 'fluent-player')}
                confirmText={__('Delete', 'fluent-player')}
                cancelText={__('Cancel', 'fluent-player')}
                onConfirm={deleteCollection}
                onCancel={cancelCollectionDelete}
            />

            {collectionToEdit && (
                <div className="fluent-player-bunny-modal-overlay">
                    <div className="fluent-player-bunny-modal-content">
                        <div className="fluent-player-bunny-modal-header">
                            <h2>{__('Rename Collection', 'fluent-player')}</h2>
                            <button
                                className="fluent-player-bunny-close-modal"
                                onClick={() => {
                                    setCollectionToEdit(null);
                                    setEditCollectionName('');
                                }}
                                type="button"
                            >
                                <CloseIconSVG />
                            </button>
                        </div>
                        <div className="fluent-player-bunny-modal-body">
                            <div className="fluent-player-bunny-form-row">
                                <label>{__('Collection Name', 'fluent-player')}</label>
                                <input
                                    type="text"
                                    value={editCollectionName}
                                    onChange={(e) => setEditCollectionName(e.target.value)}
                                    placeholder={__('Enter collection name', 'fluent-player')}
                                    className="fluent-player-bunny-form-control"
                                />
                            </div>
                        </div>
                        <div className="fluent-player-bunny-modal-footer">
                            <Button
                                onClick={() => {
                                    setCollectionToEdit(null);
                                    setEditCollectionName('');
                                }}
                                className="fp-btn-secondary"
                            >
                                {__('Cancel', 'fluent-player')}
                            </Button>
                            <Button
                                onClick={updateCollection}
                                disabled={!editCollectionName.trim()}
                                className="fp-btn-primary"
                            >
                                {__('Save', 'fluent-player')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {videoToEdit && (
                <div className="fluent-player-bunny-modal-overlay">
                    <div className="fluent-player-bunny-modal-content">
                        <div className="fluent-player-bunny-modal-header">
                            <h2>{__('Edit Video Title', 'fluent-player')}</h2>
                            <button
                                className="fluent-player-bunny-close-modal"
                                onClick={() => {
                                    setVideoToEdit(null);
                                    setEditVideoTitle('');
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
                                    value={editVideoTitle}
                                    onChange={(e) => setEditVideoTitle(e.target.value)}
                                    placeholder={__('Enter video title', 'fluent-player')}
                                    className="fluent-player-bunny-form-control"
                                />
                            </div>
                        </div>
                        <div className="fluent-player-bunny-modal-footer">
                            <Button
                                onClick={() => {
                                    setVideoToEdit(null);
                                    setEditVideoTitle('');
                                }}
                                className="fp-btn-secondary"
                            >
                                {__('Cancel', 'fluent-player')}
                            </Button>
                            <Button
                                onClick={updateVideoTitle}
                                disabled={!editVideoTitle.trim()}
                                className="fp-btn-primary"
                            >
                                {__('Save', 'fluent-player')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {createCollectionModalVisible && (
                <div className="fluent-player-bunny-modal-overlay">
                    <div className="fluent-player-bunny-modal-content">
                        <div className="fluent-player-bunny-modal-header">
                            <h2>{__('Create Collection', 'fluent-player')}</h2>
                            <button
                                className="fluent-player-bunny-close-modal"
                                onClick={() => setCreateCollectionModalVisible(false)}
                                type="button"
                            >
                                <CloseIconSVG />
                            </button>
                        </div>
                        <div className="fluent-player-bunny-modal-body">
                            <div className="fluent-player-bunny-form-row">
                                <label>{__('Collection Name', 'fluent-player')}</label>
                                <input
                                    type="text"
                                    value={newCollectionName}
                                    onChange={(e) => setNewCollectionName(e.target.value)}
                                    placeholder={__('Enter collection name', 'fluent-player')}
                                    className="fluent-player-bunny-form-control"
                                />
                            </div>
                        </div>
                        <div className="fluent-player-bunny-modal-footer">
                            <Button
                                onClick={() => setCreateCollectionModalVisible(false)}
                                className="fp-btn-secondary"
                            >
                                {__('Cancel', 'fluent-player')}
                            </Button>
                            <Button
                                onClick={createCollection}
                                disabled={!newCollectionName.trim()}
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

export default BunnyCDN;
