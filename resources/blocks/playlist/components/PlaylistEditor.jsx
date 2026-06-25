const { __ } = wp.i18n;
const { useState, useEffect, useRef, useMemo, useCallback, memo } = wp.element;
const { Button, Spinner, Modal } = wp.components;
const { apiFetch } = wp;
import { NoMediaIconSVG, PlaylistDragHandleSVG, PlaylistPlayIconSVG, PlaylistTrashIconSVG, PlaylistEditIconSVG, PlaylistAddIconSVG, SearchIconSVG } from '../../media/components/common/Icons.jsx';
import { resolveAspectRatioValue, toCssAspectRatio } from '../utils/ratio.js';

/**
 * Provider icon component - matches icons from admin ListTable (IconYoutube, IconVimeo, IconBunnyCDN, IconUploaded)
 */
const ProviderIcon = ({ provider, size = 14 }) => {
    const p = (provider || '').toLowerCase();
    if (p === 'youtube') {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M22.0612 6.84699C21.8197 5.92316 21.1081 5.19559 20.2046 4.94867C18.5669 4.5 12 4.5 12 4.5C12 4.5 5.43315 4.5 3.79544 4.94867C2.89193 5.19563 2.18033 5.92316 1.93882 6.84699C1.5 8.52148 1.5 12.0152 1.5 12.0152C1.5 12.0152 1.5 15.5088 1.93882 17.1833C2.18033 18.1071 2.89193 18.8044 3.79544 19.0513C5.43315 19.5 12 19.5 12 19.5C12 19.5 18.5669 19.5 20.2046 19.0513C21.1081 18.8044 21.8197 18.1071 22.0612 17.1833C22.5 15.5088 22.5 12.0152 22.5 12.0152C22.5 12.0152 22.5 8.52148 22.0612 6.84699ZM9.85226 15.1871V8.84316L15.3409 12.0152L9.85226 15.1871Z" fill="#FF0000"/>
            </svg>
        );
    }
    if (p === 'vimeo') {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M22.4898 7.16428C22.3964 9.18992 20.9686 11.9637 18.2071 15.4841C15.3519 19.1615 12.9363 21 10.9601 21C9.73646 21 8.70011 19.8805 7.85422 17.6408C7.2889 15.5877 6.7242 13.5349 6.15909 11.4818C5.53056 9.24329 4.85666 8.12258 4.13615 8.12258C3.97907 8.12258 3.42928 8.45011 2.48806 9.10268L1.5 7.84136C2.53636 6.93893 3.55885 6.03671 4.56476 5.13324C5.94699 3.9496 6.98461 3.32714 7.67614 3.26421C9.31058 3.10864 10.3165 4.21565 10.6941 6.58544C11.1021 9.14215 11.3843 10.7325 11.5431 11.3549C12.0141 13.4761 12.5324 14.5353 13.0988 14.5353C13.5383 14.5353 14.1986 13.8474 15.0789 12.4717C15.9584 11.0955 16.4294 10.0485 16.493 9.32928C16.6182 8.14169 16.147 7.54644 15.0789 7.54644C14.5762 7.54644 14.0579 7.66108 13.5247 7.88768C14.5566 4.53778 16.5285 2.91092 19.4392 3.00376C21.5969 3.06648 22.6142 4.45325 22.4898 7.16428Z" fill="#32B8E8"/>
            </svg>
        );
    }
    if (p === 'bunny' || p === 'bunny_storage') {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M12.586 4.49533L17.5764 7.27103L12.9892 1C12.2331 2.02804 12.0819 3.36449 12.586 4.49533Z" fill="#F5841F"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M6.88899 1.9248L20.8015 9.63509C21.1544 9.78929 21.2552 10.2005 21.104 10.5603C21.0536 10.7145 20.9528 10.8173 20.8015 10.8687C19.743 11.537 18.5836 11.9996 17.3738 12.2052L14.4502 18.2706C14.4502 18.2706 13.5428 20.3781 11.0224 19.5556C12.081 18.4762 13.3412 17.4996 13.3412 15.8547C13.3412 14.107 11.9802 12.7192 10.2663 12.7192C8.55244 12.7192 7.19143 14.107 7.19143 15.8547C7.19143 18.0136 9.30856 18.9388 10.4679 20.4295C10.972 21.2005 10.9216 22.2285 10.3167 22.8968C8.9053 21.4575 6.13287 18.9902 4.97349 17.3968C4.36859 16.5743 4.01574 15.5977 3.96533 14.5697C4.06615 12.308 5.57838 10.3547 7.69551 9.68649C8.35081 9.48088 9.00611 9.42948 9.66142 9.42948C10.5688 9.48088 11.4761 9.78929 12.2826 10.2519C13.5428 10.9715 14.0973 10.8173 14.9542 10.0463C15.4583 9.63509 16.0128 8.24723 15.1559 7.93882C14.8534 7.83602 14.6014 7.78462 14.2989 7.73322C12.7363 7.42481 9.96386 7.11639 8.95571 6.55097C7.34266 5.62574 6.23368 3.72387 6.88899 1.9248Z" fill="#F47920"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M3.15938 8.60742C3.76427 8.60742 4.31876 9.12144 4.31876 9.78966V10.9719H3.15938C2.55449 10.9719 2 10.4579 2 9.78966C2 9.17284 2.50408 8.60742 3.15938 8.60742Z" fill="#F47920"/>
            </svg>
        );
    }
    // WordPress / self-hosted / uploaded - matches IconUploaded.vue
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4.8 18.2999H19.2V11.9999H21V19.1999C21 19.4386 20.9052 19.6675 20.7364 19.8363C20.5676 20.0051 20.3387 20.0999 20.1 20.0999H3.9C3.66131 20.0999 3.43239 20.0051 3.2636 19.8363C3.09482 19.6675 3 19.4386 3 19.1999V11.9999H4.8V18.2999ZM12.9 9.2999V15.5999H11.1V9.2999H6.6L12 3.8999L17.4 9.2999H12.9Z" fill="#525866"/>
        </svg>
    );
};

