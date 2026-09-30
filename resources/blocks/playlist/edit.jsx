/**
 * WordPress dependencies
 */
const { __ } = wp.i18n;
const { useState, useEffect, useCallback, useMemo, useRef } = wp.element;
const {
    PanelBody,
    Spinner,
    Notice,
    ToolbarGroup,
    ToolbarButton
} = wp.components;
const { InspectorControls, BlockControls, useBlockProps } = wp.blockEditor;
const { apiFetch } = wp;
const { arrowLeft, close } = wp.icons || {};
const { useDispatch } = wp.data;

/**
 * Internal dependencies
 */
import PlaylistSelector from './components/PlaylistSelector.jsx';
import PlaylistEditor from './components/PlaylistEditor.jsx';
import GeneralSettings from './components/settings/GeneralSettings.jsx';
import LayoutSettings from './components/settings/LayoutSettings.jsx';
import AppearanceSettings from './components/settings/AppearanceSettings.jsx';
import useGlobalSettings from '../hooks/useGlobalSettings.js';
import useTags from '../hooks/useTags.js';
import { GeneralSettingsIconSVG, PresetIconSVG, BrandingIconSVG } from '../media/components/common/Icons.jsx';
import { NotificationProvider } from '../media/components/common/NotificationContext.jsx';
import NotificationContainer from '../media/components/common/NotificationContainer.jsx';
import { useNotification } from '../media/components/common/useNotification.js';
import { resolveAspectRatioValue, toCssAspectRatio } from './utils/ratio.js';

/**
 * Default playlist settings
 */
const DEFAULT_PLAYLIST_SETTINGS = {
    title: '',
    medias: [],
    appearance: {
        backgroundColor: '#ffffff',
        textColor: '#333333',
        brandColor: {
            mode: 'auto',
            value: '#DD1F13'
        },
        borderRadius: { value: 8, unit: 'px' },
        borderColor: '#e1e5e9',
        borderWidth: { value: 0, unit: 'px' },
        separator: { type: 'line', size: { value: 1, unit: 'px' } },
        boxShadow: {
            enabled: false,
            horizontal: 0,
            vertical: 4,
            blur: 10,
            spread: 0,
            color: 'rgba(0, 0, 0, 0.1)',
            position: 'outline'
        }
    },
    layout: {
        type: 'standard',
        position: 'right',
        showHeader: true,
        headerPosition: 'top',
        sidebarWidth: 40
    },
    typography: {
        enabled: false,
        fontSize: { value: 14, unit: 'px' },
        fontWeight: '400',
        lineHeight: 1.4
    },
    behavior: {
        autoplay: false,
        continuousPlay: true,
        loop: false,
        showThumbnails: true,
        thumbnailGridLayout: false,
        showThumbnailInfo: true,
        titlePosition: 'overlay',
        showNavButtons: true,
        showPlaylistMenuToggle: true
    },
    learning: {
        enableProgress: true,
        enableChapters: true,
        completionThreshold: 80,
        showLockedContent: true
    },
    grid: {
        columns: 3,
        itemsPerPage: 12,
        displayMode: 'inline',
        showPlayerOnTop: true,
        enableSearch: true,
        enableFilters: true,
        lazyLoad: true,
        modalLayout: 'centered',
        modalShowInfo: true
    }
};

const mergePlaylistSettings = (settings = {}) => ({
    ...DEFAULT_PLAYLIST_SETTINGS,
    ...settings,
    appearance: { ...DEFAULT_PLAYLIST_SETTINGS.appearance, ...settings?.appearance },
    layout: { ...DEFAULT_PLAYLIST_SETTINGS.layout, ...settings?.layout },
    typography: { ...DEFAULT_PLAYLIST_SETTINGS.typography, ...settings?.typography },
    behavior: { ...DEFAULT_PLAYLIST_SETTINGS.behavior, ...settings?.behavior },
    learning: { ...DEFAULT_PLAYLIST_SETTINGS.learning, ...settings?.learning },
    grid: { ...DEFAULT_PLAYLIST_SETTINGS.grid, ...settings?.grid }
});

/**
 * Custom hook for playlist state management
 */
