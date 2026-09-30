/**
 * WordPress dependencies
 */
const { __ } = wp.i18n;
const { useState, useEffect, useRef, useCallback } = wp.element;
const {
    PanelBody,
    Spinner,
    Notice,
    ToolbarGroup,
    ToolbarButton
} = wp.components;
const { InspectorControls, BlockControls, useBlockProps, InnerBlocks } = wp.blockEditor;
const { apiFetch } = wp;
const { arrowLeft, close } = wp.icons || {};
const { useDispatch } = wp.data;

/**
 * Parse a WordPress duration string (e.g. "3:45", "1:02:30") into seconds.
 */
const parseDurationString = (str) => {
    if (!str) return 0;
    const parts = String(str).split(':').map(Number);
    if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + (parts[2] || 0);
    if (parts.length === 2) return (parts[0] * 60) + (parts[1] || 0);
    return parts[0] || 0;
};

const getMediaItemTitle = (media) => media?.settings?.title || media?.title || __('Media', 'fluent-player');

const createMediaItemOption = (media) => ({
    value: media.ID,
    label: `${getMediaItemTitle(media)} (#${media.ID})`,
    title: getMediaItemTitle(media),
    provider: media?.settings?.provider || 'wordpress',
    posterSrc: media?.settings?.posterSrc || '',
    duration: media?.settings?.duration || null,
});

const upsertMediaItemOption = (items, nextItem) => {
    const existingIndex = items.findIndex((item) => item?.value === nextItem.value);

    if (existingIndex === -1) {
        return [...items, nextItem];
    }

    return items.map((item, index) => (
        index === existingIndex
            ? { ...item, ...nextItem }
            : item
    ));
};

/**
 * @typedef {Object} MediaSettings
 * @property {string} [preset_slug] - Slug of the selected preset
 * @property {string} [brand_color] - Brand color for the player
 * @property {boolean} [autoplay] - Whether to autoplay the media
 * @property {boolean} [loop] - Whether to loop the media
 * @property {boolean} [muted] - Whether the media is muted by default
 * @property {Array} [chapters] - Array of chapter objects with time and title
 * @property {Array} [overlays] - Array of overlay objects
 */

/**
 * @typedef {Object} MediaData
 * @property {number} ID - Media ID
 * @property {string} title - Media title
 * @property {string} url - Media URL
 * @property {string} type - Media type (video/audio)
 * @property {string} [thumbnail_url] - URL to the media thumbnail
 * @property {MediaSettings} settings - Media player settings
 */

/**
 * @typedef {Object} MediaState
 * @property {MediaData|null} data - Current media data
 * @property {MediaData|null} originalData - Original media data for comparison
 * @property {number|null} selectedId - ID of the selected media
 * @property {string|null} source - Source of the media (upload/URL)
 * @property {Array} items - List of available media items
 */

/**
 * @typedef {Object} AppState
 * @property {boolean} loading - Whether the app is loading
 * @property {boolean} isSaving - Whether the app is saving
 * @property {string|null} error - Error message if any
 * @property {boolean} isDedicatedPlayer - Whether this is a dedicated player
 */

/**
 * @typedef {Object} PlayerState
 * @property {Object} settings - Current player settings
 * @property {string|null} currentPreset - ID of the current preset
 */

/**
 * @typedef {Object} BlockAttributes
 * @property {number|null} mediaId - ID of the selected media
 * @property {Object} [additionalSettings] - Any additional block-specific settings
 */

/**
 * Internal dependencies
 */
import GeneralSettings from './components/settings/GeneralSettings.jsx';
import ChapterSettings from './components/settings/ChapterSettings.jsx';
import OverlaySettings from './components/settings/OverlaySettings.jsx';
import BrandingSettings from './components/settings/BrandingSettings.jsx';
import TimedContentStylePanel from './components/settings/TimedContentStylePanel.jsx';
import LanguageSwitcher from './components/settings/LanguageSwitcher.jsx';
import MediaSelector from './components/MediaSelector.jsx';
import TimestampShortcode from './components/settings/TimestampShortcode.jsx';
import ModalShortcode from './components/settings/ModalShortcode.jsx';
import SubtitleSettings from './components/settings/SubtitleSettings.jsx';
import PresetSelector from './components/PresetSelector';
import FluentPlayer from './components/player/FluentPlayer';
import LayersSettings from './components/settings/LayersSettings.jsx';
import TagSettings from './components/settings/TagSettings.jsx';
import { NotificationProvider } from './components/common/NotificationContext.jsx';
import NotificationContainer from './components/common/NotificationContainer.jsx';
import { defaultPostStatus } from '@share/helper.js';
import {
    BrandingIconSVG,
    GeneralSettingsIconSVG,
    ChapterIconSVG,
    OverlayIconSVG,
    LayerIconSVG,
    LanguageIconSVG,
    SubtitleIconSVG,
    TimestampIconSVG,
    LightboxIconSVG,
    PresetIconSVG,
    TimedContentWatchIconSVG,
    TagIconSVG
} from './components/common/Icons.jsx';
import { useNotification } from './components/common/useNotification.js';
import TimedContentManager from './components/TimedContentManager.jsx';
import QuickLinks from './components/QuickLinks.jsx';

/**
 * Custom hooks for state management
 */

/**
 * Custom hook for managing global application state
 *
 * @returns {[AppState, Function]} App state and update function
 */