/**
 * Provider display label - matches admin ListTable sourceInfoByProvider
 */
const getProviderLabel = (provider) => {
    const p = (provider || '').toLowerCase();
    const labels = {
        youtube: 'YouTube',
        vimeo: 'Vimeo',
        bunny: 'Bunny Stream',
        bunny_storage: 'BunnyCDN Storage',
        wordpress: 'Uploaded',
    };
    return labels[p] || provider || 'Video';
};

/**
 * Format date for display (e.g. "Jan 15, 2025")
 */
const formatSearchDate = (dateStr) => {
    if (!dateStr) return null;
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return null;
    }
};

/**
 * Format duration for display in search results
 */
const formatSearchDuration = (seconds) => {
    if (seconds == null || isNaN(seconds) || seconds <= 0) return null;
    const h = Math.floor(Number(seconds) / 3600);
    const m = Math.floor((Number(seconds) % 3600) / 60);
    const s = Math.floor(Number(seconds) % 60);
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

/**
 * Media search component for adding media to playlist
 */
const MediaSearch = ({ onAdd, existingMediaIds, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);

    const searchMedia = async (query) => {
        setLoading(true);
        try {
            const response = await apiFetch({
                path: `/fluent-player/v2/media/search?q=${encodeURIComponent(query)}&status=publish&limit=20`
            });

            if (Array.isArray(response)) {
                setResults(response);
            } else if (response?.data) {
                setResults(response.data);
            } else {
                setResults([]);
            }
        } catch (err) {
            console.error('Error searching media:', err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            searchMedia(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const toggleSelection = (media) => {
        if (existingMediaIds.includes(media.ID)) return;

        setSelectedItems(prev => {
            const exists = prev.find(m => m.ID === media.ID);
            if (exists) {
                return prev.filter(m => m.ID !== media.ID);
            }
            return [...prev, media];
        });
    };

    const handleAddSelected = () => {
        if (selectedItems.length > 0) {
            onAdd(selectedItems);
            setSelectedItems([]);
            onClose();
        }
    };

    return (
        <div className="fp-media-search">
            <div className="fp-media-search__header">
                <div className="fp-media-search__input-wrapper">
                    <SearchIconSVG />
                    <input
                        type="text"
                        placeholder={__('Search media...', 'fluent-player')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="fp-media-search__input"
                        autocomplete="off"
                        aria-label={__('Search media', 'fluent-player')}
                    />
                </div>
            </div>

            {loading ? (
                <div className="fp-media-search__loading">
                    <Spinner />
                </div>
            ) : (
                <div className="fp-media-search__results">
                    {results.map(media => {
                        const isInPlaylist = existingMediaIds.includes(media.ID);
                        const isSelected = selectedItems.find(m => m.ID === media.ID);
                        const provider = media.settings?.provider || 'wordpress';
                        const duration = formatSearchDuration(media.settings?.duration);
                        const uploadedDate = formatSearchDate(media.post_date);

                        return (
                            <button
                                type="button"
                                key={media.ID}
                                className={`fp-media-search__item ${isInPlaylist ? 'fp-media-search__item--disabled' : ''} ${isSelected ? 'fp-media-search__item--selected' : ''}`}
                                onClick={() => toggleSelection(media)}
                                disabled={isInPlaylist}
                                aria-pressed={!!isSelected}
                            >
                                <div className="fp-media-search__item-thumb">
                                    {media.settings?.posterSrc ? (
                                        <img src={media.settings.posterSrc} alt={media.post_title} />
                                    ) : (
                                        <div className="fp-media-search__no-thumb">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3ZM10 16V8L15 12L10 16Z" fill="#99A0AE"/>
                                            </svg>
                                        </div>
                                    )}
                                    {duration && (
                                        <span className="fp-media-search__item-duration">{duration}</span>
                                    )}
                                </div>
                                <span className="fp-media-search__item-title">
                                    {media.post_title || media.settings?.title}
                                </span>
                                <span className="fp-media-search__item-provider">
                                    <ProviderIcon provider={provider} size={14} />
                                    <span>{getProviderLabel(provider)}</span>
                                </span>
                                {isSelected && (
                                    <span className="fp-media-search__selected-badge">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M13.3337 4L6.00033 11.3333L2.66699 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </span>
                                )}
                                {isInPlaylist && (
                                    <span className="fp-media-search__in-list-badge">
                                        {__('Added', 'fluent-player')}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                    {results.length === 0 && !loading && (
                        <div className="fp-media-search__no-results">
                            {__('No media found', 'fluent-player')}
                        </div>
                    )}
                </div>
            )}

            {selectedItems.length > 0 && (
                <div className="fp-media-search__footer">
                    <span className="fp-media-search__selected-count">
                        {selectedItems.length} {__('selected', 'fluent-player')}
                    </span>
                    <Button
                        className="fp-button-dark"
                        onClick={handleAddSelected}
                    >
                        {__('Add to Playlist', 'fluent-player')}
                    </Button>
                </div>
            )}
        </div>
    );
};

/**
 * Single media item in the playlist
 */
const PlaylistMediaItem = memo(({
    media,
    index,
    onRemove,
    isActive,
    onSelect,
    isGridMode,
    showThumbnails,
    showThumbnailInfo,
    titlePosition,
    allowMediaManagement = true
}) => {
    const itemClasses = [
        'playlist-item',
        'fp-playlist-media-item',
        isActive ? 'active' : '',
        isGridMode ? 'fp-playlist-media-item--grid' : '',
        !showThumbnails && !isGridMode ? 'fp-playlist-media-item--no-thumb' : ''
    ].filter(Boolean).join(' ');

    const thumbClasses = [
        'item-thumbnail',
        'fp-playlist-item-thumb',
        isGridMode ? 'fp-playlist-item-thumb--grid thumbnail-grid-mode' : ''
    ].filter(Boolean).join(' ');

    const handleItemKeyDown = (e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(index);
        }
    };

    return (
        <li
            className={itemClasses}
            role="button"
            tabIndex={0}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => onSelect(index)}
            onKeyDown={handleItemKeyDown}
            data-id={media.ID}
        >
            {(showThumbnails || isGridMode) ? (
                <div className={thumbClasses}>
                    {media.settings?.posterSrc ? (
                        <img src={media.settings.posterSrc} alt={media.post_title || __('Video', 'fluent-player')} draggable="false" />
                    ) : (
                        <div className="fp-playlist-no-thumb">
                            <PlaylistPlayIconSVG fill="#c0c4cc" />
                        </div>
                    )}
                    {/* Play icon overlay */}
                    <div className="thumbnail-overlay">
                        <svg className="play-icon" width="18" height="18" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10.6667 6.6548C10.6667 5.91169 11.4857 5.46377 12.1257 5.8655L24.6392 13.7098C25.2173 14.0724 25.2173 14.9268 24.6392 15.2894L12.1257 23.1337C11.4857 23.5355 10.6667 23.0875 10.6667 22.3444V6.6548Z"/>
                        </svg>
                    </div>
                    {/* Title overlay - only for overlay position */}
                    {isGridMode && showThumbnailInfo && (titlePosition === 'overlay' || !titlePosition) && (
                        <div className="fp-playlist-thumb-info">
                            <span className="fp-playlist-thumb-title">
                                {media.post_title || media.settings?.title || `Media #${media.ID}`}
                            </span>
                        </div>
                    )}
                    {(showThumbnails || isGridMode) && (
                        <span className="fp-playlist-item-duration fp-duration-display item-duration fp-duration-badge">
                            {formatDuration(media.settings?.duration ?? 0)}
                        </span>
                    )}
                    {isGridMode && allowMediaManagement && (
                        <div className="fp-playlist-grid-actions">
                            <a
                                href={`post.php?post=${media.ID}&action=edit`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="fp-playlist-grid-action-btn"
                                onClick={(e) => e.stopPropagation()}
                                aria-label={__('Edit video', 'fluent-player')}
                            >
                                <PlaylistEditIconSVG size={16} />
                            </a>
                            <button
                                type="button"
                                className="fp-playlist-grid-action-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove();
                                }}
                                aria-label={__('Remove', 'fluent-player')}
                            >
                                <PlaylistTrashIconSVG size={16} />
                            </button>
                            <div className="fp-playlist-action-drag fp-playlist-grid-action-btn">
                                <PlaylistDragHandleSVG size={16} />
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="item-play-icon">
                    <div className="play-icon">
                        <svg width="26" height="20" viewBox="0 0 24 24" fill="none"
                             xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 5v14l11-7z" fill="currentColor"></path>
                        </svg>
                    </div>
                </div>
            )}
            {/* Title below thumbnail - only for below position in thumbnail grid mode */ }
            { isGridMode && showThumbnailInfo && titlePosition === 'below' && (
                <div className="fp-playlist-thumb-title-below">
                    { media.post_title || media.settings?.title || `Media #${ media.ID }` }
                </div>
            ) }
            { !isGridMode && (
                <>
                    <div className="playlist-item-content fp-playlist-item-content">
                        <span className="item-title fp-playlist-item-title">
                            {media.post_title || media.settings?.title || `Media #${media.ID}`}
                        </span>
                        <span className="fp-playlist-item-duration fp-duration-display item-duration">
                            {formatDuration(media.settings?.duration ?? 0)}
                        </span>
                    </div>
                    {allowMediaManagement && (
                        <div className="fp-playlist-grid-actions">
                            <a
                                href={`post.php?post=${media.ID}&action=edit`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="fp-playlist-grid-action-btn"
                                onClick={(e) => e.stopPropagation()}
                                aria-label={__('Edit video', 'fluent-player')}
                            >
                                <PlaylistEditIconSVG size={16} />
                            </a>
                            <button
                                type="button"
                                className="fp-playlist-grid-action-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove();
                                }}
                                aria-label={__('Remove', 'fluent-player')}
                            >
                                <PlaylistTrashIconSVG size={16} />
                            </button>
                            <div
                                className="fp-playlist-action-drag fp-playlist-grid-action-btn"
                                aria-label={ __('Drag to reorder', 'fluent-player') }
                            >
                                <PlaylistDragHandleSVG size={16} />
                            </div>
                        </div>
                    )}
                </>
            )}
        </li>
    );
});

/**
 * Format duration in seconds to HH:MM:SS
 */
const formatDuration = (seconds) => {
    if (seconds == null || isNaN(seconds) || seconds < 0) return '0:00:00';
    const h = Math.floor(Number(seconds) / 3600);
    const m = Math.floor((Number(seconds) % 3600) / 60);
    const s = Math.floor(Number(seconds) % 60);
    const pad = (n) => String(n).padStart(2, '0');
    return `${h}:${pad(m)}:${pad(s)}`;
};

/**
 * Main PlaylistEditor component
 */
const PlaylistEditor = ({
    playlistData,
    medias,
    updatePlaylistData,
    addMedia,
    removeMedia,
    reorderMedia,
    savePlaylist,
    isSaving,
    allowMediaManagement = true,
    isTagMediasLoading = false,
    tagMediasError = '',
    onRetryTagMedias = null
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAddMedia, setShowAddMedia] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const sortableRef = useRef(null);
    const gridSortableRef = useRef(null);
    const currentIndexRef = useRef(currentIndex);

    const layoutType = playlistData?.settings?.layout?.type || 'standard';
    const layoutPosition = playlistData?.settings?.layout?.position || 'right';

    const currentMedia = medias[currentIndex] || null;
    const existingMediaIds = useMemo(() => medias.map(m => m.ID), [medias]);

    useEffect(() => {
        currentIndexRef.current = currentIndex;
    }, [currentIndex]);

    useEffect(() => {
        if (currentIndex >= medias.length) {
            setCurrentIndex(0);
        }
    }, [medias.length, currentIndex]);

    const standardSortableOptions = useCallback(() => ({
        handle: '.fp-playlist-action-drag',
        axis: 'y',
        cursor: 'grabbing',
        placeholder: 'sortable-placeholder',
        revert: 100,
        start: function(e, ui) {
            ui.item.addClass('sortable-dragging');
            ui.placeholder.height(ui.item.outerHeight());
        },
        stop: function(e, ui) {
            ui.item.removeClass('sortable-dragging');
        },
        update: function(e, ui) {
            const item = ui.item[0];
            const newIndex = Array.from(item.parentNode.children).indexOf(item);
            const oldIndex = parseInt(ui.item.data('old-index'), 10);
            const currIdx = currentIndexRef.current;
            if (oldIndex !== newIndex) {
                reorderMedia(oldIndex, newIndex);
                if (currIdx === oldIndex) {
                    setCurrentIndex(newIndex);
                } else if (oldIndex < currIdx && newIndex >= currIdx) {
                    setCurrentIndex(prev => prev - 1);
                } else if (oldIndex > currIdx && newIndex <= currIdx) {
                    setCurrentIndex(prev => prev + 1);
                }
            }
        }
    }), [reorderMedia]);

    useEffect(() => {
        if (layoutType !== 'standard' && layoutType !== 'learning') return;
        if (!sortableRef.current || !window.jQuery) return;

        const $list = window.jQuery(sortableRef.current);
        if ($list.data('ui-sortable')) {
            $list.sortable('refresh');
            $list.find('> li').each(function(index) {
                window.jQuery(this).data('old-index', index);
            });
            return;
        }
        if (medias.length === 0) return;

        $list.sortable(standardSortableOptions());
        $list.find('> li').each(function(index) {
            window.jQuery(this).data('old-index', index);
        });

        return () => {
            if (sortableRef.current && window.jQuery) {
                const $list = window.jQuery(sortableRef.current);
                if ($list.data('ui-sortable')) {
                    $list.sortable('destroy');
                }
            }
        };
    }, [medias.length, layoutType, standardSortableOptions]);

    useEffect(() => {
        if (layoutType !== 'grid') return;
        if (!gridSortableRef.current || !window.jQuery) return;

        const runGridSortable = () => {
            const $grid = window.jQuery(gridSortableRef.current);
            if ($grid.data('ui-sortable')) {
                $grid.sortable('refresh');
                $grid.find('> .fp-grid-item').each(function(index) {
                    window.jQuery(this).data('old-index', index);
                });
                return;
            }
            if (medias.length === 0) return;

            $grid.sortable({
                items: '> .fp-grid-item',
                handle: '.fp-grid-item-drag',
                tolerance: 'pointer',
                placeholder: 'fp-grid-item-placeholder',
                start: function(e, ui) {
                    ui.item.addClass('fp-grid-item--dragging');
                    ui.placeholder.css({
                        width: ui.item.outerWidth(),
                        height: ui.item.outerHeight()
                    });
                },
                stop: function(e, ui) {
                    ui.item.removeClass('fp-grid-item--dragging');
                },
                update: function(e, ui) {
                    const item = ui.item[0];
                    const newIndex = Array.from(item.parentNode.children).indexOf(item);
                    const oldIndex = parseInt(ui.item.data('old-index'), 10);
                    const currIdx = currentIndexRef.current;
                    if (oldIndex !== newIndex) {
                        reorderMedia(oldIndex, newIndex);
                        if (currIdx === oldIndex) {
                            setCurrentIndex(newIndex);
                        } else if (oldIndex < currIdx && newIndex >= currIdx) {
                            setCurrentIndex(prev => prev - 1);
                        } else if (oldIndex > currIdx && newIndex <= currIdx) {
                            setCurrentIndex(prev => prev + 1);
                        }
                    }
                }
            });
            $grid.find('> .fp-grid-item').each(function(index) {
                window.jQuery(this).data('old-index', index);
            });
        };

        const timer = setTimeout(runGridSortable, 100);
        return () => {
            clearTimeout(timer);
            if (gridSortableRef.current && window.jQuery) {
                const $grid = window.jQuery(gridSortableRef.current);
                if ($grid.data('ui-sortable')) {
                    $grid.sortable('destroy');
                }
            }
        };
    }, [medias.length, layoutType]);

    const handleRemove = (mediaId, index) => {
        removeMedia(mediaId);
        if (currentIndex >= medias.length - 1 && currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const isAllAudio = medias.length > 0 && medias.every(m => m.settings?.viewType === 'audio');

    const getContainerClass = () => {
        return `fluent-playlist playlist-${layoutType}${isAllAudio ? ' fp-playlist-audio' : ''}`;
    };

    const getAppearanceStyle = () => {
        const appearance = playlistData?.settings?.appearance || {};
        const typography = playlistData?.settings?.typography || {};
        const style = {};
        style['--fp-playlist-background-color'] = appearance.backgroundColor || '#ffffff';
        style['--fp-playlist-text-color'] = appearance.textColor || '#333333';

        const fallbackBrand = appearance.primaryColor || '#DD1F13';
        const mode = appearance.brandColor?.mode || 'auto';
        let brandColor = fallbackBrand;
        if (mode === 'custom') {
            brandColor = appearance.brandColor?.value || fallbackBrand;
        } else if (mode === 'auto') {
            const sourceId = parseInt(playlistData?.settings?.preset_source_media_id, 10) || 0;
            const sourceMedia = sourceId
                ? medias.find((m) => parseInt(m.ID, 10) === sourceId)
                : medias[0];
            const sourceSettings = sourceMedia?.settings;
            if (sourceSettings?.useCustomBranding) {
                brandColor = sourceSettings.brandingColor || '#DD1F13';
            }
        }
        style['--fp-playlist-brand-color'] = brandColor;
        style['--media-brand'] = brandColor;
        style['--fp-playlist-border-color'] = appearance.borderColor || '#e1e5e9';
        const borderWidth = appearance.borderWidth;
        style['--fp-playlist-border-width'] = borderWidth?.value != null
            ? `${borderWidth.value}${borderWidth.unit || 'px'}`
            : '0';
        const borderRadius = appearance.borderRadius;
        if (borderRadius?.value != null) {
            style['--fp-playlist-border-radius'] = `${borderRadius.value}${borderRadius.unit || 'px'}`;
        }
        const boxShadow = appearance.boxShadow;
        if (boxShadow?.enabled) {
            const parts = [
                boxShadow.position === 'inset' ? 'inset' : '',
                `${boxShadow.horizontal ?? 0}px`,
                `${boxShadow.vertical ?? 2}px`,
                `${boxShadow.blur ?? 8}px`,
                `${boxShadow.spread ?? 0}px`,
                boxShadow.color || '#000000'
            ].filter(Boolean);
            style['--fp-playlist-box-shadow'] = parts.join(' ');
        } else {
            style['--fp-playlist-box-shadow'] = 'none';
        }
        if (typography?.enabled && typography?.fontSize?.value != null) {
            style['--fp-playlist-font-size'] = `${typography.fontSize.value}${typography.fontSize?.unit || 'px'}`;
        } else {
            style['--fp-playlist-font-size'] = '14px';
        }
        if (typography?.enabled && typography?.fontWeight != null) {
            style['--fp-playlist-font-weight'] = String(typography.fontWeight);
        } else {
            style['--fp-playlist-font-weight'] = '400';
        }
        if (typography?.enabled && typography?.lineHeight != null) {
            style['--fp-playlist-line-height'] = String(typography.lineHeight);
        } else {
            style['--fp-playlist-line-height'] = '1.5';
        }
        const resolvedRatio = resolveAspectRatioValue(playlistData?.settings?.layout?.thumbnailRatio);
        const cssRatio = toCssAspectRatio(resolvedRatio);
        if (cssRatio && cssRatio !== '16 / 9') {
            style['--fp-playlist-thumbnail-ratio'] = cssRatio;
        }
        return style;
    };

    // Get position class for inner container (matches frontend)
    const getPositionClass = () => {
        if (layoutType === 'standard') {
            return `playlist-${layoutPosition}`;
        }
        return '';
    };

    // Render player preview
    const renderPlayerPreview = () => {
        if (!currentMedia) {
            if (!allowMediaManagement && isTagMediasLoading) {
                return (
                    <div className="fp-playlist-empty-state">
                        <div className="fp-playlist-empty-icon">
                            <Spinner />
                        </div>
                        <div className="fp-playlist-empty-content">
                            <h3 className="fp-playlist-empty-title">{__('Loading Media', 'fluent-player')}</h3>
                            <p className="fp-playlist-empty-desc">
                                {__('Loading media for selected tags', 'fluent-player')}
                            </p>
                        </div>
                    </div>
                );
            }

            if (!allowMediaManagement && tagMediasError) {
                return (
                    <div className="fp-playlist-empty-state">
                        <div className="fp-playlist-empty-icon">
                            <NoMediaIconSVG />
                        </div>
                        <div className="fp-playlist-empty-content">
                            <h3 className="fp-playlist-empty-title">{__('Could Not Load Media', 'fluent-player')}</h3>
                            <p className="fp-playlist-empty-desc">{tagMediasError}</p>
                        </div>
                        {typeof onRetryTagMedias === 'function' && (
                            <button
                                type="button"
                                className="fp-button-dark"
                                onClick={onRetryTagMedias}
                            >
                                <span>{__('Retry', 'fluent-player')}</span>
                            </button>
                        )}
                    </div>
                );
            }

            return (
                <div className="fp-playlist-empty-state">
                    <div className="fp-playlist-empty-icon">
                        <NoMediaIconSVG />
                    </div>
                    <div className="fp-playlist-empty-content">
                        <h3 className="fp-playlist-empty-title">{__('No Media Added', 'fluent-player')}</h3>
                        <p className="fp-playlist-empty-desc">
                            {allowMediaManagement
                                ? __('Add videos to your playlist', 'fluent-player')
                                : __('No media found for selected tags', 'fluent-player')
                            }
                        </p>
                    </div>
                    {allowMediaManagement && (
                        <button
                            type="button"
                            className="fp-button-dark"
                            onClick={() => setShowAddMedia(true)}
                        >
                            <PlaylistAddIconSVG />
                            <span>{__('Add Media', 'fluent-player')}</span>
                        </button>
                    )}
                </div>
            );
        }

        if (isAllAudio) {
            const posterSrc = currentMedia.settings?.posterSrc;
            const title = currentMedia.post_title || currentMedia.settings?.title || '';
            return (
                <div className="fp-playlist-audio-preview" style={posterSrc ? { backgroundImage: `url("${posterSrc}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                    <div className="fp-playlist-audio-preview-overlay">
                        {posterSrc ? (
                            <div className="fp-playlist-audio-poster">
                                <img src={posterSrc} alt={title} />
                            </div>
                        ) : (
                            <div className="fp-playlist-audio-poster fp-playlist-audio-poster-default">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
                                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="currentColor"/>
                                </svg>
                            </div>
                        )}
                        <div className="fp-playlist-audio-info">
                            <span className="fp-playlist-audio-title">{title}</span>
                            <div className="fp-playlist-audio-controls-preview">
                                <div className="fp-playlist-audio-play-btn">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M8 5v14l11-7z" fill="currentColor"/>
                                    </svg>
                                </div>
                                <div className="fp-playlist-audio-slider-preview">
                                    <div className="fp-playlist-audio-slider-track"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="fp-playlist-player-preview">
                {currentMedia.settings?.posterSrc ? (
                    <img
                        src={currentMedia.settings.posterSrc}
                        alt={currentMedia.post_title}
                        className="fp-playlist-preview-poster"
                    />
                ) : (
                    <div className="fp-playlist-preview-placeholder">
                        <PlaylistPlayIconSVG size={64} fill="#555" />
                    </div>
                )}
                <div className="fp-playlist-play-overlay">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 5v14l11-7z" fill="currentColor"/>
                    </svg>
                </div>
            </div>
        );
    };

    // Render media list - match frontend structure
    const renderMediaList = () => {
        const headerPosition = playlistData?.settings?.layout?.headerPosition || 'top';
        const showHeader = playlistData?.settings?.layout?.showHeader !== false;
        const showThumbnails = playlistData?.settings?.behavior?.showThumbnails === true;
        const thumbnailGridLayout = showThumbnails && (playlistData?.settings?.behavior?.thumbnailGridLayout || false);
        const showThumbnailInfo = playlistData?.settings?.behavior?.showThumbnailInfo !== false;
        const titlePosition = playlistData?.settings?.behavior?.titlePosition || 'overlay';

        return (
            <>
                {/* Header at top if position is 'top' */}
                {headerPosition === 'top' && (
                    <div className={`playlist-header fp-playlist-header fp-playlist-header-${headerPosition} ${!showHeader ? 'fp-playlist-header--hidden' : ''}`}>
                        <h4 className="fp-playlist-header-title">{playlistData?.settings?.title || playlistData?.post_title || __('Playlist', 'fluent-player')}</h4>
                        <span className="playlist-count fp-playlist-header-count" aria-live="polite" aria-atomic="true">
                            <bdi>{currentIndex + 1} / {medias.length}</bdi> {medias.length === 1 ? __('video', 'fluent-player') : __('videos', 'fluent-player')}
                        </span>
                    </div>
                )}

                <ul className={`playlist-items ${thumbnailGridLayout ? `playlist-thumbnail-grid playlist-thumbnail-grid--${layoutPosition}` : ''} ${!showHeader ? 'playlist-items--no-header' : ''}`} role="list" ref={sortableRef}>
                    {medias.map((media, index) => (
                        <PlaylistMediaItem
                            key={media.ID}
                            media={media}
                            index={index}
                            onRemove={() => handleRemove(media.ID, index)}
                            isActive={index === currentIndex}
                            onSelect={setCurrentIndex}
                            isGridMode={thumbnailGridLayout}
                            showThumbnails={showThumbnails}
                            showThumbnailInfo={showThumbnailInfo}
                            titlePosition={titlePosition}
                            allowMediaManagement={allowMediaManagement}
                        />
                    ))}
                </ul>

                {/* Header at bottom if position is 'bottom' */}
                {headerPosition === 'bottom' && (
                    <div className={`playlist-header fp-playlist-header fp-playlist-header-${headerPosition} ${!showHeader ? 'fp-playlist-header--hidden' : ''}`}>
                        <h4 className="fp-playlist-header-title">{playlistData?.settings?.title || playlistData?.post_title || __('Playlist', 'fluent-player')}</h4>
                        <span className="playlist-count fp-playlist-header-count" aria-live="polite" aria-atomic="true">
                            <bdi>{currentIndex + 1} / {medias.length}</bdi> {medias.length === 1 ? __('video', 'fluent-player') : __('videos', 'fluent-player')}
                        </span>
                    </div>
                )}

                {/* Add Media section - only in block editor */}
                {allowMediaManagement && (
                    <div className="fp-playlist-add-section">
                        <button
                            type="button"
                            className="fp-button-dark"
                            onClick={() => setShowAddMedia(true)}
                        >
                            <PlaylistAddIconSVG />
                            <span>{__('Add Media', 'fluent-player')}</span>
                        </button>
                    </div>
                )}
            </>
        );
    };

    // Render add media modal - shared across all layouts
    const renderAddMediaModal = () => {
        if (!allowMediaManagement || !showAddMedia) return null;
        return (
            <Modal
                title={__('Add Media to Playlist', 'fluent-player')}
                onRequestClose={() => setShowAddMedia(false)}
                className="fluent-playlist-media-modal"
            >
                <MediaSearch
                    onAdd={addMedia}
                    existingMediaIds={existingMediaIds}
                    onClose={() => setShowAddMedia(false)}
                />
            </Modal>
        );
    };

    // Grid layout preview
    if (layoutType === 'grid') {
        const showPlayerOnTop = playlistData?.settings?.grid?.showPlayerOnTop !== false;
        const displayMode = playlistData?.settings?.grid?.displayMode || 'inline';
        const shouldShowPlayer = displayMode === 'inline' && showPlayerOnTop;
        const columns = playlistData?.settings?.grid?.columns || 3;
        const itemsPerPage = playlistData?.settings?.grid?.itemsPerPage || 12;
        const totalPages = Math.ceil(medias.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const visibleMedias = medias.slice(startIndex, endIndex);
        const gridShowThumbnailInfo = playlistData?.settings?.behavior?.showThumbnailInfo !== false;
        const gridTitlePosition = playlistData?.settings?.behavior?.titlePosition || 'below';

        const gridStyle = {
            gridTemplateColumns: `repeat(${columns}, 1fr)`
        };

        const handlePrev = () => {
            setCurrentIndex(prev => prev > 0 ? prev - 1 : medias.length - 1);
        };

        const handleNext = () => {
            setCurrentIndex(prev => prev < medias.length - 1 ? prev + 1 : 0);
        };

        const handlePrevPage = () => {
            if (currentPage > 1) {
                setCurrentPage(prev => prev - 1);
            }
        };

        const handleNextPage = () => {
            if (currentPage < totalPages) {
                setCurrentPage(prev => prev + 1);
            }
        };

        if (medias.length === 0) {
            return (
                <div className={getContainerClass()}>
                    {renderPlayerPreview()}
                    {renderAddMediaModal()}
                </div>
            );
        }

        return (
            <div className={getContainerClass()}>
                {shouldShowPlayer && renderPlayerPreview()}
                <div className="fp-grid-container">
                    <div className="fp-grid-header">
                        <h4 className="fp-grid-header-title">
                            {playlistData?.settings?.title || playlistData?.post_title || __('Auto Draft', 'fluent-player')}
                        </h4>
                        <div className="fp-grid-header-right">
                            <span className="fp-grid-header-count">
                                {medias.length} {medias.length === 1 ? __('Video', 'fluent-player') : __('Videos', 'fluent-player')}
                            </span>
                        </div>
                    </div>

                    <div className="fp-grid-content" style={gridStyle} ref={gridSortableRef}>
                        {visibleMedias.map((media, index) => (
                            <div
                                key={media.ID}
                                className={`fp-grid-item ${index === currentIndex ? 'fp-grid-item--active' : ''}`}
                                onClick={() => setCurrentIndex(index)}
                            >
                                <div className="fp-grid-item-thumb">
                                    {media.settings?.posterSrc ? (
                                        <img src={media.settings.posterSrc} alt={media.post_title || __('Video', 'fluent-player')} />
                                    ) : (
                                        <div className="fp-grid-item-no-thumb">
                                            <PlaylistPlayIconSVG fill="#99A0AE" />
                                        </div>
                                    )}
                                    {/* Title overlay for grid layout */}
                                    {gridShowThumbnailInfo && gridTitlePosition === 'overlay' && (
                                        <div className="fp-grid-item-title-overlay">
                                            {media.post_title || media.settings?.title || `Media #${media.ID}`}
                                        </div>
                                    )}
                                    {allowMediaManagement && (
                                        <div className="fp-grid-item-actions">
                                            <div
                                                className="fp-grid-item-action fp-grid-item-drag"
                                                aria-label={__('Drag', 'fluent-player')}
                                            >
                                                <PlaylistDragHandleSVG />
                                            </div>
                                            <button
                                                type="button"
                                                className="fp-grid-item-action"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemove(media.ID, index);
                                                }}
                                                aria-label={__('Remove', 'fluent-player')}
                                            >
                                                <PlaylistTrashIconSVG />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {/* Title below thumbnail for grid layout */}
                                {gridShowThumbnailInfo && gridTitlePosition === 'below' && (
                                    <div className="fp-grid-item-title">
                                        {media.post_title || media.settings?.title || `Media #${media.ID}`}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="fp-grid-footer">
                        {allowMediaManagement && (
                            <button
                                type="button"
                                className="fp-button-dark"
                                onClick={() => setShowAddMedia(true)}
                            >
                                <PlaylistAddIconSVG />
                                <span>{__('Add Media', 'fluent-player')}</span>
                            </button>
                        )}

                        {totalPages > 1 && (
                            <div className="fp-grid-pagination">
                                <button
                                    type="button"
                                    className={`fp-grid-pagination-btn fp-grid-pagination-prev ${currentPage === 1 ? 'disabled' : ''}`}
                                    onClick={handlePrevPage}
                                    disabled={currentPage === 1}
                                >
                                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    <span>{__('Previous', 'fluent-player')}</span>
                                </button>
                                <span className="fp-grid-pagination-info">
                                    <strong>{currentPage}</strong> {__('of', 'fluent-player')} <strong>{totalPages}</strong>
                                </span>
                                <button
                                    type="button"
                                    className={`fp-grid-pagination-btn fp-grid-pagination-next ${currentPage === totalPages ? 'disabled' : ''}`}
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages}
                                >
                                    <span>{__('Next', 'fluent-player')}</span>
                                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {renderAddMediaModal()}
                {displayMode === 'inline' && !showPlayerOnTop && renderPlayerPreview()}
            </div>
        );
    }

    // Standard/Learning layout - match frontend structure
    return (
        <div className={getContainerClass()}>
            <div className={`fluent-playlist-container ${getPositionClass()}${isAllAudio ? ' fp-playlist-audio' : ''}`}>
                <div className={`playlist-player-container${isAllAudio ? ' fp-audio' : ''}`}>
                    {renderPlayerPreview()}
                </div>
                {medias.length > 0 && (
                    <div className="playlist-sidebar">
                        {renderMediaList()}
                    </div>
                )}
            </div>
            {renderAddMediaModal()}
        </div>
    );
};

export default PlaylistEditor;