const usePlaylistState = (initialPlaylistId = null) => {
    const [playlistState, setPlaylistState] = useState({
        data: null,
        originalData: null,
        selectedId: initialPlaylistId,
        items: [],
        medias: [],
        isDirty: false
    });

    const updatePlaylistState = useCallback((updatesOrFn) => {
        setPlaylistState(prev => {
            const updates = typeof updatesOrFn === 'function' ? updatesOrFn(prev) : updatesOrFn;
            return updates ? { ...prev, ...updates } : prev;
        });
    }, []);

    const updatePlaylistData = useCallback((updatedData) => {
        setPlaylistState(prev => ({ ...prev, data: updatedData, isDirty: true }));
    }, []);

    const updatePlaylistSetting = useCallback((key, value) => {
        setPlaylistState(prev => ({
            ...prev,
            isDirty: true,
            data: {
                ...prev.data,
                settings: {
                    ...prev.data.settings,
                    [key]: value
                }
            }
        }));
    }, []);

    const reorderPlaylistMedias = useCallback((fromIndex, toIndex) => {
        setPlaylistState(prev => {
            if (!prev.data?.settings) return prev;

            const currentMediaIds = [...(prev.data.settings.medias || [])];
            const currentMedias = [...(prev.medias || [])];

            const [movedMediaId] = currentMediaIds.splice(fromIndex, 1);
            currentMediaIds.splice(toIndex, 0, movedMediaId);

            const [movedMedia] = currentMedias.splice(fromIndex, 1);
            currentMedias.splice(toIndex, 0, movedMedia);

            return {
                ...prev,
                isDirty: true,
                medias: currentMedias,
                data: {
                    ...prev.data,
                    settings: {
                        ...prev.data.settings,
                        medias: currentMediaIds
                    }
                }
            };
        });
    }, []);

    return [playlistState, updatePlaylistState, updatePlaylistData, updatePlaylistSetting, reorderPlaylistMedias];
};

/**
 * Custom hook for app state
 */
const useAppState = () => {
    const [appState, setAppState] = useState({
        loading: false,
        isSaving: false,
        error: null
    });

    const updateAppState = (updates) => setAppState(prev => ({ ...prev, ...updates }));

    return [appState, updateAppState];
};

/**
 * Helper function to format box shadow value
 */
const getBoxShadowValue = (boxShadow = {}) => {
    if (!boxShadow || !boxShadow.enabled) return 'none';
    const position = boxShadow.position === 'outline' ? '' : 'inset';
    const h = boxShadow.horizontal ?? 0;
    const v = boxShadow.vertical ?? 2;
    const blur = boxShadow.blur ?? 8;
    const spread = boxShadow.spread ?? 0;
    const color = boxShadow.color ?? '#000000';
    return `${position} ${h}px ${v}px ${blur}px ${spread}px ${color}`.trim();
};

/**
 * Helper function to format CSS value with unit
 */
const formatCssValue = (value) => {
    if (!value) return '';
    if (typeof value === 'object' && value.value !== undefined && value.unit !== undefined) {
        return `${value.value}${value.unit}`;
    }
    return value;
};

/**
 * Get appearance styles from settings
 */
