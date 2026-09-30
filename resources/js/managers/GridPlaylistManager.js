import { getBestVideoSrc, privacyEnhanceYouTubePoster } from '../utils/videoSrc';
import { formatDuration as formatDurationUtil } from '../utils/formatDuration';

/**
 * Grid Playlist Manager
 * Handles grid layout, pagination, and all playback modes.
 * This version intelligently detects the play mode based on the DOM structure,
 * bypassing any faulty settings from the backend.
 */
class GridPlaylistManager {
    constructor(playlistInstance, options = {}) {
        this.playlist = playlistInstance;
        this.options = { ...options };
        this.container = this.playlist.container;

        // DOM Elements
        this.gridItemsContainer = this.container.querySelector('.grid-items');
        this.paginationContainer = this.container.querySelector('.grid-pagination');
        this.noResultsContainer = this.container.querySelector('.fplayer-no-results');
        this.searchWrap = this.container.querySelector('.fp-grid-search');
        this.searchInput = this.container.querySelector('.fp-grid-search-input');
        this.searchClearBtn = this.container.querySelector('.fp-grid-search-clear');
        this.searchResetBtn = this.container.querySelector('.fp-grid-search-reset');
        this.headerCount = this.container.querySelector('.fp-grid-header-count');
        this.modal = this.container.querySelector('#grid-modal-overlay');
        this.modalPlayer = this.modal?.querySelector('#grid-modal-player');
        this.modalCloseBtn = this.modal?.querySelector('.grid-modal-close');
        this.modalNextBtn = this.modal?.querySelector('.grid-modal-nav.next');
        this.modalPrevBtn = this.modal?.querySelector('.grid-modal-nav.prev');

        // State
        this.currentPage = 1;
        this.filteredItems = [...this.playlist.medias];
        this.currentModalIndex = 0;
        this.isLoading = false;
        this.totalItems = this.playlist.medias.length;
        this.paginationData = null;
        this.searchQuery = '';
        this._searchTimer = null;
        this._countOriginal = this.headerCount ? this.headerCount.textContent : '';

        this.init();
    }

    init() {
        this.renderItems();
        this.setupEventListeners();
        this.updatePagination();

        // Server renders the search box hidden; only a JS layer that can drive it reveals it
        if (this.searchWrap && this.searchInput) {
            this.searchWrap.hidden = false;
        }

        // Mark grid as loaded to prevent FOUC
        if (this.gridItemsContainer) {
            this.gridItemsContainer.classList.add('loaded');
        }
    }