const useFluentPlayerAppState = () => {
    const [appState, setAppState] = useState({
        loading: false,
        isSaving: false,
        error: null,
        isDedicatedPlayer: false
    });

    const updateFluentPlayerAppState = (updates) => setAppState(prev => ({ ...prev, ...updates }));

    return [appState, updateFluentPlayerAppState];
};

/**
 * Custom hook for managing media state
 *
 * @param {number|null} initialMediaId - Initial media ID
 * @returns {[MediaState, Function, Function, Function]} - Media state and update functions
 */
const useFluentPlayerMediaState = (initialMediaId = null) => {
    const [mediaState, setMediaState] = useState({
        data: null,
        originalData: null,
        selectedId: initialMediaId,
        source: null,
        items: []
    });

    const updateFluentPlayerMediaState = (updates) => setMediaState(prev => ({ ...prev, ...updates }));

    /**
     * Updates the entire media data object
     *
     * @param {MediaData} updatedMediaData - The complete updated media data object
     */
    const updateFluentPlayerMediaData = (updatedMediaData) => updateFluentPlayerMediaState({ data: updatedMediaData });

    /**
     * Updates a specific media setting within the media data
     *
     * @param {string} settingKey - The key of the setting to update
     * @param {any} settingValue - The new value for the setting
     */
    const updateFluentPlayerMediaSetting = (settingKey, settingValue) => setMediaState(prev => ({
        ...prev,
        data: {
            ...prev.data,
            settings: {
                ...prev.data.settings,
                [settingKey]: settingValue
            }
        }
    }));

    return [mediaState, updateFluentPlayerMediaState, updateFluentPlayerMediaData, updateFluentPlayerMediaSetting];
};

/**
 * Edit component for the Fluent Player Media block
 *
 * @param {Object} props - Component props
 * @param {BlockAttributes} props.attributes - Block attributes
 * @param {Function} props.setAttributes - Function to update block attributes
 * @returns {JSX.Element} Edit component
 */