const getAppearanceStyles = (settings, getBrandColor, medias = []) => {
    if (!settings) return {};
    const appearance = settings.appearance || {};
    const typography = settings.typography || {};
    const layout = settings.layout || {};

    const globalBrand = typeof getBrandColor === 'function' ? getBrandColor() : '#DD1F13';
    const mode = appearance.brandColor?.mode || 'auto';

    let brandColorValue = globalBrand;
    if (mode === 'custom') {
        brandColorValue = appearance.brandColor?.value || globalBrand;
    } else if (mode === 'auto') {
        const sourceId = parseInt(settings.preset_source_media_id, 10) || 0;
        const sourceMedia = sourceId
            ? medias.find((m) => parseInt(m.ID, 10) === sourceId)
            : medias[0];
        const sourceSettings = sourceMedia?.settings;
        if (sourceSettings?.useCustomBranding) {
            brandColorValue = sourceSettings.brandingColor || '#DD1F13';
        }
    }

    const styles = {
        '--fp-playlist-background-color': appearance.backgroundColor || '#ffffff',
        '--fp-playlist-text-color': appearance.textColor || '#333333',
        '--fp-playlist-brand-color': brandColorValue,
        '--media-brand': brandColorValue,
    };

    // Border radius
    if (appearance.borderRadius) {
        styles['--fp-playlist-border-radius'] = formatCssValue(appearance.borderRadius);
    }

    // Border color - always set (has default)
    styles['--fp-playlist-border-color'] = appearance.borderColor || '#e1e5e9';

    // Border width - default to 0 if not set
    styles['--fp-playlist-border-width'] = formatCssValue(appearance.borderWidth || { value: 0, unit: 'px' });

    // Separator between player and playlist: a line (border) or whitespace (gap).
    const separator = appearance.separator || { type: 'line', size: { value: 1, unit: 'px' } };
    const separatorSize = formatCssValue(separator.size || { value: 1, unit: 'px' });
    styles['--fp-playlist-divider-width'] = separator.type === 'line' ? separatorSize : '0';
    styles['--fp-playlist-divider-gap'] = separator.type === 'space' ? separatorSize : '0';

    // Box shadow - always set (defaults to 'none' if disabled)
    styles['--fp-playlist-box-shadow'] = getBoxShadowValue(appearance.boxShadow);

    // Typography - branch on typography.enabled: custom values when enabled, defaults when disabled
    if (typography.enabled && typography.fontSize) {
        styles['--fp-playlist-font-size'] = formatCssValue(typography.fontSize);
    } else {
        styles['--fp-playlist-font-size'] = '14px';
    }
    if (typography.enabled && typography.fontWeight != null) {
        styles['--fp-playlist-font-weight'] = String(typography.fontWeight);
    } else {
        styles['--fp-playlist-font-weight'] = '400';
    }
    if (typography.enabled && typography.lineHeight != null) {
        styles['--fp-playlist-line-height'] = String(typography.lineHeight);
    } else {
        styles['--fp-playlist-line-height'] = '1.4';
    }

    // Layout variables
    const gapVal = layout.containerGap != null ? formatCssValue(layout.containerGap) : '16px';
    const sidebarVal = layout.sidebarWidth != null ? (typeof layout.sidebarWidth === 'object' ? formatCssValue(layout.sidebarWidth) : `${layout.sidebarWidth}%`) : '40%';
    const spacingVal = layout.itemSpacing != null ? formatCssValue(layout.itemSpacing) : '8px';
    styles['--fp-playlist-gap'] = gapVal;
    styles['--fp-playlist-sidebar-width'] = sidebarVal;
    styles['--fp-playlist-item-spacing'] = spacingVal;

    const resolvedRatio = resolveAspectRatioValue(layout.thumbnailRatio);
    const cssRatio = toCssAspectRatio(resolvedRatio);
    if (cssRatio && cssRatio !== '16 / 9') {
        styles['--fp-playlist-thumbnail-ratio'] = cssRatio;
    }

    return styles;
};

/**
 * Edit component for the Fluent Player Playlist block
 */