    setupEventListeners() {
        // Track all listeners for cleanup
        this._listeners = [];

        const addTrackedListener = (el, event, handler, options) => {
            if (!el) return;
            el.addEventListener(event, handler, options);
            this._listeners.push({ el, event, handler, options });
        };

        // Event Delegation for grid items for efficiency and robustness
        this._gridClickHandler = (e) => {
            const clickedItem = e.target.closest('.grid-item');
            if (clickedItem) {
                this.handleItemClick(clickedItem);
            }
        };
        addTrackedListener(this.gridItemsContainer, 'click', this._gridClickHandler);

        // Keyboard support for grid items
        this.gridItemsContainer?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const focusedItem = e.target.closest('.grid-item');
                if (focusedItem) {
                    e.preventDefault();
                    this.handleItemClick(focusedItem);
                }
            }
        });

        // Listen for playlist media changes to update active state
        if (this.playlist && this.playlist.player) {
            this._loadedMetadataHandler = () => {
                if (this.playlist.currentMediaIndex !== undefined) {
                    this.updateActiveItem(this.playlist.currentMediaIndex);
                }
            };
            addTrackedListener(this.playlist.player, 'loadedmetadata', this._loadedMetadataHandler);
        }

        // Pagination
        this._paginationClickHandler = (e) => {
            const nextBtn = e.target.closest('.next-btn');
            const prevBtn = e.target.closest('.prev-btn');
            if (nextBtn && !nextBtn.disabled) {
                e.preventDefault();
                e.stopPropagation();
                this.goToPage(this.currentPage + 1);
            }
            if (prevBtn && !prevBtn.disabled) {
                e.preventDefault();
                e.stopPropagation();
                this.goToPage(this.currentPage - 1);
            }
        };
        addTrackedListener(this.paginationContainer, 'click', this._paginationClickHandler);

        this._searchInputHandler = (e) => {
            clearTimeout(this._searchTimer);
            const value = e.target.value;
            this._searchTimer = setTimeout(() => this.applySearch(value), 150);
        };
        this._searchKeydownHandler = (e) => {
            if (e.key === 'Escape' && this.searchInput.value !== '') {
                e.stopPropagation();
                this.clearSearch();
            }
        };
        this._searchClearHandler = () => {
            this.clearSearch();
            if (this.searchInput) this.searchInput.focus();
        };
        addTrackedListener(this.searchInput, 'input', this._searchInputHandler);
        addTrackedListener(this.searchInput, 'keydown', this._searchKeydownHandler);
        addTrackedListener(this.searchClearBtn, 'click', this._searchClearHandler);
        addTrackedListener(this.searchResetBtn, 'click', this._searchClearHandler);

        // Modal Controls
        if (this.modal) {
            this._modalCloseHandler = () => this.closeModal();
            this._modalNextHandler = () => this.navigateModal(1);
            this._modalPrevHandler = () => this.navigateModal(-1);
            this._modalBackdropHandler = (e) => {
                if (e.target === this.modal) this.closeModal();
            };
            addTrackedListener(this.modalCloseBtn, 'click', this._modalCloseHandler);
            addTrackedListener(this.modalNextBtn, 'click', this._modalNextHandler);
            addTrackedListener(this.modalPrevBtn, 'click', this._modalPrevHandler);
            addTrackedListener(this.modal, 'click', this._modalBackdropHandler);
            this.setupModalNavAutoHide();
        }
    }

    setupModalKeyboardNav() {
        // Remove existing listener if any
        if (this.modalKeyboardHandler) {
            document.removeEventListener('keydown', this.modalKeyboardHandler);
        }

        // Create new handler
        this.modalKeyboardHandler = (e) => {
            if (!this.modal || !this.modal.classList.contains('visible')) return;

            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    this.closeModal();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (this.modalPrevBtn && !this.modalPrevBtn.disabled) {
                        this.navigateModal(-1);
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (this.modalNextBtn && !this.modalNextBtn.disabled) {
                        this.navigateModal(1);
                    }
                    break;
                case 'Tab': {
                    const focusable = Array.from(
                        this.modal.querySelectorAll('button:not([disabled]), [tabindex="0"]:not([disabled]), input, select, textarea, a[href]')
                    ).filter(el => {
                        const s = getComputedStyle(el);
                        return s.display !== 'none' && s.visibility !== 'hidden';
                    });
                    if (focusable.length === 0) return;
                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];
                    if (e.shiftKey) {
                        if (document.activeElement === first) {
                            e.preventDefault();
                            last.focus();
                        }
                    } else {
                        if (document.activeElement === last) {
                            e.preventDefault();
                            first.focus();
                        }
                    }
                    break;
                }
            }
        };

        document.addEventListener('keydown', this.modalKeyboardHandler);
    }

    setupModalNavAutoHide() {
        if (!this.modal || !this.modalPlayer) return;

        const container = this.modal.querySelector('.grid-modal-player');
        if (!container) return;

        const buttons = [
            this.modalNextBtn,
            this.modalPrevBtn,
            this.modalCloseBtn
        ].filter(Boolean);

        let hideTimeout = null;

        function showButtons() {
            clearTimeout(hideTimeout);
            buttons.forEach(btn => btn.classList.add('visible'));
        }

        function hideButtonsWithDelay() {
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                buttons.forEach(btn => btn.classList.remove('visible'));
            }, 400);
        }

        const addTrackedListener = (el, event, handler, options) => {
            el.addEventListener(event, handler, options);
            this._listeners.push({ el, event, handler, options });
        };

        addTrackedListener(container, 'mouseenter', showButtons);
        addTrackedListener(container, 'mouseleave', hideButtonsWithDelay);
        addTrackedListener(container, 'touchstart', showButtons, { passive: true });
        addTrackedListener(container, 'touchend', hideButtonsWithDelay);

        buttons.forEach(btn => {
            addTrackedListener(btn, 'mouseenter', showButtons);
            addTrackedListener(btn, 'focus', showButtons);
            addTrackedListener(btn, 'blur', hideButtonsWithDelay);
        });
    }


    renderItems() {
        if (!this.gridItemsContainer) return;
        this.gridItemsContainer.innerHTML = '';
        const itemsToRender = this.getItemsForCurrentPage();
        if (itemsToRender.length === 0) {
            this.updateNoResults(true);
            return;
        }
        itemsToRender.forEach(media => {
            const mediaIndex = this.playlist.medias.findIndex(m => m.ID === media.ID);
            const itemEl = this.createGridItem(media, mediaIndex);
            this.gridItemsContainer.appendChild(itemEl);
        });
        this.updateNoResults(false);
        // Update active state after rendering
        if (this.playlist && this.playlist.currentMediaIndex !== undefined) {
            this.updateActiveItem(this.playlist.currentMediaIndex);
        }
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    escapeAttr(str) {
        const s = String(str == null ? '' : str);
        return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    createGridItem(media, index) {
        const behavior = this.playlist?.playlist?.settings?.behavior || {};
        const showThumbnailInfo = behavior.showThumbnailInfo;
        const titlePosition = behavior.titlePosition || 'below';
        const duration = (media.settings && media.settings.duration != null && media.settings.duration !== '') ? this.formatDuration(media.settings.duration) : '';
        const safeTitle = this.escapeHtml(media.post_title || '');

        const item = document.createElement('div');
        item.className = `grid-item fp-grid-item fp-grid-item-${titlePosition}`;
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        item.dataset.mediaIndex = index;
        item.dataset.flpRef = media.deep_link_ref || media.deepLinkRef || `fpm_${media.ID}`;
        item.dataset.playMode = this.options?.displayMode || 'inline';
        item.dataset.modalLayout = this.options?.modalLayout || 'centered';
        if (safeTitle) {
            item.setAttribute('aria-label', safeTitle);
        }
        const overlayTitleHtml = (showThumbnailInfo && titlePosition === 'overlay')
            ? `<div class="fp-grid-item-title-overlay">${safeTitle}</div>`
            : '';

        const belowTitleHtml = (showThumbnailInfo && titlePosition === 'below')
            ? `<div class="fp-grid-item-title">${safeTitle}</div>`
            : '';

        const posterSrc = privacyEnhanceYouTubePoster(media.settings?.posterSrc || '');
        const safePosterSrc = this.escapeAttr(posterSrc);
        const posterImgHtml = posterSrc
            ? `<img src="${safePosterSrc}" alt="${this.escapeAttr(media.post_title || '')}" loading="lazy">`
            : '';
        item.innerHTML = `
            <div class="grid-item-thumbnail">
                ${posterImgHtml}
                <div class="grid-item-overlay">
                    <div class="play-button"><media-icon type="play" aria-hidden="true"></media-icon></div>
                    <div class="duration-badge fp-duration-display" data-duration="${media.settings?.duration != null ? media.settings.duration : ''}">${duration}</div>
                </div>
                ${overlayTitleHtml}
            </div>
            ${belowTitleHtml}
        `;
        return item;
    }

    // --- Playback Logic ---
    handleItemClick(item) {
        const mediaIndex = parseInt(item.dataset.mediaIndex, 10);
        if (isNaN(mediaIndex)) return;

        // Use data attribute from item (set by PHP) or fall back to options
        const playMode = item.dataset.playMode || this.options?.displayMode || 'inline';
        const modalLayout = item.dataset.modalLayout || this.options?.modalLayout || 'centered';

        // displayMode determines WHERE video plays (inline vs modal)
        // modalLayout determines HOW modal appears (centered vs fullscreen)
        if (playMode !== 'inline') {
            this.openModal(mediaIndex, modalLayout);
        } else {
            // inline mode
            this.playInline(mediaIndex);
        }
    }

    playInline(index) {
        const topPlayer = this.container.querySelector('.grid-player-inline media-player');
        if (!topPlayer) {
            // If no top player, fall back to modal playback
            console.warn('Grid inline mode: No top player found. Falling back to modal playback.');
            this.openModal(index, 'modal');
            return;
        }
        this.playlist.loadMedia(index, true);
        topPlayer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.updateActiveItem(index);
    }

    updateActiveItem(index) {
        // Remove active class from all grid items
        this.container.querySelectorAll('.grid-item').forEach(item => {
            item.classList.remove('active');
            item.removeAttribute('aria-current');
        });

        // Add active class to the current item
        const currentItem = this.container.querySelector(`.grid-item[data-media-index="${index}"]`);
        if (currentItem) {
            currentItem.classList.add('active');
            currentItem.setAttribute('aria-current', 'true');
        }
    }

    getBestVideoSrc(settings) {
        return getBestVideoSrc(settings);
    }

    openModal(index, mode, autoplay = true) {
        if (!this.modal || !this.modalPlayer) return;
        this.currentModalIndex = index;

        // Save focus to restore when modal closes
        this.previousFocusElement = document.activeElement;

        this.updateModalContent(this.playlist.medias[index]);
        this.updateModalNav();
        this.modal.classList.toggle('grid-fullscreen', mode === 'fullscreen');
        this.modal.classList.add('visible');
        document.body.classList.add('fluent-player-modal-open');
        this.updateActiveItem(index);

        // Show navigation buttons initially
        if (this.modalNextBtn) this.modalNextBtn.classList.add('visible');
        if (this.modalPrevBtn) this.modalPrevBtn.classList.add('visible');
        if (this.modalCloseBtn) this.modalCloseBtn.classList.add('visible');

        const mediaSettings = this.playlist.medias[index].settings;

        // Update modal player container for audio
        const viewType = mediaSettings.viewType || 'video';
        const modalPlayerContainer = this.modalPlayer.closest('.grid-modal-player');
        if (modalPlayerContainer) {
            if (viewType === 'audio') {
                modalPlayerContainer.classList.add('fp-audio');
                const safeModalPoster = privacyEnhanceYouTubePoster(mediaSettings.posterSrc || '');
                if (safeModalPoster) {
                    modalPlayerContainer.style.backgroundImage = 'url("' + safeModalPoster + '")';
                } else {
                    modalPlayerContainer.style.backgroundImage = '';
                }
            } else {
                modalPlayerContainer.classList.remove('fp-audio');
                modalPlayerContainer.style.backgroundImage = '';
            }
        }

        if (!this.inlinePlayer) {
            this.inlinePlayer = this.playlist.player;
        }
        this.playlist.swapPlayer(this.modalPlayer);

        this.playlist.loadMedia(index, autoplay);

        // Update subtitle tracks for the new media
        this.updateModalSubtitles(mediaSettings.subtitles);

        // Focus management - focus close button for accessibility
        setTimeout(() => {
            if (this.modalCloseBtn) {
                this.modalCloseBtn.focus();
            }
        }, 100);

        // Add keyboard navigation
        this.setupModalKeyboardNav();
    }

    closeModal() {
        if (!this.modal) return;

        this.playlist.destroyPerVideoFeatures();

        this.modal.classList.remove('visible');
        document.body.classList.remove('fluent-player-modal-open');
        this.modalPlayer.pause();
        this.modalPlayer.src = '';

        if (this.inlinePlayer) {
            this.playlist.swapPlayer(this.inlinePlayer);
            this.inlinePlayer = null;
        }

        // Remove keyboard navigation listener
        if (this.modalKeyboardHandler) {
            document.removeEventListener('keydown', this.modalKeyboardHandler);
            this.modalKeyboardHandler = null;
        }

        // Restore focus to the element that opened the modal
        if (this.previousFocusElement && document.contains(this.previousFocusElement)) {
            this.previousFocusElement.focus();
        }
        this.previousFocusElement = null;
    }

    modalNavList() {
        return this.searchQuery ? this.filteredItems : this.playlist.medias;
    }

    modalNavPosition() {
        const currentId = this.playlist.medias[this.currentModalIndex]?.ID;
        return this.modalNavList().findIndex(media => media.ID === currentId);
    }

    navigateModal(direction) {
        const list = this.modalNavList();
        const pos = this.modalNavPosition();
        if (pos === -1) return;

        const newPos = pos + direction;
        if (newPos < 0 || newPos >= list.length) return;

        const globalIndex = this.playlist.medias.findIndex(media => media.ID === list[newPos].ID);
        if (globalIndex !== -1) {
            this.openModal(globalIndex, this.modal.classList.contains('grid-fullscreen') ? 'fullscreen' : 'modal');
        }
    }

    updateModalNav() {
        if (!this.modalNextBtn || !this.modalPrevBtn) return;
        const pos = this.modalNavPosition();
        this.modalPrevBtn.disabled = pos <= 0;
        this.modalNextBtn.disabled = pos === -1 || pos >= this.modalNavList().length - 1;
    }

    updateModalSubtitles(subtitles) {
        if (!this.modalPlayer) return;
        this.playlist.updateSubtitles(subtitles, this.modalPlayer);
    }

    updateModalContent(mediaData) {
        const set = (selector, text) => {
            const el = this.modal.querySelector(selector);
            if (el) el.textContent = text;
        };
        set('#grid-modal-title', mediaData.post_title);
        set('#grid-modal-description', mediaData.settings.description);
        set('#grid-modal-duration', this.formatDuration(mediaData.settings.duration));
        const posterEl = this.modal.querySelector('#grid-modal-poster');
        if (posterEl) posterEl.src = mediaData.settings.posterSrc || '';

        // Update audio controls if present
        const audioTitle = this.modalPlayer?.querySelector('.fp-audio-title');
        if (audioTitle) audioTitle.textContent = mediaData.post_title || '';
        const audioSubtitle = this.modalPlayer?.querySelector('.fp-audio-subtitle');
        if (audioSubtitle) audioSubtitle.textContent = mediaData.settings.description || '';
        const audioPoster = this.modalPlayer?.querySelector('.fp-audio-poster');
        if (audioPoster) {
            const posterImg = audioPoster.querySelector('img');
            if (mediaData.settings.posterSrc) {
                audioPoster.style.backgroundImage = 'url("' + mediaData.settings.posterSrc + '")';
                audioPoster.classList.remove('fp-audio-poster-default');
                if (posterImg) { posterImg.src = mediaData.settings.posterSrc; posterImg.style.display = ''; }
            } else {
                audioPoster.style.backgroundImage = '';
                audioPoster.classList.add('fp-audio-poster-default');
                if (posterImg) posterImg.style.display = 'none';
            }
        }
    }

    // --- Search ---
    normalizeText(str) {
        return String(str == null ? '' : str)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    applySearch(query) {
        this.searchQuery = String(query == null ? '' : query).trim();
        const q = this.normalizeText(this.searchQuery);

        this.filteredItems = q
            ? this.playlist.medias.filter(media => this.normalizeText(media.post_title).includes(q))
            : [...this.playlist.medias];

        this.currentPage = 1;
        this.renderItems();
        this.updatePagination();
        this.updateHeaderCount();

        if (this.searchClearBtn) {
            this.searchClearBtn.hidden = (this.searchInput ? this.searchInput.value : this.searchQuery) === '';
        }
    }

    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        clearTimeout(this._searchTimer);
        this.applySearch('');
    }

    updateHeaderCount() {
        if (!this.headerCount) return;

        if (this.searchQuery === '') {
            this.headerCount.textContent = this._countOriginal;
            return;
        }

        const template = this.headerCount.dataset.filteredTemplate || '{shown} of {total}';
        this.headerCount.textContent = template
            .replace('{shown}', this.filteredItems.length)
            .replace('{total}', this.playlist.medias.length);
    }

    // --- Pagination & State Logic ---
    getItemsForCurrentPage() {
        const perPage = this.options.itemsPerPage || 12;
        const start = (this.currentPage - 1) * perPage;
        const end = start + perPage;
        return this.filteredItems.slice(start, end);
    }

    goToPage(pageNumber) {
        const totalPages = Math.ceil(this.filteredItems.length / (this.options.itemsPerPage || 12));
        if (pageNumber < 1 || pageNumber > totalPages) return;
        this.currentPage = pageNumber;
        this.renderItems();
        this.updatePagination();
    }

    updatePagination() {
        if (!this.paginationContainer) return;
        const totalPages = Math.ceil(this.filteredItems.length / (this.options.itemsPerPage || 12));
        this.paginationContainer.style.display = totalPages > 1 ? 'flex' : 'none';
        this.paginationContainer.querySelector('.current-page').textContent = this.currentPage;
        this.paginationContainer.querySelector('.total-pages').textContent = totalPages;
        this.paginationContainer.querySelector('.prev-btn').disabled = this.currentPage === 1;
        this.paginationContainer.querySelector('.next-btn').disabled = this.currentPage === totalPages;
    }

    updateNoResults(show) {
        if (this.noResultsContainer) {
            this.noResultsContainer.style.display = show ? 'flex' : 'none';
        }
    }

    destroy() {
        clearTimeout(this._searchTimer);
        // Close modal and cleanup keyboard handler
        if (this.modal && this.modal.classList.contains('visible')) {
            this.closeModal();
        }
        if (this.modalKeyboardHandler) {
            document.removeEventListener('keydown', this.modalKeyboardHandler);
            this.modalKeyboardHandler = null;
        }
        // Remove all tracked event listeners
        if (this._listeners) {
            for (const { el, event, handler, options } of this._listeners) {
                el.removeEventListener(event, handler, options);
            }
            this._listeners = [];
        }
    }

    formatDuration(seconds) {
        return formatDurationUtil(seconds);
    }

}

export default GridPlaylistManager;
