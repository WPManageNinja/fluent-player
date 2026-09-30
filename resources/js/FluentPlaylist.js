import 'vidstack/player';
import 'vidstack/player/ui';
import '@icons'; // Custom icon loader - only imports icons we actually use
import { getBestVideoSrc, applyYouTubePrivacyMode, applyEmbedReferrerPolicy, privacyEnhanceYouTubePoster } from './utils/videoSrc';
import { getAjaxUrl as _getAjaxUrl, getNonce as _getNonce } from './utils/ajax';
import { bindUnlockForm } from './utils/unlock';
import { formatDuration as formatDurationUtil } from './utils/formatDuration';
import { audioContainerState } from './utils/playlistAudioState';
import { submitEmailCapture, showEmailConfirmation } from './utils/emailCapture.js';
import { enablePlayerControlsDOM, disablePlayerControlsDOM } from './utils/playerControls';
import { resolveArmedMilestones, resolveArmedLayers, mediaHasEmailCapture } from './behavior/arming.js';

const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Import layout managers
import LearningPlaylistManager from './managers/LearningPlaylistManager.js';
import GridPlaylistManager from './managers/GridPlaylistManager.js';
import LayersManager from './LayersManager.js';
import $t from './translator.js';
import ContextMenuController from './utils/contextMenuController.js';
import { evaluateConditionals, hasEnabledConditionals, mergeConditionStates } from './utils/conditions.js';
import {
    buildPlaybackTargetUrl,
    getUrlPlaybackTarget,
    matchesUrlPlaybackRef,
    scrollPlaybackTargetIntoView
} from './utils/urlPlaybackTarget.js';
import { resolveSidebarTransition } from './utils/playlistSidebarState.js';

class FluentPlaylist {
    constructor(container, options = {}) {
        this.container = container;
        this.playlist = options?.playlist;
        this.medias = options?.medias || [];
        this.currentMediaIndex = 0;
        this.currentMedia = this.medias[0] || null;
        this._isDestroyed = false;

        this.player = this.container.querySelector('media-player');
        this.playlistItems = this.container.querySelectorAll('.playlist-item');

        // Layout manager
        this.layoutManager = null;

        // Simplified state management
        this.isLoading = false;
        this.loadTimeout = null;

        // Completion state per media (IDs)
        this.completedMediaIds = new Set();
        this.completedStorageKey = `fluent_player_completed_${this.playlist?.ID || 'default'}`;

        // Track mobile breakpoint for sidebar: only collapse when transitioning to mobile
        this._wasMobile = null;

        // Event listener storage for cleanup
        this._trackedListeners = [];

        // Per-video feature state (cleared on every video switch)
        this._perVideoListeners = [];
        this._perVideoStateMap  = new Map();  // mediaId → saved feature state
        this.layersManager       = null;
        this.emailCaptureShown        = false;
        this.emailSubmitted           = false;
        this.ctaShown            = false;
        this.ctaCompleted        = false;
        this.actionBarShown      = false;
        this.closedActionBar     = false;
        this.ctaAutoDismissTimer = null;

        // Ref-counted overlay control lock (Step 6)
        this._overlayLockCount = 0;
        this._overlayKeydownHandler = null;

        // Chapter blob URL for cleanup (Step 9)
        this._chaptersBlobUrl = null;

        // Pending can-play handler ref for cleanup between loads
        this._pendingCanPlayHandler = null;

        // Skip scrollIntoView during initial load
        this._isInitialLoad = true;
        this._initialPlaybackTarget = null;
        this._initialPlaybackTargetConsumed = false;
        this._loopOverride = null;
        this.contextMenuController = null;

        if (!this.player || !this.medias.length) {
            return;
        }

        this.init();
    }

    init() {
        // Vidstack 1.12.5 does not catch the AbortError thrown internally when
        // player.src changes before the previous source finishes loading.
        // Register once per page to suppress these spurious unhandled rejections.
        if (!window._fluentPlaylistAbortHandled) {
            window._fluentPlaylistAbortHandled = true;
            window.addEventListener('unhandledrejection', (event) => {
                if (event.reason?.name === 'AbortError') {
                    event.preventDefault();
                }
            });
        }

        this.setupYouTubePrivacyMode();
        this.setupLayoutManager();
        this.setupResponsiveLayout();
        this.setupEventListeners();
        this.initCompletionState();
        this.setupKeyboardNavigation();
        this.setupPlaylistHeight();
        this.setupHeaderHeight();
        this.setupWindowResize();
        this.applyThumbnailRatio();
        const shouldAutoplay = this.shouldAutoPlay();
        this.initInitialMedia(shouldAutoplay);
        this.initSidebar();
        this.initCollapsibleSections();
        this.initVideoCounter();
        this.setupContextMenu();
    }

    initInitialMedia(shouldAutoplay) {
        const target = this.resolveInitialPlaybackTarget();

        if (!target) {
            this.loadMedia(0, shouldAutoplay);
            return;
        }

        this._initialPlaybackTarget = target;

        const targetIndex = this.findMediaIndexByDeepLinkRef(target.mediaRef);
        if (targetIndex < 0) {
            this._initialPlaybackTarget = null;
            this.loadMedia(0, shouldAutoplay);
            return;
        }

        const gridDisplayMode = this.playlist?.settings?.grid?.displayMode || 'inline';

        if (
            this.playlist?.settings?.layout?.type === 'grid' &&
            gridDisplayMode !== 'inline' &&
            this.layoutManager &&
            typeof this.layoutManager.openModal === 'function'
        ) {
            this.layoutManager.openModal(
                targetIndex,
                this.playlist?.settings?.grid?.modalLayout || 'centered',
                shouldAutoplay
            );
            return;
        }

        this.loadMedia(targetIndex, shouldAutoplay);
    }

    setupContextMenu() {
        if (this.contextMenuController) {
            this.contextMenuController.destroy();
        }

        this.contextMenuController = new ContextMenuController({
            rootElement: this.container,
            getSurfaceFromTarget: (target) => this.getContextMenuSurfaceFromTarget(target),
            getContextMenuConfig: () => this.currentMedia?.settings?.context_menu,
            buildPlaybackUrl: (_, options) => this.buildPlaybackUrl(options),
            canCopyPlaybackUrlAtTime: () => this.canCopyPlaybackUrlAtTime(),
            supportsLoop: () => !this.isCurrentMediaLiveStream(),
            isLoopEnabled: () => this.shouldLoop(),
            setLoopEnabled: (_, enabled) => this.setLoopEnabled(enabled),
            canSetPlaybackSpeed: () => !!this.player?.state?.canSetPlaybackRate,
            getPlaybackRate: () => this.player?.playbackRate || 1,
            setPlaybackRate: (_, rate) => {
                if (this.player) {
                    this.player.playbackRate = rate;
                }
            },
            getCaptionTracks: () => this.getCaptionTracks(),
            toggleSingleCaptionTrack: () => this.toggleSingleCaptionTrack(),
            setActiveCaptionTrack: (_, trackId) => this.setActiveCaptionTrack(trackId),
            canTogglePictureInPicture: () => (
                !!this.player
                && this.currentMedia?.settings?.viewType !== 'audio'
                && !!this.player?.state?.canPictureInPicture
            ),
            isPictureInPictureActive: () => !!this.player?.state?.pictureInPicture,
            togglePictureInPicture: () => this.togglePictureInPicture()
        });

        this.contextMenuController.init();
    }

    getContextMenuSurfaceFromTarget(target) {
        if (!target || !this.container?.contains(target)) {
            return null;
        }

        const surface = target.closest('.playlist-player-container, .grid-modal-player');
        if (!surface || !this.container.contains(surface) || !surface.querySelector('media-player')) {
            return null;
        }

        return surface;
    }

    canCopyPlaybackUrlAtTime() {
        return !this.isCurrentMediaLiveStream() && Number.isFinite(this.player?.currentTime);
    }

    buildPlaybackUrl({ includeTime = false } = {}) {
        const playerRef = this.container?.dataset?.flpRef;
        const mediaRef = this.getMediaDeepLinkRef(this.currentMedia, this.currentMediaIndex);

        if (!playerRef || !mediaRef) {
            return '';
        }

        return buildPlaybackTargetUrl({
            playerRef,
            mediaRef,
            time: includeTime ? Math.max(0, Math.floor(this.player?.currentTime || 0)) : null
        });
    }

    setLoopEnabled(enabled) {
        this._loopOverride = !!enabled;
    }

    getCaptionTracks() {
        if (this.currentMedia?.settings?.styles?.captions?.enabled === false) {
            return [];
        }

        const tracks = this.player?.textTracks;
        if (!tracks) {
            return [];
        }

        const captionTracks = [];
        let index = 0;

        for (const track of tracks) {
            if (track.kind !== 'captions' && track.kind !== 'subtitles') {
                continue;
            }

            captionTracks.push({
                id: `caption-${index}`,
                label: track.label || track.language || `${$t('Caption')} ${index + 1}`,
                selected: track.mode === 'showing'
            });
            index++;
        }

        return captionTracks;
    }

    setActiveCaptionTrack(trackId) {
        const tracks = this.player?.textTracks;
        if (!tracks) {
            return;
        }

        let captionIndex = 0;

        for (const track of tracks) {
            if (track.kind !== 'captions' && track.kind !== 'subtitles') {
                continue;
            }

            track.mode = trackId === `caption-${captionIndex}` ? 'showing' : 'disabled';
            captionIndex++;
        }
    }

    toggleSingleCaptionTrack() {
        const tracks = this.getCaptionTracks();
        if (tracks.length !== 1) {
            return;
        }

        this.setActiveCaptionTrack(tracks[0].selected ? null : tracks[0].id);
    }

    async togglePictureInPicture() {
        if (!this.player?.state?.canPictureInPicture) {
            return;
        }

        try {
            if (this.player.state.pictureInPicture) {
                await this.player.exitPictureInPicture();
            } else {
                await this.player.enterPictureInPicture();
            }
        } catch (_) {
            // Ignore provider/browser PiP failures.
        }
    }

    resolveInitialPlaybackTarget() {
        const target = getUrlPlaybackTarget();
        const containerRef = this.container?.dataset?.flpRef;

        if (
            !target ||
            !matchesUrlPlaybackRef(target.playerRef, containerRef) ||
            !target.mediaRef
        ) {
            return null;
        }

        scrollPlaybackTargetIntoView(this.container, containerRef || target.playerRef);

        return target;
    }

    getMediaDeepLinkRef(media, index = null) {
        const configRef = media?.deep_link_ref || media?.deepLinkRef;
        if (typeof configRef === 'string' && configRef) {
            return configRef;
        }

        if (index !== null) {
            const itemRef = this.playlistItems[index]?.dataset?.flpRef;
            if (itemRef) {
                return itemRef;
            }
        }

        return media?.ID ? `fpm_${media.ID}` : '';
    }

    findMediaIndexByDeepLinkRef(mediaRef) {
        if (!mediaRef) {
            return -1;
        }

        return this.medias.findIndex((media, index) => (
            matchesUrlPlaybackRef(mediaRef, this.getMediaDeepLinkRef(media, index))
        ));
    }

    isCurrentMediaLiveStream() {
        return String(this.currentMedia?.settings?.streamType || '').toLowerCase().includes('live');
    }

    seekToTime(targetTime) {
        if (!this.player || typeof targetTime !== 'number' || targetTime < 0) {
            return false;
        }

        const remote = this.player.remoteControl;
        if (remote?.seeking && remote?.seek) {
            remote.seeking(targetTime);
            remote.seek(targetTime);
        } else {
            this.player.currentTime = targetTime;
        }

        return true;
    }