const EditInner = (props) => {
    const { attributes, setAttributes, clientId } = props;

    const [appState, updateAppState] = useAppState();
    const { showNotification } = useNotification();
    const [
        playlistState,
        updatePlaylistState,
        updatePlaylistData,
        updatePlaylistSetting,
        reorderPlaylistMedias
    ] = usePlaylistState(attributes.playlistId);

    const { selectBlock } = useDispatch('core/block-editor');

    const [isReplaceMode, setIsReplaceMode] = useState(false);

    const blockVars = window.fluentPlayerBlockVars || {};
    const apiRequestPath = `${blockVars.rest?.namespace}/${blockVars.rest?.version}`;

    const isPlaylistCPT = wp.data?.select('core/editor')?.getCurrentPostType?.() === 'fluent_playlist';
    const currentPostId = wp.data?.select('core/editor')?.getCurrentPostId?.();
    const isBlockSelected = wp.data?.select('core/block-editor')?.isBlockSelected(clientId);

    const playlistDataRef = useRef(null);
    const playlistIsDirtyRef = useRef(false);
    const savePlaylistRef = useRef(null);
    const autoSaveTimerRef = useRef(null);
    const replaceOriginRef = useRef(null);
    const committedPlaylistIdRef = useRef(attributes.playlistId);

    const { getBrandColor } = useGlobalSettings();
    const hasAutoSelectedRef = useRef(false);
    const [tagMedias, setTagMedias] = useState([]);
    const [isTagMediasLoading, setIsTagMediasLoading] = useState(false);
    const [tagMediasError, setTagMediasError] = useState('');
    const [tagMediasRequestNonce, setTagMediasRequestNonce] = useState(0);
    const tagMediasRequestIdRef = useRef(0);
    const sourceType = attributes.sourceType || 'playlist';
    const isTagMode = sourceType === 'tags';
    const tags = Array.isArray(attributes.tags) ? attributes.tags : [];
    const query = attributes.query || { limit: 20, orderby: 'date', order: 'DESC' };
    const normalizedTagLimit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
    const { tagOptions } = useTags({ enabled: isTagMode });

    const settings = useMemo(() => {
        const settings = mergePlaylistSettings(attributes.settings || {});
        settings.medias = [];
        return settings;
    }, [attributes.settings]);

    const tagPlaylistData = useMemo(() => ({
        ID: 0,
        post_title: settings.title || __('Playlist by Tags', 'fluent-player'),
        settings
    }), [settings]);

    const currentPlaylistData = isTagMode ? tagPlaylistData : playlistState.data;
    const currentPlaylistMedias = isTagMode ? tagMedias : playlistState.medias;

    const setSettings = useCallback((nextSettings) => {
        const merged = mergePlaylistSettings(nextSettings || {});
        if (merged.medias) {
            delete merged.medias;
        }
        setAttributes({
            settings: merged
        });
    }, [setAttributes]);

    const updateCurrentPlaylistData = useCallback((updatedData) => {
        if (isTagMode) {
            setSettings(updatedData?.settings || {});
            return;
        }
        updatePlaylistData(updatedData);
    }, [isTagMode, setSettings, updatePlaylistData]);

    const updateCurrentPlaylistSetting = useCallback((key, value) => {
        if (isTagMode) {
            setSettings({
                ...settings,
                [key]: value
            });
            return;
        }
        updatePlaylistSetting(key, value);
    }, [isTagMode, setSettings, settings, updatePlaylistSetting]);

    const handlePlaylistTitleChange = useCallback((value) => {
        updateCurrentPlaylistSetting('title', value);

        if (!isTagMode && isPlaylistCPT && wp.data?.dispatch) {
            wp.data.dispatch('core/editor')?.editPost?.({ title: value });
        }
    }, [updateCurrentPlaylistSetting, isTagMode, isPlaylistCPT]);

    useEffect(() => {
        if (!isPlaylistCPT || !clientId || isBlockSelected || hasAutoSelectedRef.current) {
            return;
        }

        const timer = setTimeout(() => {
            selectBlock(clientId);
            hasAutoSelectedRef.current = true;
        }, 10);

        return () => clearTimeout(timer);
    }, [isPlaylistCPT, clientId, isBlockSelected, selectBlock]);

    // Keep refs in sync so subscribe callbacks always see latest data
    useEffect(() => {
        playlistDataRef.current = playlistState.data;
    }, [playlistState.data]);

    useEffect(() => {
        committedPlaylistIdRef.current = attributes.playlistId;
    }, [attributes.playlistId]);

    useEffect(() => {
        playlistIsDirtyRef.current = playlistState.isDirty;
    }, [playlistState.isDirty]);

    useEffect(() => {
        if (!isPlaylistCPT || isTagMode || !wp.data?.subscribe) return;

        let previousTitle = wp.data?.select('core/editor')?.getEditedPostAttribute?.('title');

        const unsubscribe = wp.data.subscribe(() => {
            if (!playlistDataRef.current) return;

            const currentTitle = wp.data?.select('core/editor')?.getEditedPostAttribute?.('title');

            if (currentTitle && currentTitle !== previousTitle) {
                previousTitle = currentTitle;
                if (playlistDataRef.current?.settings?.title !== currentTitle) {
                    updatePlaylistSetting('title', currentTitle);
                }
            }
        });

        return () => unsubscribe();
    }, [isPlaylistCPT, isTagMode, updatePlaylistSetting]);

    /**
     * Fetches playlist data from server
     */
    const fetchPlaylistData = async (playlistId) => {
        updateAppState({ loading: true, error: null });

        try {
            const response = await apiFetch({
                path: `/fluent-player/v2/playlist/${playlistId}`
            });

            const settings = mergePlaylistSettings(response.settings || {});

            const playlistData = { ...response, settings };

            updatePlaylistState({
                data: playlistData,
                originalData: JSON.parse(JSON.stringify(playlistData)),
                    isDirty: false,
                selectedId: playlistId
            });

            if (settings.medias && settings.medias.length > 0) {
                await fetchPlaylistMedias(settings.medias);
            }
        } catch (err) {
            console.error('Error fetching playlist:', err);
            updateAppState({ error: __('Failed to load playlist data. Please try again.', 'fluent-player') });
        } finally {
            updateAppState({ loading: false });
        }
    };

    /**
     * Fetches media items for the playlist
     */
    const fetchPlaylistMedias = async (mediaIds) => {
        try {
            const response = await apiFetch({
                path: `/fluent-player/v2/media/search?medias=${encodeURIComponent(JSON.stringify(mediaIds))}`
            });

            if (Array.isArray(response)) {
                updatePlaylistState({ medias: response });
            }
        } catch (err) {
            console.error('Error fetching playlist medias:', err);
        }
    };

    /**
     * Saves playlist to server
     */
    const savePlaylist = async () => {
        if (isTagMode) return;
        if (appState.isSaving || !playlistState.data) return;

        updateAppState({ isSaving: true });

        try {
            const playlistId = playlistState.data?.ID;
            const isNew = !playlistId;

            const response = await apiFetch({
                path: `${apiRequestPath}/playlist${playlistId ? '/' + playlistId : ''}`,
                method: playlistId ? 'PUT' : 'POST',
                data: {
                    id: playlistId,
                    settings: JSON.stringify(playlistState.data.settings)
                }
            });

            if (response?.playlist && (isNew || committedPlaylistIdRef.current === playlistId)) {
                setAttributes({ playlistId: response.playlist.ID });
                updatePlaylistState({
                    isDirty: false,
                    data: response.playlist,
                    selectedId: response.playlist.ID,
                    originalData: JSON.parse(JSON.stringify(response.playlist)),
                });
            }

            showNotification({
                type: 'success',
                message: response.message || __(`Playlist ${isNew ? 'created' : 'updated'} successfully.`, 'fluent-player'),
            });
        } catch (error) {
            console.error('Error saving playlist:', error);
            showNotification({
                type: 'error',
                message: __('Failed to save playlist.', 'fluent-player'),
            });
        } finally {
            updateAppState({ isSaving: false });
        }
    };

    // Keep ref in sync so the subscribe callback always calls the latest version
    savePlaylistRef.current = savePlaylist;

    // Debounced auto-save: persist changes 1.5s after last edit.
    // FC editor never triggers isSavingPost(), so auto-save ensures title/settings
    // changes reach the server before FC's UPDATE_EDITOR message can reset block state.
    useEffect(() => {
        if (!playlistState.isDirty || !playlistState.data) return;

        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
            savePlaylistRef.current?.();
        }, 1500);

        return () => clearTimeout(autoSaveTimerRef.current);
    }, [playlistState.isDirty, playlistState.data?.settings]);

    /**
     * Handles playlist selection
     */
    const handlePlaylistSelection = (playlistId) => {
        const id = parseInt(playlistId);
        if (!id) return;

        if (isReplaceMode && id === attributes.playlistId && replaceOriginRef.current) {
            handleCloseReplace();
            return;
        }

        replaceOriginRef.current = null;
        setIsReplaceMode(false);
        setAttributes({ playlistId: id, sourceType: 'playlist' });
    };

    const handleCreateTagPlaylist = (nextTags) => {
        const arr = Array.isArray(nextTags) ? nextTags : [];
        if (!arr.length) return;

        replaceOriginRef.current = null;
        setIsReplaceMode(false);

        setAttributes({
            sourceType: 'tags',
            tags: arr,
            query: {
                limit: query.limit ?? 20,
                orderby: query.orderby || 'date',
                order: query.order || 'DESC'
            },
            settings: Object.keys(attributes.settings || {}).length
                ? attributes.settings
                : {
                    ...DEFAULT_PLAYLIST_SETTINGS,
                    title: __('Playlist by Tags', 'fluent-player'),
                    medias: []
                }
        });
    };

    const handleTagsChange = (nextTags) => {
        setAttributes({ tags: Array.isArray(nextTags) ? nextTags : [] });
    };

    const handleQueryChange = (key, value) => {
        setAttributes({
            query: {
                ...query,
                [key]: key === 'limit' ? Math.max(1, Math.min(100, parseInt(value, 10) || 20)) : value
            }
        });
    };

    const retryTagMediasFetch = useCallback(() => {
        setTagMediasRequestNonce((prev) => prev + 1);
    }, []);

    /**
     * Creates a new playlist
     */
    const createNewPlaylist = async (title = '') => {
        updateAppState({ loading: true });

        try {
            const newSettings = {
                ...DEFAULT_PLAYLIST_SETTINGS,
                title: title || __('New Playlist', 'fluent-player')
            };

            const response = await apiFetch({
                path: `${apiRequestPath}/playlist`,
                method: 'POST',
                data: {
                    settings: JSON.stringify(newSettings),
                    not_dedicated_page: 'yes'
                }
            });

            if (response?.playlist) {
                replaceOriginRef.current = null;
                setIsReplaceMode(false);
                setAttributes({ playlistId: response.playlist.ID, sourceType: 'playlist' });
                updatePlaylistState({
                    data: response.playlist,
                    selectedId: response.playlist.ID,
                    originalData: JSON.parse(JSON.stringify(response.playlist)),
                    isDirty: false,
                    items: [...playlistState.items, {
                        label: response.playlist.post_title || newSettings.title,
                        value: response.playlist.ID
                    }]
                });
            }
        } catch (error) {
            console.error('Error creating playlist:', error);
            updateAppState({ error: __('Failed to create playlist.', 'fluent-player') });
        } finally {
            updateAppState({ loading: false });
        }
    };

    const handleReplaceClick = async () => {
        if (!isTagMode) {
            clearTimeout(autoSaveTimerRef.current);
            if (playlistState.isDirty && playlistState.data) {
                await savePlaylistRef.current?.();
            }
        }

        replaceOriginRef.current = {
            selectedId: playlistState.selectedId,
            data: playlistState.data,
            originalData: playlistState.originalData,
            medias: playlistState.medias,
            isDirty: playlistState.isDirty,
        };

        updatePlaylistState({ selectedId: null, data: null, medias: [] });
        setIsReplaceMode(true);
    };

    const handleCloseReplace = () => {
        const origin = replaceOriginRef.current;

        if (origin) {
            updatePlaylistState({
                selectedId: origin.selectedId,
                data: origin.data,
                originalData: origin.originalData,
                medias: origin.medias,
                isDirty: origin.isDirty,
            });
        }

        replaceOriginRef.current = null;
        setIsReplaceMode(false);
    };

    /**
     * Adds media to playlist
     */
    const addMediaToPlaylist = (media) => {
        const mediaArray = Array.isArray(media) ? media : [media];

        updatePlaylistState((prev) => {
            const currentMediaIds = prev.data?.settings?.medias || [];
            const currentMedias = prev.medias || [];
            const newMediaIds = mediaArray.filter(m => !currentMediaIds.includes(m.ID)).map(m => m.ID);
            const newMedias = mediaArray.filter(m => !currentMediaIds.includes(m.ID));

            if (newMediaIds.length === 0) return null;

            return {
                isDirty: true,
                medias: [...currentMedias, ...newMedias],
                data: {
                    ...prev.data,
                    settings: {
                        ...prev.data.settings,
                        medias: [...currentMediaIds, ...newMediaIds]
                    }
                }
            };
        });
    };

    /**
     * Removes media from playlist
     */
    const removeMediaFromPlaylist = (mediaId) => {
        updatePlaylistState((prev) => ({
            isDirty: true,
            medias: (prev.medias || []).filter(m => m.ID !== mediaId),
            data: {
                ...prev.data,
                settings: {
                    ...prev.data.settings,
                    medias: (prev.data?.settings?.medias || []).filter(id => id !== mediaId)
                }
            }
        }));
    };


    // Effects
    // Auto-set playlistId when in playlist CPT context
    useEffect(() => {
        if (!isTagMode && isPlaylistCPT && currentPostId && !attributes.playlistId) {
            setAttributes({ playlistId: currentPostId });
        }
    }, [isTagMode, isPlaylistCPT, currentPostId, attributes.playlistId]);

    useEffect(() => {
        if (!isTagMode && attributes.playlistId) {
            fetchPlaylistData(attributes.playlistId);
        }
    }, [isTagMode, attributes.playlistId]);

    useEffect(() => {
        let cancelled = false;
        const requestId = ++tagMediasRequestIdRef.current;
        const previewOrderBy = query.orderby === 'rand' ? 'date' : (query.orderby || 'date');
        const previewOrder = query.orderby === 'rand' ? 'DESC' : (query.order || 'DESC');
        const previewTags = tags.map((tag) => {
            const option = tagOptions.find((item) => item?.name === tag || item?.slug === tag);
            return option?.slug || tag;
        });

        const fetchTagMedias = async () => {
            if (!isTagMode || !tags.length) {
                if (!cancelled && requestId === tagMediasRequestIdRef.current) {
                    setTagMedias([]);
                    setIsTagMediasLoading(false);
                    setTagMediasError('');
                }
                return;
            }

            if (!cancelled && requestId === tagMediasRequestIdRef.current) {
                setTagMedias([]);
                setIsTagMediasLoading(true);
                setTagMediasError('');
            }

            try {
                const response = await apiFetch({
                    path: `/fluent-player/v2/media?status=publish&per_page=${encodeURIComponent(String(normalizedTagLimit))}&tags=${encodeURIComponent(previewTags.join(','))}&orderby=${encodeURIComponent(String(previewOrderBy))}&order=${encodeURIComponent(String(previewOrder))}`
                });

                if (cancelled || requestId !== tagMediasRequestIdRef.current) {
                    return;
                }

                const items = Array.isArray(response?.data) ? response.data : [];
                setTagMedias(items);
                setIsTagMediasLoading(false);
            } catch (err) {
                if (cancelled || requestId !== tagMediasRequestIdRef.current) {
                    return;
                }

                setTagMedias([]);
                setIsTagMediasLoading(false);
                setTagMediasError(__('Failed to load media for selected tags.', 'fluent-player'));
            }
        };

        const timer = setTimeout(fetchTagMedias, 250);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [isTagMode, tags, normalizedTagLimit, query.orderby, query.order, tagOptions, tagMediasRequestNonce]);

    useEffect(() => {
        // Fetch available playlists
        const fetchPlaylists = async () => {
            try {
                const response = await apiFetch({
                    path: `/fluent-player/v2/playlist`
                });
                if (response?.data) {
                    const items = response.data.map(item => ({
                        label: `${item.post_title || 'Playlist'} (#${item.ID})`,
                        value: item.ID,
                        title: item.post_title || 'Playlist',
                        posterSrc: item.poster_src || '',
                        status: item.post_status || '',
                    }));
                    updatePlaylistState({ items });
                }
            } catch (err) {
                console.error('Error fetching playlists:', err);
            }
        };
        fetchPlaylists();
    }, []);

    useEffect(() => {
        if (isTagMode) return;
        if (playlistState.isDirty && wp.data?.dispatch('core/editor')) {
            wp.data.dispatch('core/editor').editPost({ meta: { _fluent_playlist_changed: Date.now() } });
        }
    }, [isTagMode, playlistState.isDirty, playlistState.data?.settings?.medias]);

    useEffect(() => {
        if (isTagMode || !wp.data?.subscribe) return;

        let wasSaving = false;
        const unsubscribe = wp.data.subscribe(() => {
            if (!playlistDataRef.current) return;

            const isSaving = wp.data.select('core/editor').isSavingPost();
            const isAutosaving = wp.data.select('core/editor').isAutosavingPost();

            if (isSaving && !wasSaving && !isAutosaving && playlistIsDirtyRef.current) {
                savePlaylistRef.current?.();
            }
            wasSaving = isSaving;
        });

        return () => unsubscribe();
    }, [isTagMode]);

    const appearanceStyles = useMemo(
        () => (currentPlaylistData ? getAppearanceStyles(currentPlaylistData.settings, getBrandColor, currentPlaylistMedias) : {}),
        [currentPlaylistData?.settings, currentPlaylistMedias, getBrandColor]
    );

    const blockProps = useBlockProps({ className: 'wp-block-fluent-player-playlist' });

    const renderInspectorControls = () => {
        if (!currentPlaylistData) {
            return <InspectorControls />;
        }
        if (isTagMode && !tags.length) {
            return <InspectorControls />;
        }

        return (
            <InspectorControls>
                <PanelBody 
                    className="fluent-player-block-panel" 
                    title={<><GeneralSettingsIconSVG /> {__('General Settings', 'fluent-player')}</>} 
                    initialOpen={true}
                >
                    <GeneralSettings
                        playlistData={currentPlaylistData}
                        updatePlaylistData={updateCurrentPlaylistData}
                        onTitleChange={handlePlaylistTitleChange}
                        medias={currentPlaylistMedias}
                        sourceType={sourceType}
                        tags={tags}
                        query={query}
                        onTagsChange={handleTagsChange}
                        onQueryChange={handleQueryChange}
                    />
                </PanelBody>

                <PanelBody 
                    className="fluent-player-block-panel" 
                    title={<><PresetIconSVG /> {__('Layout', 'fluent-player')}</>} 
                    initialOpen={false}
                >
                    <LayoutSettings
                        playlistData={currentPlaylistData}
                        updatePlaylistData={updateCurrentPlaylistData}
                    />
                </PanelBody>

                <PanelBody 
                    className="fluent-player-block-panel" 
                    title={<><BrandingIconSVG /> {__('Appearance', 'fluent-player')}</>} 
                    initialOpen={false}
                >
                    <AppearanceSettings
                        playlistData={currentPlaylistData}
                        updatePlaylistData={updateCurrentPlaylistData}
                        updatePlaylistSetting={updateCurrentPlaylistSetting}
                    />
                </PanelBody>
            </InspectorControls>
        );
    };

    if (appState.loading) {
        return (
            <>
                {renderInspectorControls()}
                <div {...blockProps} className={[blockProps.className, 'fluent-playlist-loading'].filter(Boolean).join(' ')}>
                    <Spinner />
                </div>
            </>
        );
    }

    if (appState.error) {
        return (
            <>
                {renderInspectorControls()}
                <div {...blockProps} className={[blockProps.className, 'fluent-playlist-loading'].filter(Boolean).join(' ')}>
                    <Notice status="error" isDismissible={false}>
                        {appState.error}
                    </Notice>
                </div>
            </>
        );
    }

    if (isReplaceMode || (!playlistState.selectedId && !isPlaylistCPT && (!isTagMode || !tags.length))) {
        return (
            <>
                {!isReplaceMode && renderInspectorControls()}
                {isReplaceMode && !isPlaylistCPT && (
                    <BlockControls>
                        <ToolbarGroup>
                            <ToolbarButton
                                icon={close || 'no-alt'}
                                label={__('Close Replace', 'fluent-player')}
                                onClick={handleCloseReplace}
                                showTooltip={true}
                            />
                        </ToolbarGroup>
                    </BlockControls>
                )}
                <div {...blockProps} className={[blockProps.className, 'wp-block-fluent-player-playlist'].filter(Boolean).join(' ')}>
                    <PlaylistSelector
                        playlists={playlistState.items}
                        selectedPlaylist={playlistState.selectedId}
                        onSelect={handlePlaylistSelection}
                        onCreate={createNewPlaylist}
                        onCreateTagPlaylist={handleCreateTagPlaylist}
                        isTagMode={isTagMode}
                        tags={tags}
                    />
                </div>
            </>
        );
    }

    if (!isTagMode && !playlistState.selectedId && isPlaylistCPT) {
        return (
            <>
                {renderInspectorControls()}
                <div {...blockProps} className={[blockProps.className, 'fluent-playlist-loading'].filter(Boolean).join(' ')}>
                    <Spinner />
                </div>
            </>
        );
    }

    const handleBlockClick = () => {
        if (!isBlockSelected && !isPlaylistCPT) {
            selectBlock(clientId);
        }
    };

    const handleBlockKeyDownCapture = (e) => {
        if (e.key !== 'Tab') return;
        const wrapper = e.currentTarget;
        const active = document.activeElement;
        if (!wrapper.contains(active)) return;
        const all = wrapper.querySelectorAll(
            'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
        );
        const inner = Array.prototype.filter.call(all, (el) => el !== wrapper);
        if (inner.length === 0) return;

        if (active === wrapper) {
            e.preventDefault();
            e.nativeEvent.stopImmediatePropagation();
            (e.shiftKey ? inner[inner.length - 1] : inner[0]).focus();
            return;
        }

        const idx = inner.indexOf(active);
        if (idx === -1) return;
        const hasNextInBlock = e.shiftKey ? idx > 0 : idx < inner.length - 1;
        if (hasNextInBlock) {
            e.nativeEvent.stopImmediatePropagation();
        }
    };

    return (
        <>
            {renderInspectorControls()}
            <BlockControls>
                {!isPlaylistCPT && (
                    <ToolbarGroup>
                        <ToolbarButton
                            icon={arrowLeft || "arrow-left-alt"}
                            label={__('Replace Playlist', 'fluent-player')}
                            onClick={handleReplaceClick}
                            showTooltip={true}
                        />
                    </ToolbarGroup>
                )}
                {playlistState.data && (
                    <ToolbarGroup>
                        <ToolbarButton
                            icon="cloud-upload"
                            label={appState.isSaving ? __('Saving...', 'fluent-player') : __('Save Playlist', 'fluent-player')}
                            onClick={savePlaylist}
                            disabled={!playlistState.isDirty || appState.isSaving}
                            showTooltip={true}
                        />
                    </ToolbarGroup>
                )}
            </BlockControls>
            <div
                {...blockProps}
                style={appearanceStyles}
                onClick={handleBlockClick}
                onFocus={handleBlockClick}
                onKeyDownCapture={handleBlockKeyDownCapture}
            >
                {currentPlaylistData && (
                    <PlaylistEditor
                        playlistData={currentPlaylistData}
                        medias={currentPlaylistMedias}
                        updatePlaylistData={updateCurrentPlaylistData}
                        addMedia={isTagMode ? () => {} : addMediaToPlaylist}
                        removeMedia={isTagMode ? () => {} : removeMediaFromPlaylist}
                        reorderMedia={isTagMode ? () => {} : reorderPlaylistMedias}
                        savePlaylist={savePlaylist}
                        isSaving={appState.isSaving}
                        allowMediaManagement={!isTagMode}
                        isTagMediasLoading={isTagMode && isTagMediasLoading}
                        tagMediasError={isTagMode ? tagMediasError : ''}
                        onRetryTagMedias={retryTagMediasFetch}
                    />
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