const EditInner = (props) => {
    const { attributes, setAttributes, clientId } = props;

    // Add dispatch for block selection
    const { selectBlock } = useDispatch('core/block-editor');


    // State declarations
    const [appState, updateAppState] = useFluentPlayerAppState();
    const { showNotification } = useNotification();
    const [
        mediaState,
        updateMediaState,
        updateMediaData,
        updateMediaSetting
    ] = useFluentPlayerMediaState(attributes.mediaId);

    const [playerState, setPlayerState] = useState({
        settings: null,
        currentPreset: null,
        presets: []
    });

    const [mediaUrlInput, setMediaUrlInput] = useState({
        url: ''
    });
    const [isReplaceMode, setIsReplaceMode] = useState(false);

    const mainPlayerRef = useRef(null);
    const mediaDataRef = useRef(null);
    const replaceOriginRef = useRef(null);
    const saveMediaToServerRef = useRef(null);
    const saveMediaRequestRef = useRef(null);
    const pendingSaveRef = useRef(false);
    const pauseMainPreview = useCallback(() => {
        const el = mainPlayerRef.current;
        if (el && typeof el.pause === 'function') el.pause();
    }, []);

    const handlePreviewKeyDown = useCallback((e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            e.stopPropagation();
            wp.data.dispatch('core/block-editor').removeBlock(clientId);
        }
    }, [clientId]);

    // Configuration and constants
    const blockVars = window.fluentPlayerBlockVars || {};
    const apiRequestPath = `${blockVars.rest?.namespace}/${blockVars.rest?.version}`;
    const playerDefaultSettings = blockVars.defaultSettings || {
        brandColor: '#4e9cf6',
        preload: 'metadata',
        customCSS: '',
        logoUrl: '',
        logoLink: '',
        logoPosition: 'top-right',
        youtube: { privacyMode: false, showSubscribeButton: false },
        defaultPresetSlug: null,
        resume_playback: false,
        video_end_option: 'default',
        aspectRatio: 'default',
    };
    // Utility functions
    const updatePlayerState = (updates) => setPlayerState(prev => ({ ...prev, ...updates }));

    const markEditorDirty = () => {
        if (wp.data?.dispatch) {
            const dispatch = wp.data.dispatch('core/editor');
            if (dispatch) {
                dispatch.unlockPostSaving('fluent-player/media');
                dispatch.editPost({ edited: true });
            }
        }
    };

    // Media library handlers
    const openVideoMediaLibrary = () => {
        try {
            const mediaUploader = window.wp.media({
                title: __('Select or Upload Video', 'fluent-player'),
                button: { text: __('Use this video', 'fluent-player') },
                multiple: false,
                library: { type: 'video' }
            });

            mediaUploader.on('select', async () => {
                const attachment = mediaUploader.state().get('selection').first().toJSON();
                const videoMediaToSave = {
                    title: attachment.title || __('Untitled Media', 'fluent-player'),
                    provider: 'wordpress',
                    src: attachment.url,
                    attachment_id: attachment.id,
                    posterSrc:  '',
                    viewType: 'video',
                    settings: {
                        duration: parseDurationString(attachment.fileLength),
                    }
                };
                await saveMediaToServer(videoMediaToSave);
            });

            mediaUploader.open();
        } catch (error) {
            updateAppState({ error: 'There was an error opening the media uploader. Please try again.' });
        }
    };

    const openAudioMediaLibrary = () => {
        try {
            const mediaUploader = window.wp.media({
                title: __('Select or Upload Audio', 'fluent-player'),
                button: { text: __('Use this audio', 'fluent-player') },
                multiple: false,
                library: { type: 'audio' }
            });

            mediaUploader.on('select', async () => {
                const attachment = mediaUploader.state().get('selection').first().toJSON();

                let presetSlug = playerState.currentPreset?.slug;
                if (!presetSlug && playerState.presets.length > 0) {
                    const defaultPreset = playerState.presets.find(p => p.slug === playerDefaultSettings.defaultPresetSlug)
                        || playerState.presets.find(p => p.slug === 'course')
                        || playerState.presets[0];
                    if (defaultPreset) {
                        presetSlug = defaultPreset.slug;
                    }
                }

                const audioMediaToSave = {
                    title: attachment.title || __('Untitled Media', 'fluent-player'),
                    provider: 'audio',
                    src: attachment.url,
                    attachment_id: attachment.id,
                    posterSrc: attachment.image?.src || attachment.thumb?.src || '',
                    viewType: 'audio',
                    settings: {
                        duration: parseDurationString(attachment.fileLength),
                        preset_slug: presetSlug,
                        playsInline: true,
                        mutedAutoplay: false,
                        autoplay: false,
                        loadStrategy: 'visible',
                        preload: playerDefaultSettings.preload || 'metadata',
                        aspectRatio: playerDefaultSettings.aspectRatio || playerDefaultSettings.default_aspect_ratio || 'default',
                        brandingColor: playerDefaultSettings.brandColor,
                        video_end_option: playerDefaultSettings.video_end_option || 'default'
                    }
                };
                await saveMediaToServer(audioMediaToSave);
            });

            mediaUploader.open();
        } catch (error) {
            updateAppState({ error: 'There was an error opening the audio uploader. Please try again.' });
        }
    };

    // Video processing functions
    const normalizeVideoUrl = (url) => {
        if (!url) return url;
        // Normalize YouTube variants to standard watch format
        // m.youtube.com / music.youtube.com → www.youtube.com
        url = url.replace(/(?:m|music)\.youtube\.com/, 'www.youtube.com');
        // /live/VIDEO_ID and /shorts/VIDEO_ID → /watch?v=VIDEO_ID
        url = url.replace(/youtube\.com\/(?:live|shorts)\/([^?&#]+)/, 'youtube.com/watch?v=$1');
        return url;
    };

    const fetchMediaMetaData = async (mediaUrl) => {
        try {
            const response = await apiFetch({
                path: `${apiRequestPath}/media/metadata?url=${encodeURIComponent(mediaUrl)}`
            });
            if (response && response.metaData) {
                return response.metaData;
            }
            throw new Error(response?.message || 'Failed to fetch media metadata');
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch media metadata');
        }
    };

    /**
     * Processes and loads video from URL
     *
     * @returns {Promise<void>}
     */
    const processAndLoadVideoFromUrl = async (sourceOverride) => {
        if (!mediaUrlInput.url) return;

        const source = typeof sourceOverride === 'string' ? sourceOverride : mediaState.source;

        const isYouTubeShort = /youtube\.com\/shorts\//.test(mediaUrlInput.url);
        const normalizedUrl = normalizeVideoUrl(mediaUrlInput.url);
        updateAppState({ loading: true });
        try {
            const metaData = await fetchMediaMetaData(normalizedUrl);
            if (metaData) {
                const isUrlSource = source === 'url';
                const detectedProvider = !isUrlSource ? source
                    : metaData.provider ? metaData.provider
                    : metaData.provider_name === 'YouTube' ? 'youtube'
                    : metaData.provider_name === 'Vimeo' ? 'vimeo'
                    : 'external';
                const isAudio = isUrlSource && (metaData.media_type || metaData.type) === 'audio';
                const externalMediaToSave = {
                    title: metaData.title || (isUrlSource
                        ? __('Untitled media', 'fluent-player')
                        : __(`Untitled ${source} media`, 'fluent-player')),
                    src: metaData.url,
                    provider: detectedProvider,
                    ...(metaData.attachment_id ? { attachment_id: metaData.attachment_id } : {}),
                    posterSrc: metaData.thumbnail_url || '',
                    viewType: isAudio ? 'audio' : 'video',
                    settings: {
                        duration: metaData.duration || 0,
                        ...(isAudio ? { mediaType: 'audio' } : {}),
                        ...(isYouTubeShort ? { is_short: true, aspectRatio: '9:16' } : {}),
                    }
                };
                await saveMediaToServer(externalMediaToSave);
            }
        } catch (error) {
            showNotification({
                type: 'error',
                message: error.message || __('Failed to fetch media metadata', 'fluent-player'),
            });
        } finally {
            updateAppState({ loading: false });
        }
    };

    // API functions
    /**
     * Fetches media data from the server
     *
     * @param {number} mediaId - ID of the media to fetch
     * @returns {Promise<MediaData>} Media data
     */
    const fetchMediaData = async (mediaId) => {
        updateAppState({ loading: true, error: null });

        try {
            const response = await apiFetch({
                path: `/fluent-player/v2/media/${mediaId}`
            });
            // Handle normalized response shape - response now has 'media' key
            const mediaData = response.media || response;
            updateMediaState({
                data: mediaData,
                originalData: JSON.parse(JSON.stringify(mediaData)),
                selectedId: mediaId
            });
        } catch (err) {
            updateAppState({ error: __('Failed to load media data. Please try again.', 'fluent-player') });
        } finally {
            updateAppState({ loading: false });
        }
    };

    /**
     * Saves media data to the server
     *
     * @param {MediaData} [mediaToSave=null] - Media data to save, uses mediaState.data if not provided
     * @returns {Promise<MediaData>} Updated media data
     */
    const saveMediaToServer = async (mediaToSave = null, options = {}) => {
        if (saveMediaRequestRef.current) {
            if (!mediaToSave) {
                pendingSaveRef.current = true;
            }
            return saveMediaRequestRef.current;
        }

        const performSave = async (currentMediaToSave = null, currentOptions = {}) => {
            const isNewMediaItem = !!currentMediaToSave;
            const { silent = false } = currentOptions || {};
            const currentMediaData = mediaDataRef.current || mediaState.data;

            try {
                const mediaId = isNewMediaItem ? null : (currentMediaData?.ID || null);

                if (!isNewMediaItem && (!currentMediaData || !mediaId)) return null;

                if (!isNewMediaItem) {
                    // Check if media settings changed
                    const hasMediaChanged = JSON.stringify(currentMediaData) !== JSON.stringify(mediaState.originalData);

                    // On CPT page, also check if visibility changed via the toolbar toggle.
                    // editPost() updates the WP editor store but not mediaState, so the
                    // JSON comparison above won't detect visibility-only changes.
                    const hasVisibilityChanged = appState.isDedicatedPlayer &&
                        wp.data.select('core/editor').getEditedPostAttribute('status') !== (currentMediaData?.settings?.post_status || 'publish');

                    if (!hasMediaChanged && !hasVisibilityChanged) {
                        return currentMediaData;
                    }
                }

                let apiRequestData, targetPostId;

                if (isNewMediaItem) {
                    let presetSlug = playerState.currentPreset?.slug;

                    if (!presetSlug && playerState.presets && playerState.presets.length > 0) {
                        const defaultPreset = playerState.presets.find(p => p.slug === playerDefaultSettings.defaultPresetSlug)
                            || playerState.presets.find(p => p.slug === 'course')
                            || playerState.presets[0];
                        if (defaultPreset) {
                            presetSlug = defaultPreset.slug;
                        }
                    }

                    apiRequestData = {
                        settings: {
                            title: currentMediaToSave.title || __('Untitled Media', 'fluent-player'),
                            post_status: defaultPostStatus(appState.isDedicatedPlayer),
                            src: currentMediaToSave.src,
                            provider: currentMediaToSave.provider,
                            posterSrc: currentMediaToSave.posterSrc || '',
                            viewType: currentMediaToSave.viewType || 'video',
                            attachment_id: currentMediaToSave.attachment_id,
                            preset_slug: presetSlug || playerDefaultSettings.defaultPresetSlug || 'course',
                            playsInline: true,
                            mutedAutoplay: false,
                            autoplay: false,
                            loadStrategy: 'visible',
                            preload: playerDefaultSettings.preload || 'metadata',
                            aspectRatio: playerDefaultSettings.aspectRatio || playerDefaultSettings.default_aspect_ratio || 'default',
                            brandingColor: playerDefaultSettings.brandColor,
                            video_end_option: playerDefaultSettings.video_end_option || 'default',
                            ...(currentMediaToSave.settings || {})
                        },
                        tags: currentMediaToSave.tags || [],
                    };

                    const currentPostId = appState.isDedicatedPlayer && wp.data.select('core/editor').getCurrentPostId();
                    if (currentPostId) targetPostId = currentPostId;
                } else {
                    // Ensure aspectRatio has a valid value when updating
                    const settings = {
                        ...currentMediaData.settings,
                        aspectRatio: currentMediaData.settings.aspectRatio || 'default'
                    };

                    // Status travels only from the CPT editor; omitted statuses are
                    // preserved server-side from the live post row.
                    if (appState.isDedicatedPlayer) {
                        // future/pending would 422 the REST validation — omit to keep the schedule.
                        const editorStatus = wp.data.select('core/editor').getEditedPostAttribute('status') || 'publish';
                        if (['publish', 'private', 'draft'].includes(editorStatus)) {
                            settings.post_status = editorStatus;
                        } else {
                            delete settings.post_status;
                        }
                    } else {
                        delete settings.post_status;
                    }

                    apiRequestData = {
                        title: currentMediaData.title,
                        settings: settings,
                        tags: currentMediaData.tags || [],
                    };
                    targetPostId = currentMediaData.ID;
                }

                const response = await apiFetch({
                    path: `${apiRequestPath}/media${targetPostId ? '/' + targetPostId : ''}`,
                    method: targetPostId ? 'PUT' : 'POST',
                    data: apiRequestData
                });

                const savedMedia = response?.media || null;

                if (savedMedia) {
                    mediaDataRef.current = savedMedia;
                    replaceOriginRef.current = null;
                    setAttributes({ mediaId: savedMedia.ID });
                    setIsReplaceMode(false);
                    setMediaUrlInput({ url: '' });
                    updateMediaState({
                        items: upsertMediaItemOption(mediaState.items, createMediaItemOption(savedMedia)),
                        data: savedMedia,
                        selectedId: savedMedia.ID,
                        source: null,
                        originalData: JSON.parse(JSON.stringify(savedMedia))
                    });

                    if (appState.isDedicatedPlayer && isNewMediaItem) {
                        wp.data.dispatch('core/editor').editPost({ title: savedMedia.settings.title });
                        wp.data.dispatch('core/editor').savePost();
                    }
                }

                if (!silent) {
                    showNotification({
                        type: 'success',
                        message: response.message || __(`Media ${isNewMediaItem ? 'created' : 'updated'} successfully.`, 'fluent-player'),
                    });
                }

                return savedMedia || currentMediaData;
            } catch (error) {
                if (!silent) {
                    showNotification({
                        type: 'error',
                        message: __(`Failed to ${isNewMediaItem ? 'create' : 'update'} media.`, 'fluent-player'),
                    });
                } else {
                    console.error('[media-save] internal save failed:', error);
                }

                return null;
            }
        };

        const saveRequest = (async () => {
            updateAppState({ isSaving: true });

            try {
                let result = await performSave(mediaToSave, options);

                while (pendingSaveRef.current) {
                    pendingSaveRef.current = false;
                    result = await performSave(null, { silent: true });
                }

                return result;
            } finally {
                pendingSaveRef.current = false;
                saveMediaRequestRef.current = null;
                updateAppState({ isSaving: false });
            }
        })();

        saveMediaRequestRef.current = saveRequest;

        return saveRequest;
    };

    // Keep ref in sync so the subscribe callback always calls the latest version
    saveMediaToServerRef.current = saveMediaToServer;

    /**
     * Fetches available presets from the server
     *
     * @returns {Promise<Array>} List of available presets
     */
    const fetchPlayerPresets = async () => {
        try {
            updateAppState({ loading: true, error: null });
            const presetData = await apiFetch({ path: `${apiRequestPath}/presets` });
            if (presetData) {
                updatePlayerState({ presets: presetData });
            }
            return presetData;
        } catch (error) {
            updateAppState({ error: __('Failed to load presets. Please try again.', 'fluent-player') });
            return [];
        } finally {
            updateAppState({ loading: false });
        }
    };

    // Event handlers
    const handleMediaSelection = (mediaId) => {
        const mediaIdInt = parseInt(mediaId);
        if (mediaIdInt) {
            if (isReplaceMode && mediaIdInt === attributes.mediaId && replaceOriginRef.current) {
                const replaceOrigin = replaceOriginRef.current;
                mediaDataRef.current = replaceOrigin.data;
                updateMediaState({
                    data: replaceOrigin.data,
                    originalData: replaceOrigin.originalData,
                    selectedId: replaceOrigin.selectedId,
                    source: replaceOrigin.source
                });
                replaceOriginRef.current = null;
                setMediaUrlInput({ url: '' });
                setIsReplaceMode(false);
                return;
            }

            replaceOriginRef.current = null;
            setAttributes({ mediaId: mediaIdInt });
            setIsReplaceMode(false);
        }
    };

    const handleReplaceMediaClick = () => {
        replaceOriginRef.current = {
            data: mediaState.data,
            originalData: mediaState.originalData,
            selectedId: mediaState.selectedId,
            source: mediaState.source,
        };
        mediaDataRef.current = null;
        updateMediaState({
            data: null,
            originalData: null,
            selectedId: null,
            source: null
        });
        setMediaUrlInput({ url: '' });
        setIsReplaceMode(true);
    };

    const handleCloseReplace = () => {
        const replaceOrigin = replaceOriginRef.current;
        if (replaceOrigin) {
            mediaDataRef.current = replaceOrigin.data;
            updateMediaState({
                data: replaceOrigin.data,
                originalData: replaceOrigin.originalData,
                selectedId: replaceOrigin.selectedId,
                source: replaceOrigin.source
            });
        } else {
            mediaDataRef.current = null;
            updateMediaState({
                data: null,
                originalData: null,
                selectedId: null,
                source: null
            });
        }
        setMediaUrlInput({ url: '' });
        setIsReplaceMode(false);
    };

    const setMediaDataWithDirty = (newData) => {
        mediaDataRef.current = newData;
        updateMediaData(newData);
        markEditorDirty();
    };

    const setPersistedMediaData = (newData) => {
        mediaDataRef.current = newData;
        updateMediaState({
            data: newData,
            originalData: JSON.parse(JSON.stringify(newData))
        });
        markEditorDirty();
    };

    // Effects
    useEffect(() => {
        if (attributes.mediaId) {
            fetchMediaData(attributes.mediaId);
        }
    }, [attributes.mediaId]);

    // Sync timed content from CPT post — CPT is the source of truth for all embedded pages
    // Only runs once after initial media data load to avoid remounting the player
    const timedContentSynced = useRef(false);
    useEffect(() => {
        if (!mediaState.data) return;
        if (timedContentSynced.current) return;

        // Check synchronously — appState.isDedicatedPlayer may not be set yet due to race condition
        const isCptPage = wp.data.select('core/editor').getCurrentPostType() === 'fluent_player_media';
        if (isCptPage) return;

        timedContentSynced.current = true;

        const postContent = mediaState.data.post_content || '';
        const parsed = wp.blocks.parse(postContent);
        const mediaBlock = parsed.find(b => b.name === 'fluent-player/media');
        const timedBlocks = mediaBlock?.innerBlocks?.filter(
            b => b.name === 'fluent-player/timed-content'
        ) || [];

        if (timedBlocks.length > 0) {
            wp.data.dispatch('core/block-editor').replaceInnerBlocks(clientId, timedBlocks, false);
        }
    }, [mediaState.data, clientId]);

    useEffect(() => {
        fetchPlayerPresets();
        const availableMediaItems = Object.values(blockVars.mediaItems || []).map(item => ({
            label:     item.label,
            value:     item.value,
            title:     item.title || item.label,
            provider:  item.settings?.provider || 'wordpress',
            posterSrc: item.settings?.posterSrc || '',
            duration:  item.settings?.duration || null,
        }));
        updateMediaState({ items: availableMediaItems });
    }, []);

    useEffect(() => {
        if (mediaState.data && playerState.currentPreset) {
            updatePlayerState({
                settings: {
                    ...mediaState.data.settings,
                    ...playerState.currentPreset.settings,
                }
            });
        } else if (mediaState.data) {
            updatePlayerState({ settings: mediaState.data.settings });
        }

        // Expose media data to global cache for FluentCommunity integration
        if (mediaState.data && mediaState.data.ID) {
            if (!window.fluentPlayerMediaCache) {
                window.fluentPlayerMediaCache = {};
            }
            window.fluentPlayerMediaCache[mediaState.data.ID] = {
                settings: mediaState.data.settings,
                title: mediaState.data.title
            };
        }

        // Cleanup cache entry on unmount
        const cachedId = mediaState.data?.ID;
        return () => {
            if (cachedId && window.fluentPlayerMediaCache) {
                delete window.fluentPlayerMediaCache[cachedId];
            }
        };
    }, [mediaState.data, playerState.currentPreset]);

    useEffect(() => {
        if (playerState.presets.length) {
            const selectedPreset = playerState.presets.find(p => p.slug === mediaState.data?.settings?.preset_slug);
            if (selectedPreset) {
                updatePlayerState({ currentPreset: selectedPreset });
                return;
            }

            let defaultPreset = playerState.presets.find(p => p.slug === playerDefaultSettings.defaultPresetSlug);

            if (!defaultPreset) {
                defaultPreset = playerState.presets.find(p => p.slug === 'course');
            }

            if (!defaultPreset) {
                defaultPreset = playerState.presets[0];
            }
            if (defaultPreset && mediaState.data?.settings) {
                updateMediaData({
                    ...mediaState.data,
                    settings: {
                        ...mediaState.data.settings,
                        preset_slug: defaultPreset.slug
                    }
                });
            }
        }
    }, [playerState.presets, mediaState.data?.settings?.preset_slug]);

    useEffect(() => {
        if (mediaState.data && mediaState.originalData && wp.data?.dispatch) {
            try {
                const currentData = JSON.stringify(mediaState.data);
                const originalData = JSON.stringify(mediaState.originalData);
                const hasMediaChanged = currentData !== originalData;

                if (hasMediaChanged) {
                    const dispatch = wp.data.dispatch('core/editor');
                    if (dispatch) {
                        dispatch.unlockPostSaving('fluent-player/media');
                        dispatch.editPost({ edited: true });
                    }
                }
            } catch (e) {
                // Fallback: mark as changed if comparison fails
                const dispatch = wp.data.dispatch('core/editor');
                if (dispatch) {
                    dispatch.editPost({ edited: true });
                }
            }
        }
    }, [mediaState.data]);

    useEffect(() => {
        const isDedicatedPlayerPage = wp.data.select('core/editor').getCurrentPostType() === 'fluent_player_media';
        updateAppState({ isDedicatedPlayer: isDedicatedPlayerPage });

        // Auto-select block when it's a dedicated player
        if (isDedicatedPlayerPage && clientId) {
            selectBlock(clientId);
        }
    }, [clientId, selectBlock]);

    // Keep ref in sync so the subscribe callback always sees latest data
    useEffect(() => {
        mediaDataRef.current = mediaState.data;
    }, [mediaState.data]);

    // Auto-save when player reports duration for YouTube (oEmbed doesn't include it).
    // duration <= 1 is the relay's onReady placeholder — saving it would burn the one-shot ref.
    const ytDurationSavedRef = useRef(false);
    useEffect(() => {
        const duration = mediaState.data?.settings?.duration;
        if (!ytDurationSavedRef.current && mediaState.data?.settings.provider === 'youtube' && duration > 1 && mediaState.data?.ID) {
            ytDurationSavedRef.current = true;
            saveMediaToServerRef.current?.(null, { silent: true });
        }
    }, [mediaState.data?.settings?.duration]);

    useEffect(() => {
        if (!wp.data?.subscribe) return;

        let wasSavingPost = false;
        const unsubscribe = wp.data.subscribe(() => {
            if (!mediaDataRef.current?.ID) return;

            const isCurrentlySaving = wp.data.select('core/editor').isSavingPost();
            const isCurrentlyAutosaving = wp.data.select('core/editor').isAutosavingPost();

            if (isCurrentlySaving && !wasSavingPost && !isCurrentlyAutosaving) {
                saveMediaToServerRef.current?.(null, { silent: true });

                // On non-CPT pages, sync timed content back to the CPT. Pro-only:
                // the sync route is registered only with Pro, so it 404s on free.
                if (!appState.isDedicatedPlayer && window.fluentPlayerBlockVars?.hasPro) {
                    const innerBlocks = wp.data.select('core/block-editor').getBlocks(clientId);
                    const serialized = wp.blocks.serialize(innerBlocks);
                    apiFetch({
                        path: `/fluent-player/v2/media/${mediaDataRef.current.ID}/timed-content`,
                        method: 'PUT',
                        data: { timed_content: serialized }
                    }).catch(() => {});
                }
            }
            wasSavingPost = isCurrentlySaving;
        });

        return () => unsubscribe();
    }, []);

    // FC lessons save via their own flow, so isSavingPost() never fires. FC emits this
    // FC-only event instead; persist settings via the same save. Inert outside FC.
    useEffect(() => {
        const handleLessonSave = () => {
            if (!mediaDataRef.current?.ID) return;
            saveMediaToServerRef.current?.(null, { silent: true });

            if (!appState.isDedicatedPlayer && window.fluentPlayerBlockVars?.hasPro) {
                const innerBlocks = wp.data.select('core/block-editor').getBlocks(clientId);
                const serialized = wp.blocks.serialize(innerBlocks);
                apiFetch({
                    path: `/fluent-player/v2/media/${mediaDataRef.current.ID}/timed-content`,
                    method: 'PUT',
                    data: { timed_content: serialized }
                }).catch(() => {});
            }
        };

        window.addEventListener('fluentcommunity:lesson:after_save', handleLessonSave);
        return () => window.removeEventListener('fluentcommunity:lesson:after_save', handleLessonSave);
    }, []);

    /**
     * Renders the inspector controls component
     *
     * @returns {JSX.Element} Inspector controls
     */
    const InspectorControlsComponent = () => (
        <InspectorControls>

            {mediaState.data && (

                <>
                    <PanelBody className="fluent-player-block-panel" title={<><BrandingIconSVG /> {__('Branding', 'fluent-player')}</>} initialOpen={false}>
                        <BrandingSettings
                            mediaData={mediaState.data}
                            setMediaData={setMediaDataWithDirty}
                            defaultBrandColor={playerDefaultSettings.brandColor || '#2597D0'}
                        />
                    </PanelBody>

                    <PanelBody className="fluent-player-block-panel" title={<><GeneralSettingsIconSVG /> {__('General Settings', 'fluent-player')}</>} initialOpen={false}>
                        <GeneralSettings
                            attributes={attributes}
                            setAttributes={setAttributes}
                            mediaData={mediaState.data}
                            setMediaData={setMediaDataWithDirty}
                            presets={playerState.presets}
                        />
                    </PanelBody>

                    <PanelBody className="fluent-player-block-panel" title={<><PresetIconSVG /> {__('Preset', 'fluent-player')}</>} initialOpen={false}>
                        <PresetSelector
                            defaultSettings={playerDefaultSettings}
                            presets={playerState.presets}
                            fetchPresets={fetchPlayerPresets}
                            mediaData={mediaState.data}
                            setMediaData={setMediaDataWithDirty}
                            requestPath={apiRequestPath}
                            onVideoModalOpen={pauseMainPreview}
                        />
                    </PanelBody>

                    <PanelBody className="fluent-player-block-panel" title={<><ChapterIconSVG /> {__('Chapters', 'fluent-player')}</>} initialOpen={false}>
                        <ChapterSettings
                            mediaData={mediaState.data}
                            setMediaData={setMediaDataWithDirty}
                            presets={playerState.presets}
                            onVideoModalOpen={pauseMainPreview}
                            playerRef={mainPlayerRef}
                        />
                    </PanelBody>

                    <PanelBody className="fluent-player-block-panel" title={<><OverlayIconSVG /> {__('Text/Button Overlays', 'fluent-player')}</>} initialOpen={false}>
                        <OverlaySettings
                            mediaData={mediaState.data}
                            setMediaData={setMediaDataWithDirty}
                            presets={playerState.presets}
                            onVideoModalOpen={pauseMainPreview}
                        />
                    </PanelBody>

                    <PanelBody className="fluent-player-block-panel" title={<><LayerIconSVG /> {__('Interactive Layers', 'fluent-player')}</>} initialOpen={false}>
                        <LayersSettings
                            mediaData={mediaState.data}
                            setMediaData={setMediaDataWithDirty}
                            requestPath={apiRequestPath}
                            presets={playerState.presets}
                            onVideoModalOpen={pauseMainPreview}
                        />
                    </PanelBody>

                    <PanelBody className="fluent-player-block-panel" title={<><TimedContentWatchIconSVG /> {__('Timed Content Area', 'fluent-player')}</>} initialOpen={false}>
                        <TimedContentStylePanel
                            style={attributes.timedContentStyle || {}}
                            onChange={(style) => setAttributes({ timedContentStyle: style })}
                        />
                    </PanelBody>

                    <PanelBody className="fluent-player-block-panel" title={<><TagIconSVG /> {__('Tags', 'fluent-player')}</>} initialOpen={false}>
                        <TagSettings
                            mediaData={mediaState.data}
                            setMediaData={setMediaDataWithDirty}
                            requestPath={apiRequestPath}
                        />
                    </PanelBody>

                    <PanelBody className="fluent-player-block-panel" title={<><LanguageIconSVG /> {__('Multi-Language', 'fluent-player')}</>} initialOpen={false}>
                        <LanguageSwitcher
                            mediaData={mediaState.data}
                            setMediaData={setMediaDataWithDirty}
                        />
                    </PanelBody>

                    <PanelBody className="fluent-player-block-panel" title={<><SubtitleIconSVG /> {__('Subtitles', 'fluent-player')}</>} initialOpen={false}>
                        <SubtitleSettings
                            mediaData={mediaState.data}
                            setMediaData={setMediaDataWithDirty}
                            setPersistedMediaData={setPersistedMediaData}
                            saveMediaToServer={saveMediaToServer}
                        />
                    </PanelBody>

                    <PanelBody className="fluent-player-block-panel" title={<><TimestampIconSVG /> {__('Timestamp Links', 'fluent-player')}</>} initialOpen={false}>
                        <NotificationProvider>
                            <TimestampShortcode mediaData={mediaState.data}/>
                            <NotificationContainer />
                        </NotificationProvider>
                    </PanelBody>

                    <PanelBody className="fluent-player-block-panel" title={<><LightboxIconSVG /> {__('Lightbox', 'fluent-player')}</>} initialOpen={false}>
                        <NotificationProvider>
                            <ModalShortcode mediaData={mediaState.data}/>
                            <NotificationContainer />
                        </NotificationProvider>
                    </PanelBody>
                </>
            )}
        </InspectorControls>
    );

    // Main render logic
    if (appState.loading) {
        return (
            <>
                {InspectorControlsComponent()}
                <div {...useBlockProps({ className: 'wp-block-fluent-player-media' })}>
                    <div className="fluent-player-preview fluent-player-preview--loading" aria-busy="true">
                        <div className="fluent-player-preview-content">
                            <div className="fluent-player-loading">
                                <Spinner />
                                <p>{__('Loading Fluent Player...', 'fluent-player')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    if (appState.error) {
        return (
            <>
                {InspectorControlsComponent()}
                <div {...useBlockProps({ className: 'fluent-player-error' })}>
                    <Notice status="error" isDismissible={false}>
                        {appState.error}
                    </Notice>
                </div>
            </>
        );
    }

    if (!mediaState.selectedId || isReplaceMode) {
        return (
            <>
                {!isReplaceMode && InspectorControlsComponent()}
                {(mediaState.selectedId || isReplaceMode) && (
                    <BlockControls>
                        <ToolbarGroup>
                            <ToolbarButton
                                icon={isReplaceMode ? (close || 'no-alt') : (arrowLeft || 'arrow-left-alt')}
                                label={isReplaceMode ? __('Close Replace', 'fluent-player') : __('Replace Media', 'fluent-player')}
                                onClick={isReplaceMode ? handleCloseReplace : handleReplaceMediaClick}
                            />
                        </ToolbarGroup>
                    </BlockControls>
                )}
                <div {...useBlockProps({ className: 'wp-block-fluent-player-media' })}>
                    <MediaSelector
                        mediaItems={mediaState.items}
                        selectedMedia={mediaState.selectedId}
                        handleMediaSelect={handleMediaSelection}
                        setMediaSource={(source) => updateMediaState({ source })}
                        openMediaLibrary={openVideoMediaLibrary}
                        mediaSource={mediaState.source}
                        url={mediaUrlInput.url}
                        setUrl={(url) => setMediaUrlInput({ url })}
                        processAndLoadVideo={processAndLoadVideoFromUrl}
                        openAudioLibrary={openAudioMediaLibrary}
                        error={appState.error}
                        attributes={attributes}
                        setAttributes={setAttributes}
                        mediaData={mediaState.data}
                        setMediaData={setMediaDataWithDirty}
                        setSelectedMedia={(id) => updateMediaState({ selectedId: id })}
                        defaultSettings={playerDefaultSettings}
                        isDedicatedPlayer={appState.isDedicatedPlayer}
                        saveMediaToServer={saveMediaToServer}
                    />
                </div>
            </>
        );
    }

    return (
        <>
            {InspectorControlsComponent()}
            <BlockControls>
                <ToolbarGroup>
                    <ToolbarButton
                        icon={arrowLeft || "arrow-left-alt"}
                        label={__('Replace Media', 'fluent-player')}
                        onClick={handleReplaceMediaClick}
                    />
                </ToolbarGroup>
                <QuickLinks
                    mediaId={mediaState.data?.ID}
                    adminUrls={blockVars.adminUrls}
                    isDedicatedPlayer={appState.isDedicatedPlayer}
                />
            </BlockControls>
            <div {...useBlockProps({ className: 'wp-block-fluent-player-media' })}>
                {mediaState.data && (
                    <div className="fluent-player-preview" onKeyDownCapture={handlePreviewKeyDown}>
                        <div className="fluent-player-preview-content">
                            {playerState.settings ? (
                                <FluentPlayer
                                    defaultSettings={playerDefaultSettings}
                                    mediaData={playerState.settings}
                                    updateMediaSettings={updateMediaSetting}
                                    onPlayerReady={(el) => { mainPlayerRef.current = el; }}
                                    showChapterStrip
                                />
                            ) : (
                                <div className="fluent-player-preview-placeholder">
                                    {__('Preview not available', 'fluent-player')}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {window.fluentPlayerBlockVars?.hasPro && mediaState.data && (attributes.timedContentStyle || {}).enabled !== false ? (
                    <TimedContentManager
                        clientId={clientId}
                        duration={mediaState.data?.settings?.duration || 0}
                        timedContentStyle={attributes.timedContentStyle || {}}
                    >
                        <InnerBlocks
                            allowedBlocks={['fluent-player/timed-content']}
                            templateLock={false}
                            renderAppender={false}
                        />
                    </TimedContentManager>
                ) : (
                    <div style={{ display: 'none' }}>
                        <InnerBlocks
                            allowedBlocks={['fluent-player/timed-content']}
                            templateLock={false}
                            renderAppender={false}
                        />
                    </div>
                )}
            </div>
        </>
    );
};

const Edit = (props) => (
    <NotificationProvider>
        <EditInner {...props} />
        <NotificationContainer />
    </NotificationProvider>
);

export default Edit;