    isPlayerReadyToSeek() {
        return (this.player?.state?.seekableEnd ?? 0) > 0;
    }

    consumeInitialPlaybackTimeForCurrentMedia() {
        if (
            this._initialPlaybackTargetConsumed ||
            !this._initialPlaybackTarget ||
            !this.currentMedia
        ) {
            return false;
        }

        const currentMediaRef = this.getMediaDeepLinkRef(this.currentMedia, this.currentMediaIndex);
        if (!matchesUrlPlaybackRef(this._initialPlaybackTarget.mediaRef, currentMediaRef)) {
            return false;
        }

        if (typeof this._initialPlaybackTarget.time !== 'number' || this.isCurrentMediaLiveStream()) {
            return false;
        }

        if (!this.isPlayerReadyToSeek()) {
            return true;
        }

        this._initialPlaybackTargetConsumed = true;

        return this.seekToTime(this._initialPlaybackTarget.time);
    }

    // Initialize per-video completion from localStorage or DOM
    initCompletionState() {
        try {
            const persisted = typeof (Storage) !== 'undefined' ? localStorage.getItem(this.completedStorageKey) : null;
            if (persisted) {
                const ids = JSON.parse(persisted);
                if (Array.isArray(ids)) {
                    ids.forEach((id) => this.completedMediaIds.add(String(id)));
                }
            } else {
                // Seed from existing DOM state (items with 'completed' class)
                this.playlistItems.forEach((item) => {
                    if (item.classList.contains('completed')) {
                        const id = item.getAttribute('data-media-id');
                        if (id) this.completedMediaIds.add(String(id));
                    }
                });
                this.persistCompleted();
            }
        } catch (e) {
            // ignore
        }

        // Reflect current media state on footer button
        this.updateFooterCompletionButton();
    }

    persistCompleted() {
        try {
            if (typeof (Storage) !== 'undefined') {
                localStorage.setItem(this.completedStorageKey, JSON.stringify(Array.from(this.completedMediaIds)));
            }
        } catch (e) {
            // ignore
        }
    }

    isMediaCompleted(mediaId) {
        if (!mediaId) return false;
        return this.completedMediaIds.has(String(mediaId));
    }

    setMediaCompleted(mediaId, completed) {
        if (!mediaId) return;
        const id = String(mediaId);
        if (completed) {
            this.completedMediaIds.add(id);
        } else {
            this.completedMediaIds.delete(id);
        }
        this.persistCompleted();
    }

    syncLearningManagerCompletion(mediaId, completed) {
        if (this.playlist?.settings?.layout?.type !== 'learning') return;
        if (!this.layoutManager) return;
        this.layoutManager.syncCompletionState(mediaId, completed);
    }

    updateFooterCompletionButton() {
        const btn = this.container.querySelector('.fp-mark-complete-btn');
        if (!btn) return;
        const mediaId = this.currentMedia?.ID || btn.getAttribute('data-media-id');
        if (mediaId) btn.setAttribute('data-media-id', mediaId);
        const completed = this.isMediaCompleted(mediaId);
        if (completed) {
            btn.classList.add('completed');
            btn.innerHTML = $t('Completed');
        } else {
            btn.classList.remove('completed');
            btn.innerHTML = $t('Mark as Complete');
        }
    }

    updateSidebarCompletionForIndex(index) {
        const item = this.playlistItems[index];
        if (!item) return;
        const mediaId = item.getAttribute('data-media-id');
        const completed = this.isMediaCompleted(mediaId);
        if (completed) {
            item.classList.add('completed');
        } else {
            item.classList.remove('completed');
        }
        const status = item.querySelector('.lesson-status');
        if (status) {
            let completedIcon = status.querySelector('.completed-icon');
            let incompleteIcon = status.querySelector('.incomplete-icon');

            // Ensure icons exist so we can toggle immediately
            if (!completedIcon) {
                completedIcon = document.createElement('media-icon');
                completedIcon.setAttribute('type', 'check');
                completedIcon.className = 'completed-icon';
                completedIcon.style.display = 'none';
                status.appendChild(completedIcon);
            }
            if (!incompleteIcon) {
                incompleteIcon = document.createElement('media-icon');
                incompleteIcon.setAttribute('type', 'circle');
                incompleteIcon.className = 'incomplete-icon';
                incompleteIcon.style.display = 'none';
                status.appendChild(incompleteIcon);
            }

            completedIcon.style.display = completed ? '' : 'none';
            incompleteIcon.style.display = completed ? 'none' : '';
        }
    }

    isSideLayout() {
        return !this.container.classList.contains('playlist-top') && !this.container.classList.contains('playlist-bottom');
    }

    getInnerPlaylistContainer() {
        return this.container.querySelector(':scope > .fluent-playlist-container') || this.container;
    }

    syncPlaylistToggleExpanded() {
        const inner = this.getInnerPlaylistContainer();
        const openBtn = this.container.querySelector('.fp-playlist-toggle, [data-playlist-toggle]');
        if (!openBtn || !inner) return;

        openBtn.setAttribute('aria-expanded', String(!inner.classList.contains('sidebar-collapsed')));
    }

    applyThumbnailRatio() {
        const ratio = this.getEffectiveAspectRatio();
        const resolvedRatio = this.resolveAspectRatioValue(ratio);
        const target = this.getInnerPlaylistContainer() || this.container;
        const playerContainer = this.container.querySelector('.playlist-player-container');
        const mediaPlayer = this.container.querySelector('media-player');
        this.updatePortraitClass(resolvedRatio);

        if (!resolvedRatio) {
            if (target) target.style.removeProperty('--fp-playlist-thumbnail-ratio');
            if (playerContainer) playerContainer.style.aspectRatio = 'auto';
            if (mediaPlayer) {
                const viewType = mediaPlayer.getAttribute('view-type') || mediaPlayer.getAttribute('data-view-type');
                if (viewType !== 'audio') {
                    mediaPlayer.style.setProperty('aspect-ratio', 'auto');
                }
            }
            return;
        }

        const cssRatio = this.toCssAspectRatio(resolvedRatio);
        if (cssRatio && target) {
            target.style.setProperty('--fp-playlist-thumbnail-ratio', cssRatio);
        }
        if (cssRatio && playerContainer) {
            playerContainer.style.aspectRatio = cssRatio;
        }

        if (mediaPlayer) {
            const viewType = mediaPlayer.getAttribute('view-type') || mediaPlayer.getAttribute('data-view-type');
            if (viewType !== 'audio') {
                mediaPlayer.style.setProperty('aspect-ratio', cssRatio || 'var(--fp-playlist-thumbnail-ratio, 16 / 9)');
            }
        }
    }

    getPlaylistAspectRatio() {
        return this.playlist?.settings?.layout?.thumbnailRatio;
    }

    getEffectiveAspectRatio() {
        const playlistRatio = this.getPlaylistAspectRatio();
        if (playlistRatio !== undefined && playlistRatio !== null && playlistRatio !== '') {
            return this.resolveAspectRatioValue(playlistRatio);
        }
        const mediaRatio = this.currentMedia?.settings?.aspectRatio;
        return this.resolveAspectRatioValue(mediaRatio);
    }

    getDefaultAspectRatio() {
        return window.fluent_player?.general?.default_aspect_ratio || window.fluent_player?.default_aspect_ratio || '16:9';
    }

    isPortraitRatio(value) {
        const normalized = this.normalizeAspectRatio(value);
        if (!normalized) return false;
        const parts = normalized.split('/');
        if (parts.length !== 2) return false;
        const width = parseFloat(parts[0]);
        const height = parseFloat(parts[1]);
        if (!width || !height) return false;
        return height > width;
    }

    getHeightFromRatio(value, width) {
        const normalized = this.normalizeAspectRatio(value);
        if (!normalized || !width) return 0;
        const parts = normalized.split('/');
        if (parts.length !== 2) return 0;
        const ratioWidth = parseFloat(parts[0]);
        const ratioHeight = parseFloat(parts[1]);
        if (!ratioWidth || !ratioHeight) return 0;
        return (width * ratioHeight) / ratioWidth;
    }

    getPortraitWidthCap(containerWidth) {
        if (!containerWidth) return 0;
        const cap = window.innerHeight ? window.innerHeight * 0.45 : 0;
        return cap ? Math.min(containerWidth, cap) : containerWidth;
    }

    updatePortraitClass(value) {
        const isPortrait = this.isPortraitRatio(value);
        const playerRoot = this.container.querySelector('.fluent-player');
        if (playerRoot) {
            playerRoot.classList.toggle('fp-portrait', !!isPortrait);
        }
    }

    resolveAspectRatioValue(value) {
        const candidate = !value || value === 'default' ? this.getDefaultAspectRatio() : value;
        if (!candidate || candidate === 'original') return null;
        return candidate;
    }

    normalizeAspectRatio(value) {
        if (!value) return '';
        return value.includes('/') ? value : value.replace(':', '/');
    }

    toCssAspectRatio(value) {
        const normalized = this.normalizeAspectRatio(value);
        return normalized ? normalized.replace('/', ' / ') : '';
    }

    applyMobileSidebarState() {
        if (this.playlist?.settings?.layout?.type === 'learning') return;
        if (!this.isSideLayout()) return;
        const inner = this.getInnerPlaylistContainer();
        const sidebar = this.container.querySelector('.playlist-sidebar');
        const playerContainer = this.container.querySelector('.playlist-player-container');
        const isMobile = window.innerWidth <= 768;
        const isAudioPlaylist = this.container.classList.contains('fp-playlist-audio');
        // Only an actual breakpoint crossing changes the collapsed state; staying
        // on the same side preserves the user's manual toggle. (Previously the
        // desktop branch force-expanded on every resize, which — combined with the
        // resize handler's self-perpetuating loop — made the toggle unusable once
        // DevTools/any resize had fired.)
        const { collapse, restore } = resolveSidebarTransition(isMobile, this._wasMobile);

        if (isMobile) {
            if (!isAudioPlaylist && sidebar && playerContainer && sidebar.parentNode !== playerContainer) {
                this._sidebarOriginalParent = sidebar.parentNode;
                this._sidebarOriginalNext = sidebar.nextSibling;
                playerContainer.appendChild(sidebar);
            }
            if (collapse) {
                inner.classList.add('sidebar-collapsed');
                if (this.backdrop) {
                    this.backdrop.classList.remove('fp-backdrop-visible');
                }
                this.syncPlaylistToggleExpanded();
            }
            this._wasMobile = true;
        } else {
            this._wasMobile = false;
            if (restore) {
                inner.classList.remove('sidebar-collapsed');
            }
            if (this.backdrop) {
                this.backdrop.classList.remove('fp-backdrop-visible');
            }
            this.syncPlaylistToggleExpanded();
            if (sidebar && this._sidebarOriginalParent && sidebar.parentNode !== this._sidebarOriginalParent) {
                if (this._sidebarOriginalNext && this._sidebarOriginalNext.parentNode === this._sidebarOriginalParent) {
                    this._sidebarOriginalParent.insertBefore(sidebar, this._sidebarOriginalNext);
                } else {
                    this._sidebarOriginalParent.appendChild(sidebar);
                }
            }
        }
    }

