// Shared playlist settings defaults + merge, so the block editor and the page-builder
// settings apps normalise a playlist's stored settings identically.

export const DEFAULT_PLAYLIST_SETTINGS = {
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

export const mergePlaylistSettings = (settings = {}) => ({
    ...DEFAULT_PLAYLIST_SETTINGS,
    ...settings,
    appearance: { ...DEFAULT_PLAYLIST_SETTINGS.appearance, ...settings?.appearance },
    layout: { ...DEFAULT_PLAYLIST_SETTINGS.layout, ...settings?.layout },
    typography: { ...DEFAULT_PLAYLIST_SETTINGS.typography, ...settings?.typography },
    behavior: { ...DEFAULT_PLAYLIST_SETTINGS.behavior, ...settings?.behavior },
    learning: { ...DEFAULT_PLAYLIST_SETTINGS.learning, ...settings?.learning },
    grid: { ...DEFAULT_PLAYLIST_SETTINGS.grid, ...settings?.grid }
});