    initSidebar() {
        const toggleBtn = this.container.querySelector('.sidebar-toggle-btn');
        if (toggleBtn) {
            const isExpanded = !this.container.classList.contains('sidebar-collapsed');
            toggleBtn.setAttribute('aria-expanded', String(isExpanded));
            this._addEventListener(toggleBtn, 'click', (e) => {
                e.preventDefault();
                this.container.classList.toggle('sidebar-collapsed');
                const isExpanded = !this.container.classList.contains('sidebar-collapsed');
                toggleBtn.setAttribute('aria-expanded', String(isExpanded));
            });
        }

        if (this.playlist?.settings?.layout?.type === 'learning') return;

        // Bind the playlist-menu toggle button for any non-grid playlist layout,
        // including top/bottom row layouts. The mobile-drawer behavior (with
        // backdrop) is reserved for side layouts only; top/bottom and desktop
        // simply toggle the sidebar-collapsed class on the inner container.
        const inner = this.getInnerPlaylistContainer();
        const openBtn = this.container.querySelector('.fp-playlist-toggle, [data-playlist-toggle]');
        if (openBtn && inner) {
            this.syncPlaylistToggleExpanded();
            this._addEventListener(openBtn, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.isSideLayout() && window.innerWidth <= 768) {
                    this.openMobileSidebar();
                } else {
                    inner.classList.toggle('sidebar-collapsed');
                    this.syncPlaylistToggleExpanded();
                }
            });
        }

        if (!this.isSideLayout()) return;

        const playerContainer = this.container.querySelector('.playlist-player-container');

        // Create backdrop element inside player container (side layouts only)
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'fp-playlist-backdrop';
        if (playerContainer) {
            playerContainer.appendChild(this.backdrop);
        }

        this._addEventListener(this.backdrop, 'click', () => {
            this.closeMobileSidebar();
        });

        // Apply mobile state (moves sidebar into player container on mobile)
        this.applyMobileSidebarState();

        const openBtnFloating = this.container.querySelector('.fp-playlist-open-btn');
        if (openBtnFloating) {
            if (playerContainer) {
                playerContainer.appendChild(openBtnFloating);
            }

            this._addEventListener(openBtnFloating, 'click', (e) => {
                e.preventDefault();
                this.openMobileSidebar();
            });
        }

        const closeBtn = this.container.querySelector('.fp-playlist-sidebar-close');
        if (closeBtn) {
            this._addEventListener(closeBtn, 'click', (e) => {
                e.preventDefault();
                this.closeMobileSidebar();
            });
        }
    }

    openMobileSidebar() {
        const inner = this.getInnerPlaylistContainer();
        inner.classList.remove('sidebar-collapsed');
        const isAudioPlaylist = this.container.classList.contains('fp-playlist-audio');
        if (!isAudioPlaylist && this.backdrop) {
            this.backdrop.classList.add('fp-backdrop-visible');
        }
        this.syncPlaylistToggleExpanded();
    }

    closeMobileSidebar() {
        const inner = this.getInnerPlaylistContainer();
        inner.classList.add('sidebar-collapsed');
        if (this.backdrop) {
            this.backdrop.classList.remove('fp-backdrop-visible');
        }
        this.syncPlaylistToggleExpanded();
    }

    initCollapsibleSections() {
        this.container.querySelectorAll('.fpl-collapsible-section .fpl-section-header').forEach(header => {
            const isOpen = header.parentElement.classList.contains('open');
            header.setAttribute('aria-expanded', String(isOpen));
            this._addEventListener(header, 'click', () => {
                header.parentElement.classList.toggle('open');
                const isOpen = header.parentElement.classList.contains('open');
                header.setAttribute('aria-expanded', String(isOpen));
            });
        });
    }

    /**
     * Initialize video counter that updates based on active playlist item
     */
    initVideoCounter() {
        // Cache elements for later updates; update will be triggered from
        // `updatePlaylistUI()` when the active item changes.
        this.counterEl = this.container.querySelector('.current-video-index');
        this.playlistItemsContainer = this.container.querySelector('.playlist-items');

        if (!this.counterEl || !this.playlistItemsContainer) {
            return;
        }

        // Initialize counter on setup
        this.updateVideoCounter();
    }

    /**
     * Update the visible video counter based on the active playlist item
     */
    updateVideoCounter() {
        if (!this.counterEl || !this.playlistItemsContainer) return;

        const activeItem = this.playlistItemsContainer.querySelector('.playlist-item.active');
        if (activeItem && typeof activeItem.dataset.mediaIndex !== 'undefined') {
            const currentIndex = parseInt(activeItem.dataset.mediaIndex, 10);
            this.counterEl.textContent = currentIndex + 1;
        } else {
            // If no active item, clear or set to default
            this.counterEl.textContent = '';
        }
    }

    /**
     * Add event listener and track it for cleanup
     */
    _addEventListener(target, event, handler, options) {
        target.addEventListener(event, handler, options);
        this._trackedListeners.push({ target, event, handler, options });
    }

    swapPlayer(newPlayer) {
        const oldPlayer = this.player;
        if (oldPlayer === newPlayer) return;

        this._trackedListeners = this._trackedListeners.map(entry => {
            if (entry.target !== oldPlayer) return entry;
            oldPlayer.removeEventListener(entry.event, entry.handler, entry.options);
            newPlayer.addEventListener(entry.event, entry.handler, entry.options);
            return { ...entry, target: newPlayer };
        });

        this.player = newPlayer;
    }

    destroy() {
        this._isDestroyed = true;
        this.destroyPerVideoFeatures();

        // Remove all tracked event listeners
        this._trackedListeners.forEach(({ target, event, handler, options }) => {
            target.removeEventListener(event, handler, options);
        });
        this._trackedListeners = [];

        // Remove window resize listener
        if (this._windowResizeHandler) {
            window.removeEventListener('resize', this._windowResizeHandler);
        }

        // Remove matchMedia breakpoint listener
        if (this._mediaQueryList && this._mediaQueryChangeHandler) {
            this._mediaQueryList.removeEventListener('change', this._mediaQueryChangeHandler);
        }

        // Remove document keydown listener
        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler);
        }

        // Disconnect ResizeObserver
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }

        // Remove player event listeners
        if (this.player && this._heightUpdateHandler) {
            this.player.removeEventListener('loadedmetadata', this._heightUpdateHandler);
            this.player.removeEventListener('can-play', this._heightUpdateHandler);
        }

        // Clear timeouts
        if (this.loadTimeout) {
            clearTimeout(this.loadTimeout);
        }
        if (this.savePositionTimeout) {
            clearTimeout(this.savePositionTimeout);
        }

        // Remove backdrop
        if (this.backdrop && this.backdrop.parentNode) {
            this.backdrop.remove();
        }

        if (this.contextMenuController) {
            this.contextMenuController.destroy();
            this.contextMenuController = null;
        }

        // Destroy layout manager
        if (this.layoutManager && typeof this.layoutManager.destroy === 'function') {
            this.layoutManager.destroy();
        }
    }

    setupLayoutManager() {
        const layoutType = this.playlist?.settings?.layout?.type || 'standard';

        switch (layoutType) {
            case 'learning':
                this.layoutManager = new LearningPlaylistManager(this, this.playlist?.settings?.learning);
                break;
            case 'grid':
                this.layoutManager = new GridPlaylistManager(this, this.playlist?.settings?.grid);
                break;
            default:
                this.layoutManager = null;
                break;
        }
    }

    setupResponsiveLayout() {
        const sidebar = this.container.querySelector('.playlist-sidebar');
        const playerContainer = this.container.querySelector('.playlist-player-container');

        if (!sidebar || !playerContainer) return;

        // Check playlist position setting
        const position = this.playlist?.settings?.layout?.position || 'right';

        // For bottom/top positions, don't run responsive layout logic at all
        if (position === 'bottom' || position === 'top') {
            return;
        }

        // Reset styles first
        sidebar.style.width = '';
        sidebar.style.minWidth = '';
        sidebar.style.maxHeight = '';
        sidebar.style.height = '';
        playerContainer.style.width = '';

        // Check if we're on mobile (768px or less)
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // On mobile, let CSS handle the layout - don't set inline styles
            return;
        }

        if (this.container.clientWidth < this.container.clientHeight) {
            // Portrait mode on larger screens
            sidebar.style.maxHeight = Math.min(0.5 * this.container.clientWidth, 450) + 'px';
        }
        // Landscape mode: Let CSS handle widths via --fp-playlist-sidebar-width variable
    }

    setupPlaylistHeight() {
        const isAudioPlaylist = this.container.classList.contains('fp-playlist-audio');

        const updateHeight = () => {
            const playerContainer = this.container.querySelector('.playlist-player-container');
            const playlistSidebar = this.container.querySelector('.playlist-sidebar');
            const mediaPlayer = this.container.querySelector('media-player');

            if (!playerContainer || !playlistSidebar || !mediaPlayer) return;

            const position = this.playlist?.settings?.layout?.position || 'right';
            const isMobile = window.innerWidth <= 768;

            if (isAudioPlaylist || position === 'bottom' || position === 'top' || isMobile) {
                const container = this.container.querySelector('.fluent-playlist-container');
                if (container) {
                    container.style.height = '';
                }
                playlistSidebar.style.maxHeight = '';
                playlistSidebar.style.height = '';
                playerContainer.style.maxWidth = '';
                playerContainer.style.marginInline = '';
            } else {
                const ratio = this.getEffectiveAspectRatio();
                const isPortrait = this.isPortraitRatio(ratio);
                const playerHeight = mediaPlayer.getBoundingClientRect().height;
                const playerWidth = playerContainer.getBoundingClientRect().width;
                // Landscape/square fill the available width and grow as tall as the
                // ratio needs (no height cap) so there is never empty space beside
                // the player. Portrait would become absurdly tall if it filled a
                // wide area, so its width is capped (and the player centers).
                const widthForRatio = isPortrait ? this.getPortraitWidthCap(playerWidth) : playerWidth;
                // Portrait can't fill a wide area without becoming absurdly tall, so
                // its width is capped and it's centred (symmetric side space).
                // Landscape/square fill the width (no cap, no auto-margin gap).
                playerContainer.style.maxWidth = isPortrait ? `${widthForRatio}px` : '';
                playerContainer.style.marginInline = isPortrait ? 'auto' : '';
                const desiredHeight = this.getHeightFromRatio(ratio, widthForRatio);

                if (playerHeight > 0 || desiredHeight > 0) {
                    let finalHeight = desiredHeight || playerHeight;
                    // Keep in step with the player-container's CSS min-height so the
                    // sidebar and player never end up a few px different in height.
                    finalHeight = Math.max(finalHeight, 280);

                    playlistSidebar.style.height = `${finalHeight}px`;
                    playlistSidebar.style.maxHeight = `${finalHeight}px`;

                    const container = this.container.querySelector('.fluent-playlist-container');
                    if (container) {
                        container.style.height = `${finalHeight}px`;
                    }
                }
            }
        };

        this._resizeObserver = new ResizeObserver(() => {
            updateHeight();
            this.setupHeaderHeight();
        });
        const mediaPlayer = this.container.querySelector('media-player');
        if (mediaPlayer) {
            this._resizeObserver.observe(mediaPlayer);
        }

        const sidebar = this.container.querySelector('.playlist-sidebar');
        const header = sidebar?.querySelector('.fp-playlist-header-top, .fp-playlist-header.fp-playlist-header-top');
        if (header && this._resizeObserver) {
            this._resizeObserver.observe(header);
        }

        this._heightUpdateHandler = updateHeight;
        this.player.addEventListener('loadedmetadata', updateHeight);
        this.player.addEventListener('can-play', updateHeight);

        updateHeight();
    }

    setupHeaderHeight() {
        const updateHeaderHeight = () => {
            const sidebar = this.container.querySelector('.playlist-sidebar');
            const header = sidebar?.querySelector('.fp-playlist-header-top, .fp-playlist-header.fp-playlist-header-top');

            if (header && sidebar) {
                const height = header.offsetHeight || header.getBoundingClientRect().height;
                if (height > 0) {
                    sidebar.style.setProperty('--fp-playlist-header-height', `${height + 2}px`);
                }
            }
        };

        updateHeaderHeight();
        setTimeout(updateHeaderHeight, 100);
    }

    setupWindowResize() {
        let resizeTimeout;
        this._windowResizeHandler = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.setupResponsiveLayout();
                this.applyMobileSidebarState();
                this.setupHeaderHeight();
                // NOTE: do NOT re-dispatch a window 'resize' here — it re-triggers
                // this very handler, creating a self-perpetuating resize loop that
                // ran forever after any resize. Media-player size changes are
                // already handled by the ResizeObserver in setupPlaylistHeight().
            }, 250);
        };
        window.addEventListener('resize', this._windowResizeHandler);

        // React to breakpoint change when device/profile changes
        const mql = window.matchMedia('(max-width: 768px)');
        this._mediaQueryChangeHandler = () => {
            this.setupResponsiveLayout();
            this.applyMobileSidebarState();
            this.setupHeaderHeight();
        };
        mql.addEventListener('change', this._mediaQueryChangeHandler);
        this._mediaQueryList = mql;
    }

    setupEventListeners() {
        // Player event listeners
        this._addEventListener(this.player, 'play', () => {
            this.isLoading = false;
            this.hideLoadingIndicator();
            this.updatePlayPauseIcons();
        });
        this._addEventListener(this.player, 'pause', () => {
            this.isLoading = false;
            this.hideLoadingIndicator();
            this.updatePlayPauseIcons();
        });
        this._addEventListener(this.player, 'ended', () => this.onEnded());
        this._addEventListener(this.player, 'time-update', () => this.onTimeUpdate());
        this._addEventListener(this.player, 'can-play', () => this.onCanPlay());
        this._addEventListener(this.player, 'progress', () => this.consumeInitialPlaybackTimeForCurrentMedia());
        this._addEventListener(this.player, 'durationchange', () => this.onDurationChange());

        // Simplified playlist item listeners
        this.playlistItems.forEach((item, index) => {
            this._addEventListener(item, 'click', (e) => {
                e.preventDefault();
                this.handlePlaylistItemClick(index);
            });
        });

        // Next/Prev button listeners
        this.nextBtn = this.container.querySelector('.fp-next-btn');
        this.prevBtn = this.container.querySelector('.fp-prev-btn');

        if (this.nextBtn) {
            this._addEventListener(this.nextBtn, 'click', (e) => {
                e.preventDefault();
                if (this.nextBtn.getAttribute('aria-disabled') === 'true') return;
                this.nextMedia(true);
            });
        }

        if (this.prevBtn) {
            this._addEventListener(this.prevBtn, 'click', (e) => {
                e.preventDefault();
                if (this.prevBtn.getAttribute('aria-disabled') === 'true') return;
                this.prevMedia(true);
            });
        }

        // Add event listener to mark complete button
        const markCompleteBtn = this.container.querySelector('.fp-mark-complete-btn');
        if (markCompleteBtn) {
            this._addEventListener(markCompleteBtn, 'click', (e) => {
                e.preventDefault();
                this.handleMarkComplete();
            });
        }
    }

    setupKeyboardNavigation() {
        // Make playlist items focusable
        this.playlistItems.forEach((item) => {
            if (!item.hasAttribute('tabindex')) {
                item.setAttribute('tabindex', '0');
            }
        });

        // Simplified keyboard navigation
        this._keydownHandler = (e) => {
            if (!this.isPlayerFocused()) return;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigateMedia(-1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateMedia(1);
                    break;
                case 'Enter':
                case ' ':
                    const focusedItem = document.activeElement;
                    if (focusedItem && focusedItem.classList.contains('playlist-item')) {
                        e.preventDefault();
                        const index = Array.from(this.playlistItems).indexOf(focusedItem);
                        if (index >= 0) {
                            this.handlePlaylistItemClick(index);
                        }
                    }
                    break;
            }
        };
        document.addEventListener('keydown', this._keydownHandler);
    }

    getBestVideoSrc(settings) {
        return getBestVideoSrc(settings);
    }

    // Toggle YouTube Privacy-Enhanced Mode on the player's provider. Vidstack picks
    // the embed host from `provider.cookies`, so this must run on provider-change
    // (before the embed URL is built). The playlist's <media-player> is independent
    // of FluentPlayer, so it needs its own wiring.
    setupYouTubePrivacyMode() {
        if (!this.player) return;
        this._addEventListener(this.player, 'provider-change', (e) => {
            applyYouTubePrivacyMode(e.detail);
            applyEmbedReferrerPolicy(e.detail);
        });
        if (this.player.provider) {
            applyYouTubePrivacyMode(this.player.provider);
            applyEmbedReferrerPolicy(this.player.provider);
        }
    }

    hideTrackUnlock() {
        const container = this.player.closest('.playlist-player-container')
            || this.player.closest('.grid-modal-player')
            || this.player.parentElement;
        const overlay = container && container.querySelector('.fp-playlist-unlock');
        if (overlay) overlay.remove();
    }

    showTrackUnlock(index) {
        const media = this.medias[index];
        if (!media) return;

        this.hideTrackUnlock();

        const container = this.player.closest('.playlist-player-container')
            || this.player.closest('.grid-modal-player')
            || this.player.parentElement;
        if (!container) return;

        const cfg = window.fluent_player || {};
        const trans = cfg.trans || {};
        const lockedMessage = cfg.locked_message || 'This media is password protected.';
        const overlay = document.createElement('div');
        overlay.className = 'fp-playlist-unlock fp-media-locked';
        overlay.innerHTML =
            '<form class="fp-unlock-form">'
            + '<p class="fp-unlock-message">' + escapeHtml(lockedMessage) + '</p>'
            + '<p class="fp-unlock-row"><input type="password" name="password" autocomplete="off" required placeholder="'
            + escapeHtml(trans.password || 'Password') + '" /> <button type="submit">' + escapeHtml(trans.unlock || 'Unlock') + '</button></p>'
            + '<p class="fp-unlock-error" role="alert" hidden></p>'
            + '</form>';
        container.appendChild(overlay);

        const form = overlay.querySelector('.fp-unlock-form');
        bindUnlockForm(form, media.ID, () => {
            // Deep-link the unlocked track so the reload doesn't reset to index 0.
            const url = new URL(window.location.href);
            const playerRef = (this.container && this.container.dataset) ? this.container.dataset.flpRef : '';
            const mediaRef = this.getMediaDeepLinkRef(media, index);
            if (playerRef) url.searchParams.set('flp_r', playerRef);
            if (mediaRef) url.searchParams.set('flp_v', mediaRef);
            window.location.href = url.toString();
        });
    }

    // Simple and reliable media loading
    loadMedia(index, autoplay = false) {
        if (index < 0 || index >= this.medias.length) return;

        // Prevent loading if already in progress for same media
        if (this.isLoading && index === this.currentMediaIndex) return;

        // Tear down old video's features BEFORE switching currentMedia,
        // so _savePerVideoState captures the correct (old) media ID.
        this.destroyPerVideoFeatures();

        this.enablePlayerControls();
        this.currentMediaIndex = index;
        this.currentMedia = this.medias[index];
        this.updatePlaylistUI();
        this.updateFooterCompletionButton();

        const settings = this.currentMedia.settings;

        // Clear any leftover unlock overlay from a previously-selected locked track.
        this.hideTrackUnlock();

        // Locked track — show the unlock form instead of loading.
        if (settings && settings.locked) {
            this.isLoading = false;
            this.showTrackUnlock(index);
            return;
        }

        // YouTube Privacy-Enhanced Mode is applied on the provider (cookies flag),
        // not by rewriting the URL — Vidstack discards the host and rebuilds the
        // embed from the video id. See setupYouTubePrivacyMode().
        const originalSrc = this.getBestVideoSrc(settings);

        // Show/hide feature containers immediately (just DOM toggle, no listeners)
        this.activateMediaFeatures(this.currentMedia);

        if (this.player.src === originalSrc) {
            this.consumeInitialPlaybackTimeForCurrentMedia();

            // Same source — safe to init features now (time/duration are already correct)
            this.initPerVideoFeatures(this.currentMedia);
            if (autoplay) {
                this.player.setAttribute('autoplay', '');
                if (!this.player.hasAttribute('muted')) {
                    this.player.setAttribute('muted', '');
                }
                if (this.player.paused) {
                    this.player.play().catch(error => {
                        console.warn('Play failed:', error);
                    });
                }
            } else {
                this.player.removeAttribute('autoplay');
            }
            return;
        }

        // Different media - need to load
        this.isLoading = true;
        this.showLoadingIndicator();

        if (this.loadTimeout) {
            clearTimeout(this.loadTimeout);
        }

        try {
            if (!this.player.paused) {
                this.player.pause();
            }

            this.player.title = settings.title || '';

            if (autoplay) {
                this.player.setAttribute('autoplay', '');
                if (!this.player.hasAttribute('muted')) {
                    this.player.setAttribute('muted', '');
                }
            } else {
                this.player.removeAttribute('autoplay');
            }

            // Update view-type and media-type for audio/video switching
            const viewType = settings.viewType || 'video';
            const mediaType = settings.mediaType || 'video';
            this.player.setAttribute('view-type', viewType);
            this.player.setAttribute('media-type', mediaType);
            this.applyThumbnailRatio();

            // Privacy-Enhanced Mode: serve YouTube posters from cookieless i.ytimg.com.
            const safePoster = privacyEnhanceYouTubePoster(settings.posterSrc || '');

            // Toggle the container into audio/video mode for THIS item, so a
            // mixed playlist (both skins rendered) shows the right one. CSS gates
            // the skins on the container's .fp-audio class. Audio posters use the
            // privacy-enhanced (cookieless) URL.
            const container = this.player.closest('.playlist-player-container') || this.player.closest('.grid-modal-player');
            if (container) {
                const audioState = audioContainerState(viewType, safePoster);
                container.classList.toggle('fp-audio', audioState.fpAudio);
                container.style.backgroundImage = audioState.backgroundImage;
            }
            if (container && container.classList.contains('fp-audio')) {
                // Update audio title and subtitle
                const audioTitle = this.player.querySelector('.fp-audio-title');
                if (audioTitle) {
                    audioTitle.textContent = settings.title || '';
                }
                const audioSubtitle = this.player.querySelector('.fp-audio-subtitle');
                if (audioSubtitle) {
                    audioSubtitle.textContent = settings.description || '';
                }

                // Update album cover inside audio controls
                const audioPoster = this.player.querySelector('.fp-audio-poster');
                if (audioPoster) {
                    const posterImg = audioPoster.querySelector('img');
                    if (safePoster) {
                        audioPoster.style.backgroundImage = 'url("' + safePoster + '")';
                        audioPoster.classList.remove('fp-audio-poster-default');
                        if (posterImg) {
                            posterImg.src = safePoster;
                            posterImg.style.display = '';
                        }
                    } else {
                        audioPoster.style.backgroundImage = '';
                        audioPoster.classList.add('fp-audio-poster-default');
                        if (posterImg) {
                            posterImg.style.display = 'none';
                        }
                    }
                }
            }

            this._isTrackSwitch = !!this.player.src;
            this._canPlayHandledForCurrentMedia = false;

            // Remove any stale can-play listener from a previous loadMedia call
            if (this._pendingCanPlayHandler) {
                this.player.removeEventListener('can-play', this._pendingCanPlayHandler);
                this._pendingCanPlayHandler = null;
            }

            this.player.src = originalSrc;

            const poster = this.player.querySelector('media-poster');
            if (poster && safePoster) {
                poster.src = safePoster;
                poster.alt = settings.title || '';
            }

            this.updateChapters(settings.chapters);
            this.updateSubtitles(settings?.subtitles || settings?.captions || []);

            // Init features in can-play so time/duration reflect the NEW video
            // (YouTube doesn't reset currentTime/duration synchronously on src change)
            const mediaForCanPlay = this.currentMedia;
            const handleCanPlay = () => {
                this._pendingCanPlayHandler = null;
                this.isLoading = false;
                this.hideLoadingIndicator();

                // Only init if we're still on the same media (user might have switched again)
                if (this.currentMedia === mediaForCanPlay) {
                    this.initPerVideoFeatures(this.currentMedia);
                }

                if (autoplay && this.player.hasAttribute('autoplay')) {
                    setTimeout(() => {
                        this.player.play().catch(error => {
                            console.warn('Autoplay failed:', error);
                        });
                    }, 100);
                }
            };

            this._pendingCanPlayHandler = handleCanPlay;
            this.player.addEventListener('can-play', handleCanPlay, { once: true });

            this.loadTimeout = setTimeout(() => {
                this.isLoading = false;
                this.hideLoadingIndicator();
                // Fallback: if can-play never fired, init features now
                if (this._pendingCanPlayHandler) {
                    this.player.removeEventListener('can-play', this._pendingCanPlayHandler);
                    this._pendingCanPlayHandler = null;
                    if (this.currentMedia === mediaForCanPlay) {
                        this.initPerVideoFeatures(this.currentMedia);
                    }
                }
            }, 5000);

        } catch (error) {
            console.warn('Error loading media:', error);
            this.isLoading = false;
            this.hideLoadingIndicator();
        }
    }

    enablePlayerControls() {
        this._overlayLockCount = Math.max(0, this._overlayLockCount - 1);
        if (this._overlayLockCount === 0) {
            enablePlayerControlsDOM(this.player);
            if (this._overlayKeydownHandler) {
                document.removeEventListener('keydown', this._overlayKeydownHandler, true);
                this._overlayKeydownHandler = null;
            }
        }
    }

    // -------------------------------------------------------------------------
    // PER-VIDEO FEATURE SUPPORT
    // -------------------------------------------------------------------------

    /** Store a feature-specific listener that will be removed on next video switch. */
    addFeatureListener(target, event, handler, options) {
        target.addEventListener(event, handler, options);
        this._perVideoListeners.push({ target, event, handler, options });
    }

    /** Tear down all per-video feature state before loading a new video. */
    destroyPerVideoFeatures() {

        // Save current video's state before resetting
        const currentMediaId = this.currentMedia?.ID;
        this._savePerVideoState(currentMediaId);

        // Reset DOM state of the currently visible feature container so that
        // returning to a video later does not immediately re-show stale overlays.
        const visibleFeatures = this.container.querySelector('.fp-per-video-features:not(.fp-features-hidden)');
        if (visibleFeatures) {
            visibleFeatures.querySelectorAll('.media-email-capture-overlay.active').forEach(el => el.classList.remove('active'));
            visibleFeatures.querySelectorAll('.cta-overlay.active').forEach(el => {
                el.classList.remove('active');
                el.style.display = 'none';
            });
            visibleFeatures.querySelectorAll('.action-bar-overlay.active').forEach(el => el.classList.remove('active'));
            visibleFeatures.querySelectorAll('.fp-media-custom-overlay.active:not(.fp-media-logo-overlay)').forEach(el => el.classList.remove('active'));
        }

        this.teardownMilestoneTracking();

        this._perVideoListeners.forEach(({ target, event, handler, options }) => {
            target.removeEventListener(event, handler, options);
        });
        this._perVideoListeners = [];

        if (this.layersManager) {
            this.layersManager.destroy({ skipResume: true });
            this.layersManager = null;
        }

        if (this.ctaAutoDismissTimer) {
            clearTimeout(this.ctaAutoDismissTimer);
            this.ctaAutoDismissTimer = null;
        }

        this.emailCaptureShown = false;
        this.emailSubmitted    = false;
        this.ctaShown          = false;
        this.ctaCompleted      = false;
        this.actionBarShown    = false;
        this.closedActionBar   = false;

        // Force-reset overlay lock count and re-enable controls
        this._overlayLockCount = 0;
        enablePlayerControlsDOM(this.player);
        if (this._overlayKeydownHandler) {
            document.removeEventListener('keydown', this._overlayKeydownHandler, true);
            this._overlayKeydownHandler = null;
        }
        if (this.player) {
            this.player.classList.remove('overlay-active');
        }
    }

    /** Save per-video feature state for later restoration. */
    _savePerVideoState(mediaId) {
        if (!mediaId) return;

        const existing = this._perVideoStateMap.get(String(mediaId));
        const hasRealState = existing && (
            existing.layerStates || existing.emailSubmitted || existing.ctaCompleted ||
            existing.closedActionBar || existing.emailCaptureShown || existing.ctaShown || existing.actionBarShown
        );
        if (hasRealState && !this.layersManager && !this.emailCaptureShown && !this.ctaShown && !this.actionBarShown) {
            return;
        }

        this._perVideoStateMap.set(String(mediaId), {
            emailCaptureShown: this.emailCaptureShown,
            emailSubmitted:    this.emailSubmitted,
            ctaShown:          this.ctaShown,
            ctaCompleted:      this.ctaCompleted,
            actionBarShown:    this.actionBarShown,
            closedActionBar:   this.closedActionBar,
            layerStates:       this.layersManager?.layerStates
                                 ? new Map([...this.layersManager.layerStates].map(([k, v]) => [k, { ...v }]))
                                 : null,
        });
    }

    /** Restore per-video feature state from a previous visit. */
    _restorePerVideoState(mediaId) {
        const saved = this._perVideoStateMap.get(String(mediaId));
        if (!saved) return null;
        this.emailCaptureShown = saved.emailCaptureShown;
        this.emailSubmitted    = saved.emailSubmitted;
        this.ctaShown          = saved.ctaShown;
        this.ctaCompleted      = saved.ctaCompleted;
        this.actionBarShown    = saved.actionBarShown;
        this.closedActionBar   = saved.closedActionBar;
        return saved;
    }

    /**
     * Return the media ID whose feature container should be visible,
     * or null if no features should show for the currently playing video.
     */
    getActiveFeatureMediaId(currentMedia) {
        const mode = this.playlist?.settings?.feature_mode || 'per_video';
        if (mode === 'selected_video') {
            const selectedId = this.playlist?.settings?.feature_video_id;
            return selectedId ? String(selectedId) : null;
        }
        return String(currentMedia?.ID);
    }

    /** Show the feature container for the active video; hide all others. */
    activateMediaFeatures(currentMedia) {
        const targetId = this.getActiveFeatureMediaId(currentMedia);
        this.container.querySelectorAll('.fp-per-video-features').forEach(el => {
            el.classList.toggle('fp-features-hidden', !(targetId && el.dataset.mediaId === targetId));
        });
    }

    /** Bind feature event handlers for the currently active video's container. */
    async setupMilestoneTracking(currentMedia) {
        const mediaId = currentMedia?.ID;
        const config = window.fluent_player?.crm_behavior;
        if (!mediaId || !this.player || !config || !config.active) return;

        const armed = resolveArmedMilestones(config, mediaId);
        if (!armed) return;

        const [{ default: MediaWatchTracker }, { default: MilestoneReporter }] = await Promise.all([
            import('./MediaWatchTracker.js'),
            import('./behavior/MilestoneReporter.js'),
        ]);
        if (this._isDestroyed || this.currentMedia?.ID !== mediaId || this._milestoneReporter) return;

        this._milestoneTracker = new MediaWatchTracker(this.player, {
            completionThreshold: 100,
            mediaId,
            segmentUpdateInterVal: 5,
        });
        this._milestoneReporter = new MilestoneReporter(this._milestoneTracker, {
            mediaId,
            nonce: config.nonce,
            armed,
            isLoggedIn: !!config.identity?.isLoggedIn,
            hasContact: !!config.identity?.hasContact,
            hasEmailCapture: mediaHasEmailCapture(currentMedia.settings),
        });
    }

    teardownMilestoneTracking() {
        if (this._milestoneReporter) {
            this._milestoneReporter.destroy();
            this._milestoneReporter = null;
        }
        if (this._milestoneTracker) {
            this._milestoneTracker.destroy();
            this._milestoneTracker = null;
        }
        if (this._layerReporter) {
            this._layerReporter.destroy();
            this._layerReporter = null;
        }
    }

    initPerVideoFeatures(currentMedia) {
        this.setupMilestoneTracking(currentMedia);

        const targetId = this.getActiveFeatureMediaId(currentMedia);
        if (!targetId) return;

        const featuresEl = this.container.querySelector(
            `.fp-per-video-features[data-media-id="${targetId}"]`
        );
        if (!featuresEl) return;

        // In selected_video mode, use the selected video's settings, not the currently playing video
        const featureMedia = (targetId !== String(currentMedia?.ID))
            ? this.medias.find(m => String(m.ID) === targetId)
            : currentMedia;
        const settings = featureMedia?.settings;
        if (!settings) return;

        // Restore saved state (sets flags like emailSubmitted, ctaCompleted, etc.)
        const saved = this._restorePerVideoState(targetId);

        // Skip features already completed/dismissed in a previous visit
        if (settings.email_capture?.enabled && !this.emailSubmitted)  this.handleEmailCapture(featuresEl, settings, currentMedia.ID);
        if (settings.cta?.enabled && !this.ctaCompleted)              this.handleCTA(featuresEl, settings);
        if (settings.action_bar?.enabled && !this.closedActionBar)    this.handleActionBar(featuresEl, settings, currentMedia.ID);
        if (settings.overlays?.length)                                this.handleOverlays(featuresEl, settings);  // always re-init (stateless)
        if (settings.layers?.length)                                  this.initLayersManager(featuresEl, settings, targetId, saved?.layerStates);

        // Step 6c: Coordinate layer control-locking with preset overlays
        if (this.layersManager) {
            this.addFeatureListener(this.player, 'pause', () => {
                if (this.layersManager?.hasBlockingLayer()) {
                    this.disablePlayerControls();
                    this.player?.classList.add('overlay-active');
                }
            });

            this.addFeatureListener(this.player, 'play', () => {
                if (this.layersManager && !this.layersManager.hasBlockingLayer()
                    && this.player?.classList.contains('overlay-active')
                    && !this.emailCaptureShown && !this.ctaShown) {
                    this.enablePlayerControls();
                    this.player?.classList.remove('overlay-active');
                }
            });
        }
    }

    getPresetConditionState(settings, extraState = {}) {
        return mergeConditionStates(settings?.condition_state || {}, extraState);
    }

    matchesPresetConditions(settings, conditionals, extraState = {}) {
        if (!hasEnabledConditionals(conditionals)) {
            return true;
        }

        return evaluateConditionals(conditionals, this.getPresetConditionState(settings, extraState));
    }

    getEmailSubmittedConditionState() {
        if (!this.emailSubmitted) {
            return {};
        }

        return {
            viewer: {
                email_submitted: true,
            },
        };
    }

    shouldShowPresetEmailCapture(settings) {
        return this.matchesPresetConditions(settings, settings?.email_capture?.conditionals, this.getEmailSubmittedConditionState());
    }

    shouldShowPresetCTA(settings) {
        return this.matchesPresetConditions(settings, settings?.cta?.conditionals, this.getEmailSubmittedConditionState());
    }

    handleEmailCapture(containerEl, settings, mediaId) {
        const emailCaptureEl = containerEl.querySelector('.media-email-capture-overlay');
        if (!emailCaptureEl) return;

        const percentage = settings.email_capture?.percentage || 0;
        if (percentage > 0) {
            const timeUpdateHandler = () => {
                if (this.isLoading) return; // skip stale time/duration during source switch
                const currentTime = this.player?.currentTime;
                const duration = this.player?.duration;
                if (typeof duration === 'number' && duration > 0 && typeof currentTime === 'number') {
                    const pct = (currentTime / duration) * 100;
                    if (pct >= percentage && !this.emailCaptureShown && this.shouldShowPresetEmailCapture(settings)) {
                        this.emailCapturePercentageTime = (percentage / 100) * duration;
                        this.showEmailCapture(emailCaptureEl);
                    }
                }
            };
            this.addFeatureListener(this.player, 'time-update', timeUpdateHandler);
        } else {
            const playHandler = () => {
                if (!this.emailCaptureShown && this.shouldShowPresetEmailCapture(settings)) {
                    this.emailCapturePercentageTime = 0;
                    this.showEmailCapture(emailCaptureEl);
                }
            };
            this.addFeatureListener(this.player, 'play', playHandler);
        }

        const skipButton = emailCaptureEl.querySelector('.email-capture-skip');
        if (skipButton) {
            this.addFeatureListener(skipButton, 'click', () => this.hideEmailCapture(emailCaptureEl));
        }

        const emailInput  = emailCaptureEl.querySelector('.email-capture-input');
        const submitButton = emailCaptureEl.querySelector('.email-capture-button');
        if (emailInput && submitButton) {
            this.addFeatureListener(emailInput, 'input', () => {
                emailInput.classList.remove('error');
                this.hideMessage(emailCaptureEl);
            });
            this.addFeatureListener(submitButton, 'click', () => {
                this.handleEmailSubmit(emailInput, emailCaptureEl);
            });
            this.addFeatureListener(emailInput, 'keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleEmailSubmit(emailInput, emailCaptureEl);
                }
            });
        }

        this.addFeatureListener(document, 'keydown', (e) => {
            if (emailCaptureEl.classList.contains('active') && e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
            }
        });
    }

    showEmailCapture(emailCaptureEl) {
        emailCaptureEl.classList.add('active');
        this.emailCaptureResumeTime = this.player?.currentTime ?? this.emailCapturePercentageTime;
        this.player?.pause();
        this.emailCaptureShown = true;
        const emailInput = emailCaptureEl.querySelector('.email-capture-input');
        if (emailInput) {
            setTimeout(() => emailInput.focus(), 100);
        }
        this.player?.classList.add('overlay-active');
        this.disablePlayerControls();
    }

    hideEmailCapture(emailCaptureEl) {
        emailCaptureEl.classList.remove('active');
        this.emailCaptureShown = true;
        this.player?.classList.remove('overlay-active');
        this.enablePlayerControls();
        if (this.emailCaptureResumeTime !== undefined) {
            this.player.currentTime = this.emailCaptureResumeTime;
        }
        this.player?.play();
    }

    handleCTA(containerEl, settings) {
        const ctaEl = containerEl.querySelector('.cta-overlay');
        if (!ctaEl) return;

        const percentage = settings.cta?.percentage;
        const completionType = ctaEl.dataset.completionType || 'link_click';
        const dismissMs = completionType === 'auto_dismiss'
            ? (parseInt(ctaEl.dataset.autoDismiss) || 5) * 1000
            : 0;

        const timeUpdateHandler = () => {
            if (this.isLoading) return; // skip stale time/duration during source switch
            const currentTime = this.player?.currentTime;
            const duration = this.player?.duration;
            if (typeof currentTime !== 'number' || typeof duration !== 'number' || duration <= 0) return;
            const pct = (currentTime / duration) * 100;
            if (pct >= percentage && !this.ctaShown && !this.ctaCompleted && this.shouldShowPresetCTA(settings)) {
                this.ctaPercentageTime = (percentage / 100) * duration;
                this.showCTA(ctaEl);
                if (completionType === 'auto_dismiss') {
                    this.ctaAutoDismissTimer = setTimeout(() => this.hideCTA(ctaEl), dismissMs);
                }
            }
        };
        this.addFeatureListener(this.player, 'time-update', timeUpdateHandler);

        const skipButton = ctaEl.querySelector('.cta-skip');
        if (skipButton) {
            this.addFeatureListener(skipButton, 'click', () => this.hideCTA(ctaEl));
        }

        if (completionType === 'link_click') {
            ctaEl.querySelectorAll('.cta-text-content a').forEach(link => {
                this.addFeatureListener(link, 'click', () => this.hideCTA(ctaEl, { skipResume: true }));
            });
        }
    }

    showCTA(ctaEl) {
        ctaEl.classList.add('active');
        ctaEl.style.display = 'flex';
        this.ctaResumeTime = this.player?.currentTime ?? this.ctaPercentageTime;
        this.player?.pause();
        this.ctaShown = true;
        this.player?.classList.add('overlay-active');
        this.disablePlayerControls();
    }

    hideCTA(ctaEl, { skipResume = false } = {}) {
        if (this.ctaAutoDismissTimer) {
            clearTimeout(this.ctaAutoDismissTimer);
            this.ctaAutoDismissTimer = null;
        }
        ctaEl.classList.remove('active');
        ctaEl.style.display = 'none';
        this.ctaShown = false;
        this.ctaCompleted = true;
        this.player?.classList.remove('overlay-active');
        this.enablePlayerControls();
        if (this.ctaResumeTime !== undefined) {
            this.player.currentTime = this.ctaResumeTime;
        }
        if (!skipResume) {
            this.player?.play();
        }
    }

    handleActionBar(containerEl, settings, mediaId) {
        const actionBarEl = containerEl.querySelector('.action-bar-overlay');
        if (!actionBarEl) return;

        const percentage = settings.action_bar?.percentage_start || 0;
        const timeUpdateHandler = () => {
            const currentTime = this.player?.currentTime;
            const duration = this.player?.duration;
            if (typeof currentTime !== 'number' || typeof duration !== 'number' || duration <= 0) return;
            const pct = (currentTime / duration) * 100;
            if (pct >= percentage && !this.actionBarShown && !this.closedActionBar) {
                this.showActionBar(actionBarEl);
            }
            if (pct < percentage && this.actionBarShown) {
                this.hideActionBar(actionBarEl);
            }
        };
        this.addFeatureListener(this.player, 'time-update', timeUpdateHandler);

        const actionButton = actionBarEl.querySelector('.action-bar-button');
        if (actionButton) {
            this.addFeatureListener(actionButton, 'click', () => {
                const link   = actionButton.dataset.link;
                const target = actionButton.dataset.target;
                if (link) window.open(link, target);
            });
        }

        const youtubeButton = actionBarEl.querySelector('.action-bar-youtube-button');
        if (youtubeButton) {
            this.addFeatureListener(youtubeButton, 'click', () => {
                const channelId = youtubeButton.dataset.channel;
                if (channelId) {
                    window.open(`https://www.youtube.com/channel/${channelId}?sub_confirmation=1`, '_blank');
                }
            });
        }

        const closeButton = actionBarEl.querySelector('.action-bar-close');
        if (closeButton) {
            this.addFeatureListener(closeButton, 'click', () => {
                this.hideActionBar(actionBarEl);
                this.closedActionBar = true;
            });
        }
    }

    showActionBar(actionBarEl) {
        actionBarEl.classList.add('active');
        this.actionBarShown = true;
    }

    hideActionBar(actionBarEl) {
        actionBarEl.classList.remove('active');
        this.actionBarShown = false;
    }

    handleOverlays(containerEl, settings) {
        const overlaysEls = containerEl.querySelectorAll('.fp-media-custom-overlay:not(.fp-media-logo-overlay)');
        if (!overlaysEls.length) return;

        let lastTimeUpdate = 0;
        const timeUpdateHandler = () => {
            const now = Date.now();
            if (now - lastTimeUpdate < 250) return;
            lastTimeUpdate = now;

            const currentTime = this.player?.currentTime;
            if (typeof currentTime !== 'number' || !settings.overlays) return;

            settings.overlays.forEach((overlay, index) => {
                const overlayEl = overlaysEls[index];
                if (!overlayEl) return;
                const startTime = overlay.displayTime || 0;
                const endTime   = startTime + (overlay.duration || 5);
                overlayEl.classList.toggle('active', currentTime >= startTime && currentTime <= endTime);
            });
        };

        this.addFeatureListener(this.player, 'time-update', timeUpdateHandler);
    }

    initLayersManager(containerEl, settings, mediaId, savedLayerStates) {
        if (this.layersManager) {
            this.layersManager.destroy({ skipResume: true });
            this.layersManager = null;
        }
        this.layersManager = new LayersManager(
            this.player, containerEl, mediaId, settings, this,
            { preserveDOM: true, initialLayerStates: savedLayerStates || null }
        );

        this.setupLayerTracking(settings, mediaId);
    }

    async setupLayerTracking(settings, mediaId) {
        const config = window.fluent_player?.crm_behavior;
        if (!mediaId || !this.layersManager || !config || !config.active) return;

        if (this._layerReporter) {
            this._layerReporter.destroy();
            this._layerReporter = null;
        }

        const armed = resolveArmedLayers(config, mediaId, settings?.layers || []);
        if (!armed) return;

        const { default: LayerReporter } = await import('./behavior/LayerReporter.js');
        if (this._isDestroyed || !this.layersManager || this.layersManager.mediaId !== mediaId) return;
        this._layerReporter = new LayerReporter(this.layersManager, {
            mediaId,
            nonce: config.nonce,
            armed,
            isLoggedIn: !!config.identity?.isLoggedIn,
            hasContact: !!config.identity?.hasContact,
            hasEmailCapture: mediaHasEmailCapture(settings),
        });
    }

    disablePlayerControls() {
        this._overlayLockCount++;
        if (this._overlayLockCount === 1) {
            disablePlayerControlsDOM(this.player);
            this._overlayKeydownHandler = (e) => {
                if (['Space', 'KeyK', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            };
            document.addEventListener('keydown', this._overlayKeydownHandler, true);
        }
    }

    async handleEmailSubmit(emailInput, containerEl, data = null, onComplete = null) {
        return submitEmailCapture({
            emailInput,
            messageTarget: containerEl,
            ajaxUrl: this.getAjaxUrl(),
            showMessage: (target, message, type, loader) => this.showMessage(target, message, type, loader),
            resolveRequestData: (submitButton) => ({
                media_id: submitButton?.dataset.mediaId || this.currentMedia?.ID,
                preset_slug: submitButton?.dataset.presetSlug || this.currentMedia?.settings?.preset_slug,
                video_time: this.player?.currentTime,
                type: submitButton?.dataset.type || data?.type || 'preset',
                nonce: submitButton?.dataset.nonce || window.fluent_player?.nonce || '',
                ...data,
            }),
            onSuccess: () => {
                this.emailSubmitted = true;
                const emailCaptureEl = containerEl.querySelector('.media-email-capture-overlay') || containerEl;
                showEmailConfirmation({
                    overlayEl: emailCaptureEl,
                    onDismiss: () => {
                        if (onComplete) {
                            onComplete();
                            return;
                        }
                        this.hideEmailCapture(emailCaptureEl);
                        this.layersManager?.checkLayersAtTime(this.player?.currentTime || 0);
                    },
                });
            },
        });
    }

    showMessage(containerEl, message, type = 'info', showLoader = false) {
        const messageEl = containerEl.querySelector('.email-capture-message');
        if (!messageEl) return;
        messageEl.textContent = '';
        if (showLoader) {
            const loader = document.createElement('span');
            loader.className = 'email-capture-loader';
            messageEl.appendChild(loader);
        }
        messageEl.appendChild(document.createTextNode(message));
        messageEl.className = `email-capture-message email-capture-message--${type}`;
        messageEl.style.display = 'block';
    }

    hideMessage(containerEl) {
        const messageEl = containerEl.querySelector('.email-capture-message');
        if (!messageEl) return;
        messageEl.style.display = 'none';
    }

    // -------------------------------------------------------------------------
    // END PER-VIDEO FEATURE SUPPORT
    // -------------------------------------------------------------------------

    // Simplified navigation methods
    navigateMedia(direction) {
        let newIndex;
        if (direction > 0) {
            newIndex = (this.currentMediaIndex + 1) % this.medias.length;
        } else {
            newIndex = this.currentMediaIndex === 0 ? this.medias.length - 1 : this.currentMediaIndex - 1;
        }
        this.loadMedia(newIndex, false);
    }

    nextMedia(autoplay = false) {
        const nextIndex = (this.currentMediaIndex + 1) % this.medias.length;

        // Check if we should loop
        if (this.currentMediaIndex === this.medias.length - 1 && !this.shouldLoop()) {
            return;
        }

        this.loadMedia(nextIndex, autoplay);
    }

    prevMedia(autoplay = false) {
        if (this.currentMediaIndex === 0 && !this.shouldLoop()) {
            return;
        }

        const newIndex = this.currentMediaIndex === 0 ? this.medias.length - 1 : this.currentMediaIndex - 1;
        this.loadMedia(newIndex, autoplay);
    }

    // Smooth play/pause toggle
    togglePlayback(index) {
        if (index === this.currentMediaIndex) {
            // Same media - toggle play/pause (no loading needed)
            if (this.player.paused) {
                this.player.play().catch(error => {
                    console.warn('Play failed:', error);
                });
            } else {
                this.player.pause();
            }
        } else {
            // Different media - load and play
            this.loadMedia(index, true);
        }
    }

    // Handle main playlist item click - always autoplay since user explicitly selected the video
    handlePlaylistItemClick(index) {
        if (index === this.currentMediaIndex) {
            // Same media - toggle play/pause
            this.togglePlayback(index);
        } else {
            // Different media - always autoplay on user click
            this.loadMedia(index, true);
        }
    }

    // Smart playback method for thumbnails - toggles play/pause
    playMedia(index) {
        if (index === this.currentMediaIndex) {
            // Same media - toggle play/pause (like clicking main item)
            if (this.player.paused) {
                this.player.play().catch(error => {
                    console.warn('Play failed:', error);
                });
            } else {
                this.player.pause();
            }
        } else {
            // Different media - load and play
            this.loadMedia(index, true);
        }
    }




    // Improved loading indicators
    showLoadingIndicator() {
        // Don't show loader if already visible
        if (this.container.querySelector('.fluent-playlist-loading-overlay')) return;

        const playerContainer = this.container.querySelector('.playlist-player-container');
        if (!playerContainer) return;

        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'fluent-playlist-loading-overlay';
        loadingOverlay.setAttribute('role', 'status');
        loadingOverlay.setAttribute('aria-label', $t('Loading'));
        loadingOverlay.innerHTML = '<div class="fluent-playlist-spinner"></div>';
        playerContainer.appendChild(loadingOverlay);
    }

    hideLoadingIndicator() {
        const playerContainer = this.container.querySelector('.playlist-player-container');
        if (!playerContainer) return;

        const loadingOverlay = playerContainer.querySelector('.fluent-playlist-loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }



    // Simplified autoplay check - playlist autoplay (boolean) always overrides media settings
    shouldAutoPlay() {
        const autoplaySetting = this.playlist?.settings?.behavior?.autoplay;

        // Simple boolean check - playlist autoplay setting always overrides
        return typeof autoplaySetting === 'boolean' && autoplaySetting === true;
    }

    // Handle mark complete button click
    handleMarkComplete() {
        const markCompleteBtn = this.container.querySelector('.fp-mark-complete-btn');
        if (!markCompleteBtn) return;

        const mediaId = markCompleteBtn.getAttribute('data-media-id');
        const currentlyCompleted = this.isMediaCompleted(mediaId);
        const newCompleted = !currentlyCompleted;
        this.setMediaCompleted(mediaId, newCompleted);
        if (this.playlist?.settings?.layout?.type === 'learning') {
            this.syncLearningManagerCompletion(mediaId, newCompleted);
        }
    }

    shouldLoop() {
        if (typeof this._loopOverride === 'boolean') {
            return this._loopOverride;
        }

        return this.playlist?.settings?.behavior?.loop || false;
    }

    // Simplified chapter handling
    updateChapters(chapters) {
        if (this._chaptersBlobUrl) {
            URL.revokeObjectURL(this._chaptersBlobUrl);
            this._chaptersBlobUrl = null;
        }

        const existingTrack = this.player.querySelector('track[kind="chapters"]');
        if (existingTrack) {
            existingTrack.remove();
        }

        if (chapters && chapters.length > 0) {
            const track = document.createElement('track');
            track.kind = 'chapters';
            track.label = $t('Chapters');
            this._chaptersBlobUrl = URL.createObjectURL(
                new Blob([this.generateChaptersVTT(chapters)], { type: 'text/vtt' })
            );
            track.src = this._chaptersBlobUrl;
            track.default = true;

            const provider = this.player.querySelector('media-provider');
            if (provider) {
                provider.appendChild(track);
            }
        }
    }

    updateSubtitles(subtitles, playerElement = null) {
        const target = playerElement || this.player;
        const subtitleItems = Array.isArray(subtitles) ? subtitles : [];

        // Save the currently active subtitle language before removing tracks
        this._saveActiveSubtitleChoice(target);

        // Cancel any pending restore from a previous track switch
        this._cancelPendingSubtitleRestore(target);

        // Remove existing subtitle tracks
        const existingTracks = target.querySelectorAll('track[kind="subtitles"], track[kind="captions"]');
        existingTracks.forEach(track => track.remove());

        // Normalize supported subtitle payload shapes and skip metadata-only entries.
        const validSubtitles = subtitleItems
            .map((subtitle) => ({
                ...subtitle,
                url: subtitle?.url || subtitle?.src || '',
                language: subtitle?.language || subtitle?.srclang || '',
                kind: subtitle?.kind || 'subtitles'
            }))
            .filter((subtitle) => subtitle.url);
        const hasSubtitles = validSubtitles.length > 0;

        if (hasSubtitles) {
            const provider = target.querySelector('media-provider');
            if (!provider) return;

            let defaultFound = false;
            validSubtitles.forEach((subtitle) => {
                if (subtitle.is_default) defaultFound = true;
            });

            validSubtitles.forEach((subtitle, index) => {
                const track = document.createElement('track');
                track.kind = subtitle.kind;
                track.label = subtitle.label || subtitle.language || '';
                track.src = subtitle.url;
                track.srclang = subtitle.language || '';

                const ext = subtitle.url.split('.').pop().toLowerCase();
                track.setAttribute('type', ext === 'srt' ? 'srt' : 'vtt');

                if (subtitle.is_default || (!defaultFound && index === 0)) {
                    track.default = true;
                }

                provider.appendChild(track);
            });

            // Restore the last chosen subtitle after tracks are loaded
            this._restoreSubtitleChoice(target);
        }

        // Toggle caption button visibility — keep visible for HLS sources
        // that may have manifest-embedded captions even without manual subtitles
        const hasHlsCaptions = target.querySelector('.fp-subtitle-menu') !== null;
        this.toggleCaptionButton(target, hasSubtitles || hasHlsCaptions);
    }

    _saveActiveSubtitleChoice(player) {
        try {
            const tracks = player.textTracks;
            if (!tracks) return;

            let hasSubtitleTracks = false;
            for (const track of tracks) {
                if (track.kind === 'subtitles') {
                    hasSubtitleTracks = true;
                    if (track.mode === 'showing') {
                        this._lastSubtitleLang = track.language;
                        this._lastSubtitleLabel = track.label;
                        this._hadSubtitlesActive = true;
                        return;
                    }
                }
            }
            // Only mark inactive if subtitle tracks existed but none were showing
            // (user explicitly turned them off). If no tracks exist (e.g. async
            // restore hasn't fired yet), preserve the previous saved state.
            if (hasSubtitleTracks) {
                this._hadSubtitlesActive = false;
            }
        } catch (e) {
            // ignore
        }
    }

    _cancelPendingSubtitleRestore(player) {
        if (this._restoreSubtitleTimeout) {
            clearTimeout(this._restoreSubtitleTimeout);
            this._restoreSubtitleTimeout = null;
        }
        if (this._restoreSubtitleCanPlayHandler) {
            player.removeEventListener('can-play', this._restoreSubtitleCanPlayHandler);
            this._restoreSubtitleCanPlayHandler = null;
        }
    }

    _restoreSubtitleChoice(player) {
        if (!this._hadSubtitlesActive) return;

        const lang = this._lastSubtitleLang;
        const label = this._lastSubtitleLabel;
        if (!lang && !label) return;

        const restore = () => {
            // Clear the other callback so restore only runs once
            this._cancelPendingSubtitleRestore(player);
            try {
                const tracks = player.textTracks;
                if (!tracks) return;
                for (const track of tracks) {
                    if (track.kind !== 'subtitles') continue;
                    if ((lang && track.language === lang) || (label && track.label === label)) {
                        track.mode = 'showing';
                        return;
                    }
                }
            } catch (e) {
                // ignore
            }
        };

        // Wait for Vidstack to process the new tracks via can-play event
        this._restoreSubtitleCanPlayHandler = restore;
        player.addEventListener('can-play', restore, { once: true });
        // Safety fallback in case can-play doesn't fire (e.g. cached media)
        this._restoreSubtitleTimeout = setTimeout(restore, 500);
    }

    toggleCaptionButton(player, show) {
        // Free: media-caption-button inside media-tooltip
        const captionBtn = player.querySelector('media-caption-button');
        if (captionBtn) {
            const wrapper = captionBtn.closest('media-tooltip') || captionBtn;
            wrapper.style.display = show ? '' : 'none';
        }
        // Pro: .fp-subtitle-menu
        const subtitleMenu = player.querySelector('.fp-subtitle-menu');
        if (subtitleMenu) {
            subtitleMenu.style.display = show ? '' : 'none';
        }
    }

    generateChaptersVTT(chapters) {
        let vtt = 'WEBVTT\n\n';

        chapters.forEach((chapter, index) => {
            const startTime = this.formatTime(chapter.startTime || 0);
            const endTime = index < chapters.length - 1
                ? this.formatTime(chapters[index + 1].startTime || 0)
                : this.formatTime(this.currentMedia.settings.duration || 3600);

            vtt += `${startTime} --> ${endTime}\n`;
            vtt += `${chapter.title || `Chapter ${index + 1}`}\n\n`;
        });

        return vtt;
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        const pad2 = (n) => String(n).padStart(2, '0');
        const pad3 = (n) => String(n).padStart(3, '0');
        return `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)}.${pad3(ms)}`;
    }

    formatDurationDisplay(seconds) {
        return formatDurationUtil(seconds);
    }

    onDurationChange() {
        if (!this.player?.duration || !Number.isFinite(this.player.duration)) return;
        const d = this.player.duration;
        const idx = this.currentMediaIndex;
        if (this.medias[idx]) {
            this.medias[idx].settings = this.medias[idx].settings || {};
            this.medias[idx].settings.duration = d;
        }
        const formatted = this.formatDurationDisplay(d);
        let item = null;
        if (this.playlistItems && this.playlistItems[idx]) {
            item = this.playlistItems[idx];
        } else if (this.container) {
            item = this.container.querySelector(`.grid-item[data-media-index="${idx}"], .fp-grid-item[data-media-index="${idx}"]`);
        }
        if (item) {
            const els = item.querySelectorAll('.fp-duration-display, .item-duration, .thumbnail-duration, .duration-badge');
            els.forEach((el) => {
                el.textContent = formatted;
                el.setAttribute('data-duration', String(d));
            });
        }
    }

    // Simplified UI updates
    updatePlaylistUI() {
        this.playlistItems.forEach((item, index) => {
            if (index === this.currentMediaIndex) {
                item.classList.add('active');
                // Mark active item for assistive tech
                try {
                    item.setAttribute('aria-current', 'true');
                } catch (e) {}
            } else {
                item.classList.remove('active');
                try {
                    item.removeAttribute('aria-current');
                } catch (e) {}
            }

            // Keep per-item completion and icons in sync
            this.updateSidebarCompletionForIndex(index);
        });

        // Smooth scroll to active item (skip during initial page load to prevent auto-scroll)
        const activeItem = this.playlistItems[this.currentMediaIndex];
        if (activeItem) {
            if (!this._isInitialLoad) {
                activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            this._isInitialLoad = false;
            // If the user was interacting with the playlist, move focus to the active item
            try {
                if (this.isPlayerFocused()) {
                    // ensure it's focusable
                    if (!activeItem.hasAttribute('tabindex')) activeItem.setAttribute('tabindex', '0');
                    activeItem.focus({preventScroll: true});
                }
            } catch (e) {
                // ignore focus errors
            }
        }

        // Update the visible counter when active item changes
        try {
            this.updateVideoCounter();
        } catch (e) {
            // ignore if not initialized
        }

        // Update navigation button states
        this.updateNavigationButtons();
    }

    // Update navigation button states.
    // Uses aria-disabled (focusable, screen-reader announces "dimmed") instead of
    // the HTML disabled attribute (which strips focus and goes silent for SR users).
    // Loop-enabled playlists never report a boundary; learning layout still respects
    // per-item lock state for the Next button.
    updateNavigationButtons() {
        const loops = this.shouldLoop();
        const atFirst = this.currentMediaIndex === 0;
        const atLast = this.currentMediaIndex === this.medias.length - 1;

        let hasPrevious = loops || !atFirst;
        let hasNext = loops || !atLast;

        // In learning layout, disable Next if next lesson is locked
        if (hasNext && this.playlist?.settings?.layout?.type === 'learning') {
            const nextIdx = atLast && loops ? 0 : this.currentMediaIndex + 1;
            const nextEl = this.playlistItems[nextIdx];
            const isLocked = nextEl ? nextEl.classList.contains('locked') : false;
            if (isLocked) {
                hasNext = false;
            }
        }

        if (this.prevBtn) {
            this.prevBtn.setAttribute('aria-disabled', hasPrevious ? 'false' : 'true');
            // Strip any server-rendered HTML disabled attribute so the button
            // remains in the tab order and announceable to screen readers.
            if (this.prevBtn.hasAttribute('disabled')) {
                this.prevBtn.removeAttribute('disabled');
            }
        }

        if (this.nextBtn) {
            this.nextBtn.setAttribute('aria-disabled', hasNext ? 'false' : 'true');
            if (this.nextBtn.hasAttribute('disabled')) {
                this.nextBtn.removeAttribute('disabled');
            }
        }
    }

    updatePlayPauseIcons() {
        this.playlistItems.forEach((item, index) => {
            const playIcon = item.querySelector('.play-icon');
            const pauseIcon = item.querySelector('.pause-icon');

            if (playIcon && pauseIcon) {
                if (index === this.currentMediaIndex && !this.player.paused) {
                    playIcon.style.display = 'none';
                    pauseIcon.style.display = 'inline';
                } else {
                    playIcon.style.display = 'inline';
                    pauseIcon.style.display = 'none';
                }
            }
        });
    }


    onEnded() {
        if (this.isSavePlayPositionEnabled()) {
            this.savePosition();
        }

        if (this.playlist?.settings?.behavior?.continuousPlay !== true) {
            return;
        }

        if (this.currentMediaIndex === this.medias.length - 1 && !this.shouldLoop()) {
            return;
        }

        this.showNextVideoLoader().then((cancelled) => {
            if (!cancelled) {
                this.nextMedia(this.shouldAutoPlay());
            }
        });
    }

    showNextVideoLoader() {
        return new Promise((resolve) => {
            const modalPlayerWrap = this.container.querySelector('#grid-modal-overlay .grid-modal-player');
            const playerContainer = this.container.querySelector('.playlist-player-container') || modalPlayerWrap || this.container;

            if (this.layoutManager && 'isMediaCompleted' in this.layoutManager) {
                if (!this.layoutManager.isMediaCompleted(this.currentMedia.ID)) {
                    resolve(true);
                    return;
                }
            }

            // Remove existing loader
            const existingLoader = playerContainer.querySelector('.fluent-player-next-loader');
            if (existingLoader) {
                existingLoader.remove();
            }

            const nextIndex = (this.currentMediaIndex + 1) % this.medias.length;
            const nextMedia = this.medias[nextIndex];

            // Create simplified loader
            const loaderOverlay = document.createElement('div');
            loaderOverlay.className = 'fluent-player-next-loader';
            loaderOverlay.setAttribute('role', 'dialog');
            loaderOverlay.setAttribute('aria-modal', 'true');
            loaderOverlay.setAttribute('aria-label', $t('Next Video'));
            const titleEl = document.createElement('span');
            titleEl.textContent = nextMedia.settings.title || $t('Next Video');
            loaderOverlay.innerHTML = `
                <div class="fluent-player-next-container">
                    <div class="fluent-player-next-info">
                        <div class="fluent-player-next-title">${$t('Playing next')}</div>
                        <div class="fluent-player-next-name">${titleEl.innerHTML}</div>
                        <div class="fluent-player-next-hint">${$t('Press ESC to cancel')}</div>
                    </div>
                    <div class="fluent-player-next-countdown">
                        <svg viewBox="0 0 36 36" aria-hidden="true" focusable="false">
                            <circle class="fluent-player-countdown-bg" cx="18" cy="18" r="16" />
                            <circle class="fluent-player-countdown-progress" cx="18" cy="18" r="16" stroke-dasharray="100 100" />
                        </svg>
                        <span class="fluent-player-countdown-number" aria-live="polite">3</span>
                    </div>
                    <button class="fluent-player-cancel-btn" type="button" aria-label="${$t('Cancel autoplay')}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            `;

            playerContainer.appendChild(loaderOverlay);
            loaderOverlay.style.display = 'flex';

            const cancelBtn = loaderOverlay.querySelector('.fluent-player-cancel-btn');
            if (cancelBtn) {
                cancelBtn.focus();
            }

            // Focus trap: keep focus inside the dialog while it's open
            const trapFocus = (e) => {
                if (e.key !== 'Tab') return;
                // Only one focusable element (cancel button), so always keep focus there
                e.preventDefault();
                if (cancelBtn) cancelBtn.focus();
            };
            loaderOverlay.addEventListener('keydown', trapFocus);

            let cancelled = false;
            let count = 3;

            const cleanup = () => {
                loaderOverlay.removeEventListener('keydown', trapFocus);
                loaderOverlay.remove();
                document.removeEventListener('keydown', handleKeydown);
            };

            const handleCancel = () => {
                if (cancelled) return;
                cancelled = true;
                cleanup();
                resolve(true);
            };

            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancel();
                }
            };

            loaderOverlay.querySelector('.fluent-player-cancel-btn').addEventListener('click', handleCancel);
            document.addEventListener('keydown', handleKeydown);

            // Countdown timer
            const countdown = () => {
                if (cancelled) return;

                const numberEl = loaderOverlay.querySelector('.fluent-player-countdown-number');
                const progressEl = loaderOverlay.querySelector('.fluent-player-countdown-progress');

                const progress = ((3 - count) / 3) * 100;
                progressEl.style.strokeDasharray = `${progress} 100`;

                if (count > 0) {
                    numberEl.textContent = count;
                    count--;
                    setTimeout(countdown, 1000);
                } else {
                    cleanup();
                    resolve(false);
                }
            };

            countdown();
        });
    }

    isSavePlayPositionEnabled() {
        if (!window.fluent_player?.has_pro) return false;
        if (this.isCurrentMediaLiveStream()) return false;
        const settings = this.currentMedia?.settings || {};
        if (Object.prototype.hasOwnProperty.call(settings, 'save_play_position')) {
            return !!settings.save_play_position;
        }
        const behaviors = settings.behaviors;
        if (behaviors && Object.prototype.hasOwnProperty.call(behaviors, 'save_play_position')) {
            return !!behaviors.save_play_position;
        }
        return !!window.fluent_player?.resume_playback;
    }

    onTimeUpdate() {
        if (!this.isSavePlayPositionEnabled()) return;
        const now = Date.now();
        if (this._lastSaveTime && now - this._lastSaveTime < 3000) {
            return;
        }
        this._lastSaveTime = now;
        this.savePosition();
    }

    onCanPlay() {
        if (this._canPlayHandledForCurrentMedia) {
            return;
        }
        this._canPlayHandledForCurrentMedia = true;
        if (this.consumeInitialPlaybackTimeForCurrentMedia()) {
            this._isTrackSwitch = false;
            return;
        }
        if (this._isTrackSwitch) {
            this.seekToTime(0);
        } else if (this.isSavePlayPositionEnabled()) {
            this.loadPosition();
        }
        this._isTrackSwitch = false;
    }

    // Simplified position tracking
    savePosition() {
        if (!this.currentMedia?.ID || !this.player.duration) return;

        const storage = window.FluentBrowserStorage;
        if (storage) {
            storage.savePosition(this.currentMedia.ID, this.player.currentTime, this.player.duration);
        }
    }

    loadPosition() {
        if (!this.currentMedia?.ID) return;

        const mediaId = this.currentMedia.ID;

        const storage = window.FluentBrowserStorage;
        if (storage) {
            const data = storage.getPosition(mediaId);
            if (data && data.position > 0) {
                this.player.currentTime = data.position;
            }
        }
    }

    // Utility methods
    isPlayerFocused() {
        return this.container.contains(document.activeElement) ||
            Array.from(this.playlistItems).some(item => item.contains(document.activeElement));
    }

    isAnalyticsEnabled() {
        return window.fluent_player?.analytics?.enabled;
    }

    getNonce() {
        return _getNonce();
    }

    getAjaxUrl() {
        return _getAjaxUrl();
    }
}

// Make FluentPlaylist available globally
if (typeof window !== 'undefined') {
    window.FluentPlaylist = FluentPlaylist;
}

export default FluentPlaylist;
