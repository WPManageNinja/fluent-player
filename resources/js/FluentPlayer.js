  import 'vidstack/player';
import 'vidstack/player/ui';
import { isHLSProvider } from 'vidstack';
import '@icons'; // Custom icon loader - only imports icons we actually use
// LayersManager and AnalyticsTracker are loaded via dynamic import() for lazy-loading
import { getVideoError, createErrorOverlay } from './VideoErrorHandler.js';
import { resolveArmedMilestones, resolveArmedLayers, mediaHasEmailCapture } from './behavior/arming.js';
import $t from './translator.js';
import { getAjaxUrl as _getAjaxUrl, getNonce as _getNonce } from './utils/ajax';
import { evaluateConditionals, hasEnabledConditionals, mergeConditionStates } from './utils/conditions.js';
import { shouldWarnMissingGoogleAnalytics, waitForGoogleAnalytics } from './utils/googleAnalytics.js';
import { disablePlayerControlsDOM, enablePlayerControlsDOM } from './utils/playerControls';
import { applyYouTubePrivacyMode, applyEmbedReferrerPolicy, privacyEnhanceYouTubePoster, applyBunnyStreamToken, appendBunnyTokenQuery } from './utils/videoSrc.js';
import ContextMenuController from './utils/contextMenuController.js';
import { submitEmailCapture, showEmailConfirmation } from './utils/emailCapture.js';
import { getPlayerModalGate } from './utils/playerKeyboardGate.js';
import { throttle } from './utils/throttle.js';
import {
    buildPlaybackTargetUrl,
    getUrlPlaybackTarget,
    matchesUrlPlaybackRef,
    resolveShortcodeStartTarget,
    scrollPlaybackTargetIntoView
} from './utils/urlPlaybackTarget.js';

const CONSTANTS = {
    // Save/Resume settings
    SAVE_THROTTLE_MS: 10000,
    MIN_SAVE_TIME_SECONDS: 3,
    // Wait briefly before verifying a programmatic resume seek has "stuck".
    RESUME_VERIFY_DELAY_MS: 120,
    // Providers may land slightly off the requested second, so allow small drift.
    RESUME_TIME_TOLERANCE_SECONDS: 0.5,
    // Avoid retrying forever if a provider refuses the resume seek.
    RESUME_MAX_ATTEMPTS: 3,

    // UI delays (100ms for most UI interactions, 200ms for animations)
    UI_DELAY_MS: 100,
    UI_ANIMATION_MS: 200,

    // Event throttling
    TIME_UPDATE_THROTTLE_MS: 500,

    // Autoplay countdown
    AUTOPLAY_COUNTDOWN_SECONDS: 3,
    AUTOPLAY_FINAL_DELAY_MS: 600,

    // Google Analytics: wait briefly for a late-loaded site tag
    GA_POLL_INTERVAL_MS: 200,
    GA_POLL_MAX_MS: 5000,
};

class FluentPlayer {
    constructor(container, options = {}) {
        this.container = container;
        this.mediaId = options?.media?.ID;
        this.instanceId = container.id || (this.mediaId + '_' + Math.random().toString(36).slice(2, 8));
        this.settings = options?.media?.settings;
        // Captured at instance creation so Mux Data sees a stable startup timestamp
        // regardless of when mux-embed finishes its dynamic import.
        this._playerInitTime = Date.now();
        // Only the per-media analytics nonce satisfies Pro's
        // fluent_player_track_event:{id} check; the generic frontend nonce would
        // always be rejected, so don't fall back to it (AnalyticsTracker skips
        // the beacon when this is empty).
        this.analyticsNonce = options?.analytics_nonce || '';
        this.defaultSettings = options?.default_settings || {};
        this.languageMediaSources = options?.languageMediaSources || {};
        this.conditionState = options?.condition_state || this.settings?.condition_state || {};
        this.player = this.container.querySelector('media-player');

        // Initialize state variables for overlays
        this.emailCaptureShown = false;
        this.emailSubmitted = false;
        this.ctaShown = false;
        this.ctaCompleted = false;
        this.actionBarShown = false;
        // For load="play": start with loader hidden (poster + controls visible)
        // For other strategies: start with loader visible
        const loadStrategy = this.settings.loadStrategy === 'poster' ? 'play' : (this.settings.loadStrategy || 'visible');
        this.isLoading = loadStrategy !== 'play';
        this.closedActionBar = false;

        // Initialize layers manager
        this.layersManager = null;

        // Event listener storage for cleanup
        this.eventListeners = [];
        this.beforeUnloadHandler = null;
        this.countdownTimeouts = [];
        this._resumeRetryTimeout = null;
        this._resumeFrame = null;
        this._resumeVerifyAttempts = 0;
        this._pendingResumeTime = null;
        this._initialPlaybackTarget = null;
        this._loopOverride = null;
        this.contextMenuController = null;

        // Google Analytics progress tracking
        this.gaTrackedPoints = new Set();
        this._gaSetupRequested = false;
        this._isDestroyed = false;

        if (!this.player || !this.settings) {
            return;
        }

        this.init();
    }

    /**
     * Apply caption style CSS variables from preset/media settings to the player element
     * so _captions.scss can use --media-cue-color, --media-cue-bg, --media-cue-font-size.
     * When preset has "Customize Caption Style" off (enabled === false), hide captions on frontend.
     */
    /**
     * Apply branding CSS variables (brand color, control bar color) directly on the container.
     * This is a JS-side fallback for when the server-side enqueuePlayerStyles CSS is not available
     * (e.g., Fluent Community lesson pages that use pre-rendered content).
     */
    applyBrandingStyles() {
        if (!this.container || !this.settings) return;

        // Only apply JS fallback when server-side enqueuePlayerStyles CSS is absent
        // (e.g., Fluent Community lesson pages with pre-rendered content).
        // Server CSS uses [data-media-id] selectors which have higher specificity,
        // but inline styles from JS would override them — so skip when server CSS exists.
        const mediaId = this.container.getAttribute('data-media-id') || this.mediaId;
        const hasServerCss = !!document.querySelector(
            'style[id*="fluent_player_css"], style[id="fluent-player-lesson-css"]'
        );
        if (hasServerCss) return;

        const useCustom = !!this.settings.useCustomBranding;
        const brandColor = useCustom
            ? (this.settings.brandingColor || '#DD1F13')
            : (this.defaultSettings?.brandColor || '');
        const controlBarColor = useCustom
            ? (this.settings.controlBarColor || '')
            : (this.defaultSettings?.controlBarColor || '');

        if (brandColor) {
            this.container.style.setProperty('--media-brand', brandColor);
            this.container.style.setProperty(
                '--media-focus-ring',
                `0 0 0 2px color-mix(in srgb, ${brandColor} 72%, white), 0 0 0 4px color-mix(in srgb, ${brandColor} 32%, transparent)`
            );
        }
        if (controlBarColor) {
            this.container.style.setProperty('--fp-control-bar-bg', controlBarColor);
        }

        // Apply aspect ratio for layout shift prevention (only if not already set by server CSS)
        const computedRatio = getComputedStyle(this.container).aspectRatio;
        if ((!computedRatio || computedRatio === 'auto') && this.settings?.viewType !== 'audio') {
            const mediaRatio = this.settings?.aspectRatio;
            const defaultRatio = this.defaultSettings?.aspectRatio || this.defaultSettings?.defaultAspectRatio;
            const ratio = (mediaRatio && mediaRatio !== 'default') ? mediaRatio : defaultRatio;
            if (ratio && ratio !== 'original') {
                const cssRatio = ratio.includes('/') ? ratio : ratio.replace(':', ' / ');
                this.container.style.aspectRatio = cssRatio;
            }
        }
    }

    applyCaptionStyles() {
        const captions = this.settings?.styles?.captions;
        if (!this.player) return;
        const hideCaptions = captions && captions.enabled === false;
        if (hideCaptions) {
            this.player.classList.add('fp-captions-hidden');
            return;
        }
        this.player.classList.remove('fp-captions-hidden');
        if (!captions) return;
        if (captions.color) this.player.style.setProperty('--media-cue-color', captions.color);
        if (captions.background) this.player.style.setProperty('--media-cue-bg', captions.background);
        if (captions.font_size != null) this.player.style.setProperty('--media-cue-font-size', `${captions.font_size}px`);
    }

    /**
     * Setup accessibility toggle controls (Announcements & Keyboard Animations)
     * in the settings menu. Persists preferences via fluent_player_accessibility
     * localStorage key using the same centralized pattern as BrowserStorage.
     */
    setupLazySettingsMenu() {
        this.setupAccessibilityControls();
    }

    setupAccessibilityControls() {
        if (!this.player || !this.container) return;

        const toggles = this.container.querySelectorAll('[data-fp-toggle]');
        if (!toggles.length) return;

        const STORAGE_KEY = 'fluent_player_accessibility';
        const DEFAULTS = { announcements: false, 'keyboard-animations': true };

        // Load all prefs from single storage key
        let prefs;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            prefs = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
        } catch (e) {
            prefs = { ...DEFAULTS };
        }

        const savePrefs = () => {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch (e) { /* quota */ }
        };

        const applyToggle = (el, key, checked) => {
            el.setAttribute('aria-checked', checked ? 'true' : 'false');

            if (key === 'announcements') {
                const announcer = this.player.querySelector('media-announcer');
                if (announcer) announcer.style.display = checked ? '' : 'none';
            } else if (key === 'keyboard-animations') {
                this.player.classList.toggle('fp-no-keyboard-animations', !checked);
            }
        };

        toggles.forEach(el => {
            const key = el.getAttribute('data-fp-toggle');
            let checked = prefs[key] ?? DEFAULTS[key] ?? true;

            applyToggle(el, key, checked);

            const onPress = (e) => {
                if (e.button && e.button !== 0) return;
                checked = !checked;
                prefs[key] = checked;
                applyToggle(el, key, checked);
                savePrefs();
            };

            const onKeyDown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPress(e);
                }
            };

            this.addEventListener(el, 'pointerup', onPress);
            this.addEventListener(el, 'keydown', onKeyDown);
        });
    }

    /**
     * Show Vidstack-style bezel animations for keyboard/gesture actions.
     * Mirrors Vidstack's DefaultKeyboardDisplay but works with custom layouts.
     */
    setupSeekBezel() {
        if (!this.player) return;

        // Map bezel actions to media-icon types (from icons.js)
        const iconTypes = {
            backward: 'seek-backward-10',
            forward: 'seek-forward-10',
            play: 'play',
            pause: 'pause',
            'volume-up': 'volume-high',
            'volume-down': 'volume-low',
            mute: 'mute',
            unmute: 'volume-high'
        };

        const bezel = document.createElement('div');
        bezel.className = 'fp-seek-bezel';
        bezel.setAttribute('aria-hidden', 'true');
        const iconEl = document.createElement('media-icon');
        iconEl.className = 'fp-seek-bezel-icon';
        bezel.appendChild(iconEl);
        this.player.appendChild(bezel);

        let timer = null;

        const showBezel = (action) => {
            if (timer) {
                clearTimeout(timer);
                bezel.classList.remove('is-active');
            }

            iconEl.type = iconTypes[action] || action;
            if (action === 'forward') {
                bezel.dataset.action = 'seek-forward';
            } else if (action === 'backward') {
                bezel.dataset.action = 'seek-backward';
            } else {
                bezel.dataset.action = action;
            }

            void bezel.offsetWidth;
            bezel.classList.add('is-active');

            timer = setTimeout(() => {
                bezel.classList.remove('is-active');
                timer = null;
            }, 500);
        };

        // Keyboard detection
        this.addEventListener(this.player, 'keydown', (e) => {
            // A blocking layer (form/email/CTA) owns the keyboard — don't show
            // player bezels or react to keys typed into an overlay field.
            const t = e.target;
            const typing = t && (t.isContentEditable || (t.matches && t.matches('input, textarea, select, [contenteditable="true"]')));
            const blockingLayer = this.player.keyDisabled || this.player.querySelector?.('.layer-active.blocking-layer');
            if (typing || blockingLayer) {
                return;
            }
            if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
                showBezel('forward');
            } else if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
                showBezel('backward');
            } else if (e.key === 'k' || e.key === 'K' || e.key === ' ') {
                showBezel(this.player.paused ? 'play' : 'pause');
            } else if (e.key === 'ArrowUp') {
                showBezel('volume-up');
            } else if (e.key === 'ArrowDown') {
                showBezel('volume-down');
            } else if (e.key === 'm' || e.key === 'M') {
                showBezel(this.player.muted ? 'unmute' : 'mute');
            }
        });

        // Play/pause via click or media events
        this.addEventListener(this.player, 'media-play-request', (e) => {
            const trigger = e.trigger;
            if (!trigger) return;
            let originEvent = trigger;
            while (originEvent?.trigger) originEvent = originEvent.trigger;
            if (originEvent?.type === 'pointerup' || originEvent?.type === 'click') {
                showBezel('play');
            }
        });

        this.addEventListener(this.player, 'media-pause-request', (e) => {
            const trigger = e.trigger;
            if (!trigger) return;
            let originEvent = trigger;
            while (originEvent?.trigger) originEvent = originEvent.trigger;
            if (originEvent?.type === 'pointerup' || originEvent?.type === 'click') {
                showBezel('pause');
            }
        });

        // Double-tap gesture seek detection (mobile only — not slider drags)
        this.addEventListener(this.player, 'media-seek-request', (e) => {
            const trigger = e.trigger;
            if (!trigger) return;
            // Walk the trigger chain — if any link comes from a slider or
            // gesture element, skip. We only want keyboard-originated seeks
            // or explicit double-tap gestures.
            let originEvent = trigger;
            while (originEvent?.trigger) originEvent = originEvent.trigger;
            if (originEvent?.type !== 'dblpointerup') return;

            const seekTime = e.detail;
            const currentTime = this.player.currentTime || 0;
            if (seekTime > currentTime) {
                showBezel('forward');
            } else if (seekTime < currentTime) {
                showBezel('backward');
            }
        });
    }

    /**
     * Add event listener and track it for cleanup
     */
    addEventListener(target, event, handler, options) {
        target.addEventListener(event, handler, options);
        this.eventListeners.push({ target, event, handler, options });
    }

    /**
     * Cleanup all event listeners
     */
    destroy() {
        this._isDestroyed = true;

        // SPA navigation (e.g. FC portal route change) tears down without beforeunload —
        // this is the last chance to persist the position.
        if (this.mediaId && this.isSavePlayPositionEnabled() && this.player?.currentTime !== this.player?.duration) {
            this.saveCurrentPosition(true);
        }

        // Destroy analytics tracker (flushes pending data, removes its listeners)
        if (this.analyticsTracker) {
            this.analyticsTracker.destroy();
            this.analyticsTracker = null;
        }

        if (this.milestoneReporter) {
            this.milestoneReporter.destroy();
            this.milestoneReporter = null;
        }

        if (this.layerReporter) {
            this.layerReporter.destroy();
            this.layerReporter = null;
        }

        if (this._sharedWatchTracker) {
            this._sharedWatchTracker.destroy();
            this._sharedWatchTracker = null;
        }
        this._sharedWatchTrackerPromise = null;

        // Remove all tracked event listeners
        this.eventListeners.forEach(({ target, event, handler, options }) => {
            target.removeEventListener(event, handler, options);
        });
        this.eventListeners = [];

        // Remove beforeunload handler
        if (this.beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this.beforeUnloadHandler);
            this.beforeUnloadHandler = null;
        }

        // Release the shared modal gate (its document-level focusout listener
        // would otherwise leak if an overlay was still open).
        try {
            getPlayerModalGate(this.player)?.teardown();
        } catch (error) {
            console.error('FluentPlayer: modal gate teardown failed:', error);
        }

        // Clear all timeouts
        if (this.countdownTimeouts && this.countdownTimeouts.length) {
            this.countdownTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
            this.countdownTimeouts = [];
        }

        this.clearPendingResumeWork();

        // Destroy layers manager
        if (this.layersManager) {
            this.layersManager.destroy();
            this.layersManager = null;
        }

        if (this.contextMenuController) {
            this.contextMenuController.destroy();
            this.contextMenuController = null;
        }

        // Clear dynamic overlay repositioning intervals
        if (this._dynamicOverlayIntervals) {
            this._dynamicOverlayIntervals.forEach(intervalId => clearInterval(intervalId));
            this._dynamicOverlayIntervals.clear();
            this._dynamicOverlayIntervals = null;
        }

        // Clear Google Analytics tracked points
        if (this.gaTrackedPoints) {
            this.gaTrackedPoints.clear();
        }

    }

    init() {
        // Critical: must run synchronously for correct initial render
        this.applyBrandingStyles();
        this.applyCaptionStyles();
        this._initialPlaybackTarget = this.resolveInitialPlaybackTarget();
        this.setupHLSProvider();
        this.setupVideoErrorHandling();
        this.setupLoadingTransition();
        this.setupPlayerEvents();

        if (this.mediaId && this.isSavePlayPositionEnabled()) {
            this.setupSaveResume();
        }

        // Deferred: run after main thread is free to reduce TBT
        const deferredInit = () => {
            this.setupVideoEndBehavior();
            this.setupAutoplay();

            if (this.settings.layers?.length > 0) {
                this.initializeLayersManager();
            }

            if (this.settings.overlays?.length) {
                this.handleOverlays();
            }

            if (this.settings.email_capture?.enabled) {
                this.handleEmailCapture();
            }

            if (this.settings.cta?.enabled) {
                this.handleCTA();
            }

            if (this.settings.action_bar?.enabled) {
                this.handleActionBar();
            }

            if (this.mediaId) {
                this.setupAnalyticsTracking();
                this.setupMilestoneTracking();
            }

            this.setupGoogleAnalytics();
            this.setupTimestamps();

            if (this.settings?.show_language_switcher === true) {
                setTimeout(() => this.setupLanguageSwitcher(), CONSTANTS.UI_DELAY_MS);
            }

            this.setupPauseOtherVideos();

            // Mux Data analytics (lazy-loaded only when configured)
            if (this.settings?.mux_data?.env_key) {
                this.setupMuxData();
            }
        };

        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(deferredInit, { timeout: 300 });
        } else {
            setTimeout(deferredInit, 0);
        }

        this.setupPauseOtherVideos();

        // Lazy-load settings submenus on first gear open
        this.setupLazySettingsMenu();
        this.setupContextMenu();

        // Defer seek bezel until first user interaction with this player
        const initBezel = () => {
            this.player.removeEventListener('pointerdown', initBezel);
            this.player.removeEventListener('focusin', initBezel);
            this.setupSeekBezel();
        };
        this.player.addEventListener('pointerdown', initBezel, { once: true });
        this.player.addEventListener('focusin', initBezel, { once: true });
    }

    /**
     * Initialize layers manager
     */
    async initializeLayersManager() {
        if (this.layersManager) {
            this.layersManager.destroy();
        }

        const { default: LayersManager } = await import('./LayersManager.js');
        this.layersManager = new LayersManager(
            this.player,
            this.container,
            this.mediaId,
            this.settings,
            this
        );

        this.setupLayerTracking();
    }

    async setupLayerTracking() {
        const config = window.fluent_player?.crm_behavior;
        if (!this.mediaId || !this.layersManager || !config || !config.active) {
            return;
        }

        if (this.layerReporter) {
            this.layerReporter.destroy();
            this.layerReporter = null;
        }

        const armed = resolveArmedLayers(config, this.mediaId, this.settings?.layers || []);
        if (!armed) {
            return;
        }

        const { default: LayerReporter } = await import('./behavior/LayerReporter.js');
        if (!this.layersManager) return;
        this.layerReporter = new LayerReporter(this.layersManager, {
            mediaId: this.mediaId,
            nonce: config.nonce,
            armed,
            isLoggedIn: !!config.identity?.isLoggedIn,
            hasContact: !!config.identity?.hasContact,
            hasEmailCapture: mediaHasEmailCapture(this.settings),
        });
    }

    // ------------------------------------------------------------------------
    // PLAYER SETUP & CONFIGURATION
    // ------------------------------------------------------------------------

    setupContextMenu() {
        if (this.contextMenuController) {
            this.contextMenuController.destroy();
        }

        this.contextMenuController = new ContextMenuController({
            rootElement: this.container,
            getSurfaceFromTarget: (target) => this.getContextMenuSurfaceFromTarget(target),
            getContextMenuConfig: () => this.settings?.context_menu,
            buildPlaybackUrl: (_, options) => this.buildPlaybackUrl(options),
            canCopyPlaybackUrlAtTime: () => this.canCopyPlaybackUrlAtTime(),
            supportsLoop: () => !this.isLiveStream(),
            isLoopEnabled: () => this.isLoopEnabled(),
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
                && this.settings?.viewType !== 'audio'
                && !!this.player?.state?.canPictureInPicture
            ),
            isPictureInPictureActive: () => !!this.player?.state?.pictureInPicture,
            togglePictureInPicture: () => this.togglePictureInPicture()
        });

        this.contextMenuController.init();
    }

    getContextMenuSurfaceFromTarget(target) {
        const surface = this.container?.querySelector('.fluent-player-container');

        if (!surface || !target || !surface.contains(target)) {
            return null;
        }

        return surface;
    }

    canCopyPlaybackUrlAtTime() {
        return !this.isLiveStream() && Number.isFinite(this.player?.currentTime);
    }

    buildPlaybackUrl({ includeTime = false } = {}) {
        const playerRef = this.container?.dataset?.flpRef;
        if (!playerRef) {
            return '';
        }

        const shareUrl = typeof this.settings?.share_url === 'string' ? this.settings.share_url : '';

        return buildPlaybackTargetUrl({
            playerRef,
            currentUrl: shareUrl || null,
            time: includeTime ? Math.max(0, Math.floor(this.player?.currentTime || 0)) : null
        });
    }

    isLiveStream() {
        return String(this.settings?.streamType || '').toLowerCase().includes('live');
    }

    isLoopEnabled() {
        if (typeof this._loopOverride === 'boolean') {
            return this._loopOverride;
        }

        return this.settings?.video_end_option === 'loop';
    }

    setLoopEnabled(enabled) {
        this._loopOverride = !!enabled;
        this.player?.removeAttribute('loop');

        if (!enabled) {
            this.cancelAutoplay();
        }
    }

    getCaptionTracks() {
        if (this.settings?.styles?.captions?.enabled === false) {
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

    /**
     * Setup HLS.js provider for adaptive streaming support
     * Required for HLS playback on non-Safari browsers (Chrome, Firefox, Edge)
     */
    setupHLSProvider() {
        if (!this.player) return;

        const applyHLS = async (provider) => {
            if (provider && isHLSProvider(provider)) {
                const { default: HLS } = await import('hls.js');
                provider.library = HLS;

                // BunnyCDN Stream: forward the CDN directory token to every HLS request.
                // One token scoped to /{guid}/ covers the playlist, sub-playlists and
                // .ts segments, which are relative urls and inherit no query string.
                applyBunnyStreamToken(provider, this.settings?.bunny_token_query);

                // Mux DRM support (Widevine + FairPlay)
                const drmToken = this.settings?.drm?.mux_token;
                if (drmToken) {
                    provider.config = {
                        ...provider.config,
                        emeEnabled: true,
                        drmSystems: {
                            'com.widevine.alpha': {
                                licenseUrl: 'https://license.mux.com'
                            },
                            'com.apple.fps': {
                                licenseUrl: 'https://license.mux.com'
                            }
                        },
                        licenseXhrSetup: (xhr) => {
                            xhr.setRequestHeader('Authorization', 'Bearer ' + drmToken);
                        }
                    };
                }

            }
        };

        const applyYouTubeParams = (provider) => {
            if (!provider || provider.type !== 'youtube') return;
            // Honour Privacy-Enhanced Mode: toggles the youtube-nocookie.com host.
            // Must run here (provider-change) before Vidstack builds the embed URL.
            applyYouTubePrivacyMode(provider);
            const orig = provider.buildParams.bind(provider);
            provider.buildParams = () => {
                const params = orig();
                // Strip undefined values (e.g. cc_load_policy when not set)
                const clean = {};
                for (const key in params) {
                    if (params[key] !== undefined && params[key] !== null) {
                        clean[key] = params[key];
                    }
                }
                // rel=0: limit related videos to same channel; iv_load_policy=3: hide annotations;
                // origin= is required for the IFrame API postMessage channel to work.
                return { ...clean, rel: 0, iv_load_policy: 3, origin: window.location.origin };
            };

            // FC portal only: its timing can build the embed URL before this handler, omitting
            // origin so can-play never fires. Re-derive the src to rebuild through patched buildParams.
            const isFluentCommunity = window.fluent_player?.context === 'fluent-community';
            const built = isFluentCommunity && provider.src?.();
            const videoId = built && built.match(/\/embed\/([^?&/]+)/)?.[1];
            if (videoId) {
                provider.src.set('');
                provider.src.set(`${provider.getOrigin()}/embed/${videoId}`);
            }
        };

        const providerChangeHandler = async (event) => {
            const provider = event.detail;
            // applyYouTubeParams must run synchronously before any await, so it patches
            // buildParams before Vidstack's reactive effects call setup() → #watchSrc()
            applyYouTubeParams(provider);
            applyEmbedReferrerPolicy(provider);
            await applyHLS(provider);
        };

        this.addEventListener(this.player, 'provider-change', providerChangeHandler);

        // Fix: HLS quality switch can momentarily freeze the video frame while
        // audio continues. Kick the renderer without re-seeking (which would cause
        // hls.js to flush its buffer and re-download, creating a long pause).
        this.addEventListener(this.player, 'hls-level-switched', () => {
            const videoEl = this.player?.querySelector('video');
            if (!videoEl || videoEl.paused) return;

            const rate = videoEl.playbackRate;
            videoEl.playbackRate = rate || 1;
        });

        // Apply HLS to the current provider (for playlist support)
        const currentProvider = this.player.provider;
        if (currentProvider) {
            applyHLS(currentProvider);
            applyYouTubeParams(currentProvider);
            applyEmbedReferrerPolicy(currentProvider);
        }

    }

    /**
     * Setup video error handling for load failures
     * Shows user-friendly error message with retry option
     */
    setupVideoErrorHandling() {
        if (!this.player) return;

        const errorHandler = (event) => {
            const error = event.detail;
            // Use settings.src (always a plain string from PHP) for reliable URL detection.
            // this.player?.src may return a Vidstack MediaSrc object {src, type}, not a string.
            const settingsSrc = this.settings?.src || '';
            const isBunnyStorageStream = settingsSrc.includes('bunny/storage/stream');

            // BunnyCDN Stream HLS → MP4 fallback (custom pull-zone hostnames, not only b-cdn.net)
            const isBunnyHLS = this.settings?.provider === 'bunny' && settingsSrc.includes('.m3u8');

            const mp4Fallback = this.settings?.bunny?.mp4_urls?.[0];

            if (isBunnyHLS && mp4Fallback && !this.mp4FallbackAttempted) {
                this.mp4FallbackAttempted = true;
                // Re-sign rather than skip on an existing token: the stored mp4 url may
                // carry a stale token from selection time, which would 403.
                const mp4Url = appendBunnyTokenQuery(mp4Fallback, this.settings?.bunny_token_query);
                this.player.src = mp4Url;
                this.player.startLoading();
                return;
            }

            if (isBunnyStorageStream) {
                const delayMs = 2500;
                const timeoutId = setTimeout(() => {
                    const loader = this.container.querySelector('.fluent-player-loader');
                    if (loader) loader.classList.add('is-hidden');
                    this.showVideoError(error);
                }, delayMs);
                const onCanPlay = () => {
                    clearTimeout(timeoutId);
                    this.player.removeEventListener('canplay', onCanPlay);
                    this.player.removeEventListener('loadeddata', onLoadedData);
                };
                const onLoadedData = () => {
                    clearTimeout(timeoutId);
                    this.player.removeEventListener('canplay', onCanPlay);
                    this.player.removeEventListener('loadeddata', onLoadedData);
                };
                this.player.addEventListener('canplay', onCanPlay, { once: true });
                this.player.addEventListener('loadeddata', onLoadedData, { once: true });
                return;
            }

            console.error('FluentPlayer: Video load error:', error);
            const loader = this.container.querySelector('.fluent-player-loader');
            if (loader) loader.classList.add('is-hidden');
            this.showVideoError(error);
        };

        this.addEventListener(this.player, 'error', errorHandler);
    }

    /**
     * Show video error message with retry option
     */
    showVideoError(error) {
        // Remove existing error overlay if present
        const existingError = this.container.querySelector('.fluent-player-error-overlay');
        if (existingError) {
            existingError.remove();
        }

        // Get user-friendly error from centralized handler
        const errorInfo = getVideoError(error);

        // Create error overlay from handler
        const errorOverlay = createErrorOverlay(errorInfo);

        // Add retry handler
        const retryButton = errorOverlay.querySelector('.fluent-player-error-retry');
        const retryHandler = () => {
            errorOverlay.remove();

            // Show loader again
            const loader = this.container.querySelector('.fluent-player-loader');
            if (loader) {
                loader.classList.remove('is-hidden');
            }

            // Reload the video source
            if (this.player && this.settings?.src) {
                const currentSrc = this.player.src;
                this.player.src = '';
                setTimeout(() => {
                    this.player.src = currentSrc || this.settings.src;
                }, CONSTANTS.UI_DELAY_MS);
            }
        };

        this.addEventListener(retryButton, 'click', retryHandler);

        // Insert into container
        this.container.querySelector('.fluent-player-container').appendChild(errorOverlay);
    }

    setupAutoplay() {
        if (!this.player) return;

        // Only setup if autoplay is enabled in settings
        if (!this.settings.autoplay && !this.settings.mutedAutoplay) return;

        const providerChangeHandler = () => {
            setTimeout(() => {
                const playPromise = this.player?.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        if (!this.player.muted) {
                            this.player.muted = true;
                            this.player?.play().catch(e => {
                                console.error('FluentPlayer: Autoplay failed:', e);
                            });
                        }
                    });
                }
            }, CONSTANTS.AUTOPLAY_FINAL_DELAY_MS);
        };

        const canPlayHandler = () => {
            if (this.player?.paused) {
                this.player.muted = true;
                this.player.play().catch(e => {
                    console.error('FluentPlayer: Autoplay on can-play failed:', e);
                });
            }
        };

        this.addEventListener(this.player, 'provider-change', providerChangeHandler);
        this.addEventListener(this.player, 'can-play', canPlayHandler);
    }

    setupLoadingTransition() {
        const loader = this.container.querySelector('.fluent-player-loader');
        const loaderOverlay = loader?.querySelector('.fluent-player-loader-overlay');
        if (!loader) return;

        const loadStrategy = this.settings.loadStrategy === 'poster' ? 'play' : (this.settings.loadStrategy || 'visible');

        const hideLoader = () => {
            this.isLoading = false;
            loader.classList.add('is-hidden');
        };

        const showLoader = () => {
            this.isLoading = true;
            loader.classList.remove('is-hidden');
        };

        const hideSpinner = () => {
            if (loaderOverlay) {
                loaderOverlay.style.opacity = '0';
            }
        };

        const showSpinner = () => {
            if (loaderOverlay) {
                loaderOverlay.style.opacity = '1';
            }
        };

        // For load="play": Keep loader (poster) visible but hide spinner
        // This ensures the poster is visible for LCP optimization
        if (loadStrategy === 'play') {
            // Keep loader visible but hide spinner initially
            loader.classList.remove('is-hidden');
            hideSpinner();

            // Track if media has started loading
            let hasStartedLoading = false;

            // Show spinner when user clicks play and media starts loading
            const playHandler = () => {
                if (!hasStartedLoading) {
                    showSpinner();
                }
            };

            // Hide loader when ready to play
            const canPlayHandler = () => {
                hasStartedLoading = true;
                hideLoader();
            };

            // Show/hide spinner during buffering (after initial load)
            const waitingHandler = () => {
                if (hasStartedLoading) {
                    showSpinner();
                }
            };

            const playingHandler = () => {
                if (hasStartedLoading) {
                    hideSpinner();
                }
            };

            const pauseEndHandler = () => {
                if (hasStartedLoading) {
                    hideSpinner();
                }
            };

            this.addEventListener(this.player, 'play', playHandler, { once: true });
            this.addEventListener(this.player, 'can-play', canPlayHandler, { once: true });
            this.addEventListener(this.player, 'waiting', waitingHandler);
            this.addEventListener(this.player, 'playing', playingHandler);
            this.addEventListener(this.player, 'pause', pauseEndHandler);
            this.addEventListener(this.player, 'end', pauseEndHandler);

            // Already can-play by the time we attached (re-rendered/cached): run the
            // handler now so the loader doesn't stay up over a ready video.
            if (this.player?.hasAttribute('data-can-play')) {
                canPlayHandler();
            }

            return;
        }

        // For other strategies (eager, idle, visible): Show loader initially
        showLoader();

        const canPlayHandler = () => {
            hideLoader();
        };

        const loadedDataHandler = () => {
            if (this.isLoading) hideLoader();
        };

        this.addEventListener(this.player, 'can-play', canPlayHandler, { once: true });
        this.addEventListener(this.player, 'loadeddata', loadedDataHandler, { once: true });

        // The player can already be able to play by the time these one-time listeners
        // attach — e.g. a server-re-rendered player in a page-builder editor (Elementor/
        // Divi) that hydrates over already-loaded media, or a cached/instant source. The
        // can-play/loadeddata events already fired, so { once: true } handlers never run
        // and the loader stays up over a playing video (black frame + audio). Hide it now
        // if the player already reports it can play.
        if (this.player?.hasAttribute('data-can-play')) {
            hideLoader();
        }

        // Detect stuck autoplay: if autoplay + can-play but not playing after 3s
        if (this.player.hasAttribute('autoplay')) {
            const autoplayTimeout = setTimeout(() => {
                if (this.player?.hasAttribute('data-can-play')
                    && !this.player?.hasAttribute('data-playing')
                    && !this.player?.hasAttribute('data-started')) {
                    // Autoplay was blocked — remove autoplay so play button appears
                    this.player.removeAttribute('autoplay');
                    hideLoader();
                }
            }, 3000);

            // Clear timeout if playback starts normally
            this.addEventListener(this.player, 'playing', () => clearTimeout(autoplayTimeout), { once: true });
        }

        // Root cause of YouTube replay-buffering bug:
        // After ENDED + mid-playback seek, YouTube's buffer has two discontinuous ranges
        // (e.g. [0–5s] and [9:30s–end]). On replay Vidstack calls seekTo(0)+playVideo(),
        // YouTube plays the cached [0–5s] fine, then hits the gap, enters BUFFERING(3),
        // and never fires onStateChange(1) — a YouTube IFrame API bug specific to the
        // ENDED→replay transition. First play works because it starts from UNSTARTED(-1).
        //
        // Fix: when ended, silently send cueVideoById to YouTube behind the poster cover.
        // This resets YouTube's buffer and state to CUED(5) — equivalent to UNSTARTED.
        // Next replay starts clean so the gap bug never occurs.
        const cueYouTubeVideo = () => {
            const iframe = this.player.querySelector('iframe.vds-youtube');
            if (!iframe || !iframe.src) return;
            const videoId = iframe.src.split('/embed/')[1]?.split('?')[0];
            if (!videoId) return;
            iframe.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'cueVideoById', args: [videoId] }),
                '*'
            );
        };

        let waitingTimer = null;
        const clearWaitingTimer = () => {
            if (waitingTimer) { clearTimeout(waitingTimer); waitingTimer = null; }
        };
        const setVdsSpinner = (visible) => {
            const el = this.player.querySelector('.vds-buffering-indicator');
            if (el) el.style.display = visible ? '' : 'none';
        };

        this.addEventListener(this.player, 'waiting', () => {
            if (!this.player.hasAttribute('data-started')) {
                showLoader();
                return;
            }
            clearWaitingTimer();
            // Fallback: if still stuck after 5s (cueVideoById didn't prevent it),
            // hide the spinner so the user doesn't see an infinite loader.
            waitingTimer = setTimeout(() => {
                waitingTimer = null;
                if (this.player.hasAttribute('data-waiting') && !this.player.hasAttribute('data-playing')) {
                    setVdsSpinner(false);
                }
            }, 5000);
        });
        this.addEventListener(this.player, 'playing', () => {
            hideLoader();
            clearWaitingTimer();
            setVdsSpinner(true);
        });
        this.addEventListener(this.player, 'seeked', () => {
            hideLoader();
            clearWaitingTimer();
            setVdsSpinner(true);
        });
        this.addEventListener(this.player, 'pause', hideLoader);
        this.addEventListener(this.player, 'end', () => {
            hideLoader();
            clearWaitingTimer();
            // Silently re-cue YouTube so next replay starts from a clean CUED(5) state.
            // The poster covers the iframe during this, so the user sees nothing.
            cueYouTubeVideo();
        });
    }

    handleOverlays() {
        // Cache the overlay elements - re-query only when overlays change
        let cachedOverlaysEl = this.container.querySelectorAll('.fp-media-custom-overlay:not(.fp-media-logo-overlay)');

        // Track repositioning intervals for dynamic overlays
        const dynamicIntervals = new Map();
        let lastSeekTime = this.player?.currentTime || 0;

        const getRandomPosition = (el) => {
            const container = this.container.querySelector('media-player') || this.container;
            const containerRect = container.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            const maxTop = Math.max(0, Math.floor(((containerRect.height - elRect.height) / containerRect.height) * 100));
            const maxLeft = Math.max(0, Math.floor(((containerRect.width - elRect.width) / containerRect.width) * 100));
            return {
                top: Math.floor(Math.random() * (maxTop + 1)),
                left: Math.floor(Math.random() * (maxLeft + 1)),
            };
        };

        const setPosition = (el, top, left) => {
            el.style.top = top + '%';
            el.style.left = left + '%';
            el.style.right = 'auto';
            el.style.bottom = 'auto';
        };

        // Set initial random position for dynamic overlays (before playback starts)
        cachedOverlaysEl.forEach((el) => {
            if (el.classList.contains('position-dynamic')) {
                const pos = getRandomPosition(el);
                setPosition(el, pos.top, pos.left);
            }
        });

        const applyRandomPosition = (el, animation) => {
            if (this.player?.paused) return;
            const { top, left } = getRandomPosition(el);

            if (animation === 'fade') {
                el.style.transition = 'opacity 0.5s ease';
                el.style.opacity = '0';
                setTimeout(() => {
                    setPosition(el, top, left);
                    el.style.opacity = '1';
                }, 500);
            } else if (animation === 'instant') {
                el.style.transition = 'none';
                setPosition(el, top, left);
            } else {
                // slide (default)
                el.style.transition = 'top 1.5s ease, left 1.5s ease';
                setPosition(el, top, left);
            }
        };

        const startDynamicRepositioning = (el, index, intervalSec, animation) => {
            if (dynamicIntervals.has(index)) return;
            applyRandomPosition(el, animation);
            const ms = (intervalSec || 10) * 1000;
            const intervalId = setInterval(() => applyRandomPosition(el, animation), ms);
            dynamicIntervals.set(index, intervalId);
        };

        const restartDynamicRepositioning = (el, index, intervalSec, animation) => {
            stopDynamicRepositioning(el, index);
            startDynamicRepositioning(el, index, intervalSec, animation);
        };

        const stopDynamicRepositioning = (el, index) => {
            const intervalId = dynamicIntervals.get(index);
            if (intervalId) {
                clearInterval(intervalId);
                dynamicIntervals.delete(index);
            }
            el.style.transition = '';
        };

        const timeUpdateHandler = throttle(() => {
            if (cachedOverlaysEl.length) {
                const currentTime = this.player?.currentTime;
                if (typeof currentTime !== 'number' || !this.settings.overlays) return;

                this.settings.overlays.forEach((overlay, index) => {
                    const overlayEl = cachedOverlaysEl[index];
                    if (!overlayEl) return;
                    const startTime = overlay.displayTime || 0;
                    const endTime = startTime + (overlay.duration || 5);
                    const isActive = currentTime >= startTime && currentTime <= endTime;
                    overlayEl.classList.toggle('active', isActive);

                    if (overlay.dynamic_position) {
                        const interval = overlay.reposition_interval || 10;
                        const animation = overlay.reposition_animation || 'fade';
                        if (isActive) {
                            startDynamicRepositioning(overlayEl, index, interval, animation);
                        } else {
                            stopDynamicRepositioning(overlayEl, index);
                        }
                    }
                });
            }
        }, CONSTANTS.TIME_UPDATE_THROTTLE_MS);

        // On seek, reposition active dynamic overlays if seek distance >= interval
        const seekHandler = () => {
            const currentTime = this.player?.currentTime;
            if (typeof currentTime !== 'number' || !this.settings.overlays) return;
            const seekDiff = Math.abs(currentTime - lastSeekTime);
            lastSeekTime = currentTime;

            this.settings.overlays.forEach((overlay, index) => {
                const overlayEl = cachedOverlaysEl[index];
                if (!overlayEl || !overlay.dynamic_position) return;
                const interval = overlay.reposition_interval || 10;
                const animation = overlay.reposition_animation || 'fade';
                if (seekDiff >= interval && overlayEl.classList.contains('active')) {
                    restartDynamicRepositioning(overlayEl, index, interval, animation);
                }
            });
        };

        this.addEventListener(this.player, 'time-update', timeUpdateHandler);
        this.addEventListener(this.player, 'seeked', seekHandler);

        // Store cleanup reference for destroy()
        this._dynamicOverlayIntervals = dynamicIntervals;
    }

    // ------------------------------------------------------------------------
    // SAVE & RESUME FUNCTIONALITY
    // ------------------------------------------------------------------------

    isSavePlayPositionEnabled() {
        if (!window.fluent_player?.has_pro) return false;
        if (this.isLiveStream()) return false;
        const settings = this.settings || {};
        if (Object.prototype.hasOwnProperty.call(settings, 'save_play_position')) {
            return !!settings.save_play_position;
        }
        const behaviors = settings.behaviors;
        if (behaviors && Object.prototype.hasOwnProperty.call(behaviors, 'save_play_position')) {
            return !!behaviors.save_play_position;
        }
        return !!window.fluent_player?.resume_playback;
    }

    clearPendingResumeWork() {
        if (this._resumeRetryTimeout) {
            clearTimeout(this._resumeRetryTimeout);
            this._resumeRetryTimeout = null;
        }
        if (this._resumeFrame) {
            cancelAnimationFrame(this._resumeFrame);
            this._resumeFrame = null;
        }
    }

    abandonPendingResume() {
        this.clearPendingResumeWork();
        this._pendingResumeTime = null;
        this._resumeVerifyAttempts = 0;
    }

    finalizePendingResume() {
        if (this._pendingResumeTime === null || !this.player) return false;

        const currentTime = this.player.currentTime;
        if (
            typeof currentTime !== 'number'
            || Math.abs(currentTime - this._pendingResumeTime) > CONSTANTS.RESUME_TIME_TOLERANCE_SECONDS
        ) {
            return false;
        }

        if (this.settings?.provider === 'youtube' && this._pendingResumeTime > 0) {
            // A successful resume seek should reveal the actual video frame.
            // On YouTube, programmatic seeks do not mark the player as "started",
            // so the poster can remain on top unless we promote that visual state.
            this.player.setAttribute('data-started', '');
            this.player.removeAttribute('data-ended');
        }
        this.clearPendingResumeWork();
        this._pendingResumeTime = null;
        this._resumeVerifyAttempts = 0;
        return true;
    }

    queueResumeSeek() {
        if (this._pendingResumeTime === null || !this.player || this._resumeFrame) return;

        this._resumeFrame = requestAnimationFrame(() => {
            this._resumeFrame = requestAnimationFrame(() => {
                this._resumeFrame = null;

                if (this._pendingResumeTime === null || !this.player || this._isDestroyed) return;

                const remote = this.player.remoteControl;
                if (remote?.seeking && remote?.seek) {
                    // Match Vidstack's normal seek flow so providers such as YouTube
                    // behave like a real user-driven seek, not just a time assignment.
                    remote.seeking(this._pendingResumeTime);
                    remote.seek(this._pendingResumeTime);
                } else {
                    this.player.currentTime = this._pendingResumeTime;
                }
                this.verifyPendingResume();
            });
        });
    }

    verifyPendingResume() {
        if (this._pendingResumeTime === null || !this.player) return;

        if (this.finalizePendingResume()) {
            return;
        }

        if (this._resumeVerifyAttempts >= CONSTANTS.RESUME_MAX_ATTEMPTS) {
            this.abandonPendingResume();
            return;
        }

        if (this._resumeRetryTimeout) {
            clearTimeout(this._resumeRetryTimeout);
        }

        this._resumeRetryTimeout = setTimeout(() => {
            // Some providers report seekability before the visual frame is updated.
            // Re-verify and retry a few times before giving up on resume restore.
            this._resumeRetryTimeout = null;
            if (this._pendingResumeTime === null || !this.player || this._isDestroyed) return;
            if (this.finalizePendingResume()) return;
            this._resumeVerifyAttempts++;
            this.queueResumeSeek();
        }, CONSTANTS.RESUME_VERIFY_DELAY_MS);
    }

    setupPlayerEvents() {
        const canPlayHandler = () => {
            if (!this.consumeInitialPlaybackTime() && this.isSavePlayPositionEnabled()) {
                this.loadSavedPosition();
            }

            // Prevent YouTube iframe from capturing tab focus.
            // `inert` makes the iframe and ALL its descendants non-focusable
            // and non-interactive. Vidstack handles all interaction via its own
            // controls layer and the YouTube postMessage API.
            const iframe = this.player?.querySelector('media-provider iframe');
            if (iframe && !iframe.hasAttribute('inert')) {
                iframe.setAttribute('inert', '');
                iframe.setAttribute('tabindex', '-1');
            }
        };

        this.addEventListener(this.player, 'can-play', canPlayHandler);

        // Auto-mute when volume slider reaches near-zero so the mute icon shows
        this.addEventListener(this.player, 'volume-change', () => {
            if (!this.player) return;
            if (this.player.volume <= 0.01 && !this.player.muted) {
                this.player.muted = true;
            }
        });
    }

    setupSaveResume() {
        const pauseHandler = () => {
            // Save position when user pauses the video
            if (this.player?.currentTime !== this.player?.duration) {
                this.saveCurrentPosition(true);
            }
        };

        const endedHandler = () => {
            // Clear saved position when video ends
            if (this.player?.currentTime === this.player?.duration) {
                this.clearSavedPosition();
            }
        };

        // Save position periodically during playback (throttled by SAVE_THROTTLE_MS)
        const timeUpdateHandler = () => {
            if (this.player?.currentTime !== this.player?.duration) {
                this.saveCurrentPosition();
            }
        };

        // Save position when user leaves the page
        this.beforeUnloadHandler = () => {
            if (this.player?.currentTime !== this.player?.duration) {
                this.saveCurrentPosition(true);
            }
        };

        // Tab switch / mobile background — beforeunload does not fire in an SPA portal
        const visibilityHandler = () => {
            if (document.visibilityState === 'hidden' && this.player?.currentTime !== this.player?.duration) {
                this.saveCurrentPosition(true);
            }
        };

        this.addEventListener(this.player, 'pause', pauseHandler);
        this.addEventListener(this.player, 'ended', endedHandler);
        this.addEventListener(this.player, 'time-update', timeUpdateHandler);
        this.addEventListener(document, 'visibilitychange', visibilityHandler);
        window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }

    // ------------------------------------------------------------------------
    // UTILITY METHODS
    // ------------------------------------------------------------------------

    getAjaxUrl() {
        return _getAjaxUrl();
    }

    getNonce() {
        return _getNonce();
    }

    saveCurrentPosition(force = false) {
        const currentTime = this.player?.currentTime;

        // Don't save if near the beginning or end
        if (!this.mediaId || typeof currentTime !== 'number' || !isFinite(currentTime) || currentTime < CONSTANTS.MIN_SAVE_TIME_SECONDS) {
            return;
        }

        // Throttle periodic saves; user/teardown events (pause, unload, hidden, destroy) always write
        if (!force && this.lastSaveTime && Date.now() - this.lastSaveTime < CONSTANTS.SAVE_THROTTLE_MS) {
            return;
        }

        this.lastSaveTime = Date.now();

        const storage = window.FluentBrowserStorage;
        if (storage) {
            const duration = this.player?.duration || 0;
            // If >= 95% watched, clear position so next play starts from beginning
            if (duration > 0 && currentTime / duration >= 0.95) {
                storage.removePosition(this.mediaId);
            } else {
                storage.savePosition(this.mediaId, currentTime, duration);
            }
        }
    }

    loadSavedPosition() {
        if (!this.mediaId) return;

        const storage = window.FluentBrowserStorage;
        if (!storage) return;

        const data = storage.getPosition(this.mediaId);
        if (!data || data.position <= 0 || !this.player) return;

        const duration = data.duration || 0;
        // If watched >= 95%, start from beginning (user likely wants to rewatch)
        if (duration > 0 && data.position / duration >= 0.95) {
            storage.removePosition(this.mediaId);
            return;
        }

        if (!(duration > 0 && data.position < duration)) return;

        this.applyPendingResumeTime(data.position);
    }

    resolveInitialPlaybackTarget() {
        const target = getUrlPlaybackTarget();
        const containerRef = this.container?.dataset?.flpRef;
        const hasExplicitPlayerRef = !!target?.playerRef;

        if (!target) {
            // No URL playback target on the page → honor a shortcode `start` offset
            // (settings.startTime). URL deep-links always take priority over this.
            return resolveShortcodeStartTarget(this.settings, { isLiveStream: this.isLiveStream() });
        }

        if (hasExplicitPlayerRef && !matchesUrlPlaybackRef(target.playerRef, containerRef)) {
            return null;
        }

        if (!hasExplicitPlayerRef && !this.isImplicitDedicatedPageTarget()) {
            return null;
        }

        scrollPlaybackTargetIntoView(this.container, containerRef || target.playerRef || 'dedicated-single-player');

        return target;
    }

    isImplicitDedicatedPageTarget() {
        const playerCount = document.querySelectorAll('.fluent-player').length;
        if (playerCount !== 1) {
            return false;
        }

        return !!document.querySelector('.fluent-player-media-page, .fluent-player-dedicated-page');
    }

    isLiveStream() {
        return String(this.settings?.streamType || '').toLowerCase().includes('live');
    }

    consumeInitialPlaybackTime() {
        const target = this._initialPlaybackTarget;

        if (!target) {
            return false;
        }

        this._initialPlaybackTarget = null;

        if (typeof target.time !== 'number' || this.isLiveStream()) {
            return false;
        }

        return this.applyPendingResumeTime(target.time);
    }

    applyPendingResumeTime(targetTime) {
        if (!this.player || typeof targetTime !== 'number' || targetTime < 0) {
            return false;
        }

        if (
            this._pendingResumeTime !== null
            && Math.abs(this._pendingResumeTime - targetTime) <= CONSTANTS.RESUME_TIME_TOLERANCE_SECONDS
        ) {
            if ((this.player.state?.seekableEnd ?? 0) > 0) {
                this.queueResumeSeek();
            }
            return true;
        }

        this._pendingResumeTime = targetTime;
        this._resumeVerifyAttempts = 0;

        if ((this.player.state?.seekableEnd ?? 0) > 0) {
            this.queueResumeSeek();
            return true;
        }

        const seekedHandler = () => {
            this.finalizePendingResume();
        };

        const playHandler = () => {
            if (!this.finalizePendingResume()) {
                this.abandonPendingResume();
            }
        };

        const progressHandler = () => {
            if (this._pendingResumeTime !== null && (this.player.state?.seekableEnd ?? 0) > 0) {
                this.queueResumeSeek();
            }
        };

        this.addEventListener(this.player, 'seeked', seekedHandler, { once: true });
        this.addEventListener(this.player, 'play', playHandler, { once: true });
        this.addEventListener(this.player, 'progress', progressHandler);

        return true;
    }

    clearSavedPosition() {
        if (!this.mediaId) return;

        const storage = window.FluentBrowserStorage;
        if (storage) {
            storage.removePosition(this.mediaId);
        }
    }

    handleEmailCapture() {
        const emailCaptureEl = this.container.querySelector('.media-email-capture-overlay');
        if (!emailCaptureEl) return;

        // Show email capture overlay at specified percentage
        const percentage = this.settings.email_capture?.percentage || 0;
        if (percentage > 0) {
            const timeUpdateHandler = throttle(() => {
                const currentTime = this.player?.currentTime;
                const duration = this.player?.duration;

                if (typeof duration === 'number' && duration > 0 && typeof currentTime === 'number') {
                    const currentPercentage = (currentTime / duration) * 100;
                    if (currentPercentage >= percentage && !this.emailCaptureShown && this.shouldShowEmailCapture()) {
                        this.emailCapturePercentageTime = (percentage / 100) * duration;
                        this.showEmailCapture(emailCaptureEl);
                    }
                }
            }, CONSTANTS.TIME_UPDATE_THROTTLE_MS);

            this.addEventListener(this.player, 'time-update', timeUpdateHandler);
        } else {
            const playHandler = () => {
                if (!this.emailCaptureShown && this.shouldShowEmailCapture()) {
                    this.emailCapturePercentageTime = 0;
                    this.showEmailCapture(emailCaptureEl);
                }
            };

            this.addEventListener(this.player, 'play', playHandler);
        }

        // Handle skip button
        const skipButton = emailCaptureEl.querySelector('.email-capture-skip');
        if (skipButton) {
            const skipHandler = () => {
                this.hideEmailCapture(emailCaptureEl);
            };
            this.addEventListener(skipButton, 'click', skipHandler);
        }

        // Handle form submission
        const emailInput = emailCaptureEl.querySelector('.email-capture-input');
        const submitButton = emailCaptureEl.querySelector('.email-capture-button');

        if (emailInput && submitButton) {
            const inputHandler = () => {
                emailInput.value.trim();
                emailInput.classList.remove('error');
                this.hideMessage(emailCaptureEl);
            };

            const submitHandler = () => {
                this.handleEmailSubmit(emailInput, emailCaptureEl);
            };

            const keypressHandler = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleEmailSubmit(emailInput, emailCaptureEl);
                }
            };

            this.addEventListener(emailInput, 'input', inputHandler);
            this.addEventListener(submitButton, 'click', submitHandler);
            this.addEventListener(emailInput, 'keypress', keypressHandler);
        }

        // Prevent keyboard shortcuts from controlling the player when overlay is active
        const keydownHandler = (e) => {
            if (!emailCaptureEl.classList.contains('active')) return;

            // Handle Escape key (only if skip is allowed)
            if (e.key === 'Escape') {
                const allowSkip = emailCaptureEl.getAttribute('data-allow-skip') !== '0';
                if (allowSkip) {
                    e.preventDefault();
                    this.hideEmailCapture(emailCaptureEl);
                }
                return;
            }

            // Prevent space bar from playing/pausing the video
            if (e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        this.addEventListener(document, 'keydown', keydownHandler);
    }

    // Helper method to show email capture overlay
    showEmailCapture(emailCaptureEl) {
        emailCaptureEl.classList.add('active');
        this.emailCaptureResumeTime = this.player?.currentTime ?? this.emailCapturePercentageTime;
        this.player?.pause();
        this.emailCaptureShown = true;

        // The overlay owns the keyboard: disable the player's Vidstack shortcuts,
        // move focus into the form, and hold it there while open. Shared with the
        // blocking layers managed by LayersManager — last one out re-enables.
        getPlayerModalGate(this.player)?.open(emailCaptureEl, { focusDelay: CONSTANTS.UI_DELAY_MS });

        this.disablePlayerControls();
    }

    // Helper method to hide email capture overlay
    hideEmailCapture(emailCaptureEl) {
        emailCaptureEl.classList.remove('active');
        this.emailCaptureShown = true;
        getPlayerModalGate(this.player)?.close(emailCaptureEl);

        this.enablePlayerControls();

        if (this.emailCaptureResumeTime !== undefined) {
            this.player.currentTime = this.emailCaptureResumeTime;
        }
        this.player.play();
    }

    // Disable player controls while overlay is active
    disablePlayerControls() {
        if (this.preventPlayHandler) {
            this.player.removeEventListener('play', this.preventPlayHandler);
        }
        if (this.preventSeekHandler) {
            this.player.removeEventListener('seeking', this.preventSeekHandler, true);
        }
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }

        disablePlayerControlsDOM(this.player);

        // Add an event listener to prevent play/pause via API
        this.preventPlayHandler = () => {
            // Check if either overlay is active and not completed
            if (
                (this.emailCaptureShown && !this.emailSubmitted) ||
                (this.ctaShown && !this.ctaCompleted)
            ) {
                this.player?.pause();
                return false;
            }
            return true;
        };

        // Add event listener to prevent seeking
        this.preventSeekHandler = (e) => {
            // Check if either overlay is active
            if (
                (this.emailCaptureShown && !this.emailSubmitted) ||
                (this.ctaShown && !this.ctaCompleted)
            ) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            return true;
        };

        // Add the event listeners (use tracking wrapper for proper cleanup on destroy)
        this.addEventListener(this.player, 'play', this.preventPlayHandler);
        this.addEventListener(this.player, 'seeking', this.preventSeekHandler, true);

        // Also disable keyboard shortcuts for seeking
        this.keydownHandler = (e) => {
            // Prevent arrow keys, space bar, etc.
            if (['ArrowLeft', 'ArrowRight', ' ', 'Space'].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        this.addEventListener(document, 'keydown', this.keydownHandler);
    }

    // Re-enable player controls after overlay is closed
    enablePlayerControls() {
        enablePlayerControlsDOM(this.player);

        // Remove all the event handlers we added
        if (this.preventPlayHandler) {
            this.player.removeEventListener('play', this.preventPlayHandler);
        }

        if (this.preventSeekHandler) {
            this.player.removeEventListener('seeking', this.preventSeekHandler, true);
        }

        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
    }

    // Validate an email address
    async handleEmailSubmit(emailInput, emailCaptureEl, data = null, onComplete = null) {
        return submitEmailCapture({
            emailInput,
            messageTarget: emailCaptureEl,
            ajaxUrl: this.getAjaxUrl(),
            showMessage: (target, message, type, loader) => this.showMessage(target, message, type, loader),
            resolveRequestData: (submitButton) => ({
                media_id: submitButton?.dataset.mediaId || this.mediaId,
                preset_slug: submitButton?.dataset.presetSlug || this.settings.preset_slug,
                video_time: this.player.currentTime,
                type: submitButton?.dataset.type || data?.type || 'preset',
                nonce: submitButton?.dataset.nonce || window.fluent_player?.nonce || '',
                ...data,
            }),
            onSuccess: () => {
                this.emailSubmitted = true;
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

    // Helper method to show messages
    showMessage(emailCaptureEl, message, type = 'info', showLoader = false) {
        const messageEl = emailCaptureEl.querySelector('.email-capture-message');
        if (!messageEl) return;

        // Store the currently focused element
        const focusedElement = document.activeElement;
        const wasEmailInputFocused = focusedElement && focusedElement.classList.contains('email-capture-input');

        // Set message content with loader if needed (use DOM APIs to avoid innerHTML with dynamic message)
        messageEl.textContent = '';
        if (showLoader) {
            const loader = document.createElement('span');
            loader.className = 'email-capture-loader';
            messageEl.appendChild(loader);
        }
        messageEl.appendChild(document.createTextNode(message));

        // Remove all existing classes except the base class
        messageEl.className = 'email-capture-message';

        // Add type-specific class
        messageEl.classList.add(`email-capture-message--${type}`);

        // Show the message
        messageEl.style.display = 'block';

        // If the email input was focused, restore focus
        if (wasEmailInputFocused) {
            const emailInput = emailCaptureEl.querySelector('.email-capture-input');
            if (emailInput) {
                setTimeout(() => emailInput.focus({ preventScroll: true }), CONSTANTS.UI_DELAY_MS);
            }
        }
    }

    // Helper method to hide message
    hideMessage(emailCaptureEl) {
        const messageEl = emailCaptureEl.querySelector('.email-capture-message');
        if (!messageEl) return;

        // Store the currently focused element
        const focusedElement = document.activeElement;
        const wasEmailInputFocused = focusedElement && focusedElement.classList.contains('email-capture-input');

        // Hide the message
        messageEl.style.display = 'none';

        // If the email input was focused, restore focus
        if (wasEmailInputFocused) {
            const emailInput = emailCaptureEl.querySelector('.email-capture-input');
            if (emailInput) {
                setTimeout(() => emailInput.focus({ preventScroll: true }), CONSTANTS.UI_DELAY_MS);
            }
        }
    }


    getSharedWatchTracker() {
        if (!this._sharedWatchTrackerPromise) {
            this._sharedWatchTrackerPromise = import('./MediaWatchTracker.js').then(
                ({ default: MediaWatchTracker }) => {
                    this._sharedWatchTracker = new MediaWatchTracker(this.player, {
                        completionThreshold: 100,
                        mediaId: this.mediaId,
                        segmentUpdateInterVal: 5,
                    });
                    return this._sharedWatchTracker;
                }
            );
        }
        return this._sharedWatchTrackerPromise;
    }

    async setupAnalyticsTracking() {
        // No nonce → the tracking endpoint would reject every beacon (403); don't attach.
        if (this._isDestroyed || !this.mediaId || !this.analyticsNonce || !this.isAnalyticsEnabled() || this.isExternallyTracked()) {
            return;
        }

        const { default: AnalyticsTracker } = await import('./AnalyticsTracker.js');
        // The player may have been destroyed while the chunk was loading (e.g. a
        // FluentCommunity SPA navigation). Bail before attaching a tracker whose
        // document/window listeners would then never be torn down.
        if (this._isDestroyed) {
            return;
        }
        this.analyticsTracker = new AnalyticsTracker(this.player, this.mediaId, {
            nonce: this.analyticsNonce,
            watchTracker: await this.getSharedWatchTracker(),
        });
    }

    async setupMilestoneTracking() {
        const config = window.fluent_player?.crm_behavior;
        if (!this.mediaId || !config || !config.active) {
            return;
        }

        const armed = resolveArmedMilestones(config, this.mediaId);
        if (!armed) {
            return;
        }

        const { default: MilestoneReporter } = await import('./behavior/MilestoneReporter.js');
        const tracker = await this.getSharedWatchTracker();
        // teardown may have run during the awaits — don't attach to a dead player
        if (this._isDestroyed || !tracker) {
            return;
        }
        this.milestoneReporter = new MilestoneReporter(tracker, {
            mediaId: this.mediaId,
            nonce: config.nonce,
            armed,
            isLoggedIn: !!config.identity?.isLoggedIn,
            hasContact: !!config.identity?.hasContact,
            hasEmailCapture: mediaHasEmailCapture(this.settings),
        });
    }

    // check if analytics is enabled
    isAnalyticsEnabled() {
        return !!window.fluent_player?.analytics?.enabled && window.fluent_player?.has_pro;
    }

    // This media's watch analytics are recorded by another flow (e.g. an LMS
    // progression tracker), so skip the beacon to avoid double-counting the
    // same watch as two visits.
    isExternallyTracked() {
        const ids = window.fluent_player?.external_tracked_media;
        return Array.isArray(ids) && ids.some((id) => String(id) === String(this.mediaId));
    }

    /**
     * Setup Mux Data playback quality analytics
     * Dynamically imports mux-embed only when configured
     */
    async setupMuxData() {
        const videoEl = this.player?.querySelector('video');
        if (!videoEl) return;

        let mux;
        try {
            ({ default: mux } = await import('mux-embed'));
        } catch (e) {
            // Module unavailable (CSP, ad-blocker, network). Expected failure mode — debug only.
            console.debug('FluentPlayer: mux-embed unavailable, skipping Mux Data.', e);
            return;
        }

        const muxData = this.settings.mux_data || {};
        try {
            mux.monitor(videoEl, {
                data: {
                    // Extensible via the PHP `fluent_player/mux_data` filter.
                    ...muxData,
                    // Per-instance fields take precedence over any server overrides.
                    player_name: 'Fluent Player',
                    player_init_time: this._playerInitTime,
                    video_id: String(this.mediaId || ''),
                    video_title: this.settings.title || '',
                    video_duration: this.settings.duration || 0,
                    video_source_url: this.settings.src || videoEl.currentSrc || '',
                    video_cdn: 'mux',
                }
            });
        } catch (e) {
            // Module loaded but monitor() rejected. Likely a programming/config error — surface it.
            console.warn('FluentPlayer: mux.monitor() failed; Mux Data will not report for this player.', e);
        }
    }

    // Add Google Analytics tracking to the player
    setupGoogleAnalytics() {
        const ga = window.fluent_player?.google_analytics;
        const enabled = ga?.enabled === true || ga?.enabled === 'true';
        const useExistingTag = ga?.use_existing_tag === true || ga?.use_existing_tag === 'true';
        // Only proceed if Google Analytics is enabled and pro is active
        // (wp_localize_script sends booleans; REST may use strings in some paths)
        if (this._isDestroyed || !enabled || !window.fluent_player?.has_pro) {
            return;
        }

        if (this._gaListenersAttached) {
            return;
        }
        if (this._gaSetupRequested) {
            return;
        }

        this._gaSetupRequested = true;
        waitForGoogleAnalytics({
            pollIntervalMs: CONSTANTS.GA_POLL_INTERVAL_MS,
            pollMaxMs: CONSTANTS.GA_POLL_MAX_MS,
        }).then(({ ready }) => {
            this._gaSetupRequested = false;

            if (this._isDestroyed) {
                return;
            }

            if (ready) {
                this.attachGoogleAnalyticsListeners();
            } else {
                this.warnGoogleAnalyticsMissing(useExistingTag);
            }
        });
    }

    warnGoogleAnalyticsMissing(useExistingTag) {
        if (!shouldWarnMissingGoogleAnalytics()) {
            return;
        }

        if (useExistingTag) {
            console.warn(
                'Fluent Player: Google Analytics gtag was not found after waiting. Make sure your site-level GA4 tag is loaded before the player initializes.'
            );
        } else {
            console.warn('Fluent Player: Google Analytics gtag was not found after waiting. Check the GA settings and confirm the frontend GA script is enqueued.');
        }
    }

    attachGoogleAnalyticsListeners() {
        if (this._isDestroyed || this._gaListenersAttached || !this.player) {
            return;
        }
        this._gaListenersAttached = true;

        const playHandler = () => {
            this.trackGoogleAnalyticsEvent('play');
        };

        const pauseHandler = () => {
            this.trackGoogleAnalyticsEvent('pause');
        };

        const endedHandler = () => {
            this.trackGoogleAnalyticsEvent('ended');
        };

        const progressPoints = [25, 50, 75, 100];
        const timeUpdateHandler = throttle(() => {
            const duration = this.player.duration;
            if (!duration) return;

            const currentTime = this.player.currentTime;
            const percentWatched = Math.floor((currentTime / duration) * 100);

            progressPoints.forEach(point => {
                if (percentWatched >= point && !this.gaTrackedPoints.has(point)) {
                    this.gaTrackedPoints.add(point);
                    this.trackGoogleAnalyticsEvent(`progress_${point}`);
                }
            });
        }, CONSTANTS.TIME_UPDATE_THROTTLE_MS);

        this.addEventListener(this.player, 'play', playHandler);
        this.addEventListener(this.player, 'pause', pauseHandler);
        this.addEventListener(this.player, 'ended', endedHandler);
        this.addEventListener(this.player, 'time-update', timeUpdateHandler);
    }

    // Track events to Google Analytics
    trackGoogleAnalyticsEvent(action) {
        if (this._isDestroyed || !window.gtag || !this.mediaId) return false;

        const videoData = this.getVideoData();

        window.gtag('event', action, {
            'event_category': 'Fluent Player',
            'event_label': `#${this.mediaId} - ${this.settings?.title || $t('Untitled')}`,
            'value': Math.round(this.player.currentTime || 0),
            'video_id': this.mediaId,
            'video_title': this.settings?.title || $t('Untitled'),
            'video_current_time': Math.round(this.player.currentTime || 0),
            'video_duration': this.player.duration ? Math.round(this.player.duration) : null,
            'video_provider': videoData.provider,
            'video_url': videoData.url
        });
        return true;
    }

    // Get comprehensive video data
    getVideoData() {
        const provider = this.getVideoProvider();
        const url = this.getVideoUrl();

        return {
            provider: provider,
            url: url
        };
    }

    // Determine video provider
    getVideoProvider() {
        if (this.settings?.src) {
            const src = this.settings.src.toLowerCase();
            if (src.includes('youtube.com') || src.includes('youtu.be')) {
                return 'youtube';
            } else if (src.includes('vimeo.com')) {
                return 'vimeo';
            } else if (src.includes('bunny.net') || src.includes('bunnycdn.com')) {
                return 'bunny';
            } else if (src.includes('amazonaws.com') || src.includes('s3.')) {
                return 'aws';
            } else if (src.includes('cloudflare.com') || src.includes('stream.')) {
                return 'cloudflare';
            }
        }
        return 'html5';
    }

    // Get video URL
    getVideoUrl() {
        if (this.settings?.src) {
            return this.settings.src;
        }
        return null;
    }

    getConditionState(extraState = {}) {
        return mergeConditionStates(this.conditionState, extraState);
    }

    matchesConditions(conditionals, extraState = {}) {
        if (!hasEnabledConditionals(conditionals)) {
            return true;
        }

        return evaluateConditionals(conditionals, this.getConditionState(extraState));
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

    shouldShowEmailCapture() {
        return this.matchesConditions(this.settings?.email_capture?.conditionals, this.getEmailSubmittedConditionState());
    }

    shouldShowCTA() {
        return this.matchesConditions(this.settings?.cta?.conditionals, this.getEmailSubmittedConditionState());
    }

    handleCTA() {
        const ctaEl = this.container.querySelector('.cta-overlay');
        if (!ctaEl) return;

        // Show CTA overlay at specified percentage
        const percentage = this.settings.cta?.percentage;

        const timeUpdateHandler = throttle(() => {
            const currentTime = this.player?.currentTime;
            const duration = this.player?.duration;

            if (typeof currentTime !== 'number' || typeof duration !== 'number' || duration <= 0) return;

            const currentPercentage = (currentTime / duration) * 100;

            if (currentPercentage >= percentage && !this.ctaShown && !this.ctaCompleted && this.shouldShowCTA()) {
                this.ctaPercentageTime = (percentage / 100) * duration;
                this.showCTA(ctaEl);
            }
        }, CONSTANTS.TIME_UPDATE_THROTTLE_MS);

        this.addEventListener(this.player, 'time-update', timeUpdateHandler);

        // Handle skip button
        const skipButton = ctaEl.querySelector('.cta-skip');
        if (skipButton) {
            const skipHandler = () => {
                this.hideCTA(ctaEl);
            };
            this.addEventListener(skipButton, 'click', skipHandler);
        }

        const completionType = ctaEl.dataset.completionType || 'link_click';

        if (completionType === 'link_click') {
            // Handle link clicks inside CTA content
            const links = ctaEl.querySelectorAll('.cta-text-content a');
            links.forEach(link => {
                this.addEventListener(link, 'click', () => {
                    this.hideCTA(ctaEl, { skipResume: true });
                });
            });
        } else if (completionType === 'auto_dismiss') {
            // Auto dismiss after duration
            const duration = (parseInt(ctaEl.dataset.autoDismiss) || 5) * 1000;
            this.ctaAutoDismissTimer = null;

            // Start timer when CTA is shown (override showCTA behavior)
            const origShowCTA = this.showCTA.bind(this);
            this.showCTA = (el) => {
                origShowCTA(el);
                this.ctaAutoDismissTimer = setTimeout(() => {
                    this.hideCTA(el);
                }, duration);
            };
        }
        // skip_only: no extra handlers needed, only skip button dismisses
    }

    // Helper method to show CTA overlay
    showCTA(ctaEl) {
        ctaEl.classList.add('active');
        ctaEl.style.display = 'flex';
        ctaEl.setAttribute('role', 'dialog');
        ctaEl.setAttribute('aria-modal', 'true');
        this.ctaResumeTime = this.player?.currentTime ?? this.ctaPercentageTime;
        this.player.pause();
        this.ctaShown = true;

        this.player.classList.add('overlay-active');

        this.disablePlayerControls();

        // Save focus for restoration when CTA closes
        this._ctaPreviousFocus = document.activeElement;

        // Focus the first interactive element for keyboard/screen reader users
        const focusTarget = ctaEl.querySelector('.cta-button, .cta-skip, button, a');
        if (focusTarget) {
            setTimeout(() => focusTarget.focus({ preventScroll: true }), CONSTANTS.UI_DELAY_MS);
        }
    }

    // Helper method to hide CTA overlay
    hideCTA(ctaEl, { skipResume = false } = {}) {
        if (this.ctaAutoDismissTimer) {
            clearTimeout(this.ctaAutoDismissTimer);
            this.ctaAutoDismissTimer = null;
        }
        ctaEl.classList.remove('active');
        ctaEl.style.display = 'none';
        ctaEl.removeAttribute('role');
        ctaEl.removeAttribute('aria-modal');
        this.ctaShown = false;
        this.ctaCompleted = true;
        this.player.classList.remove('overlay-active');

        this.enablePlayerControls();

        // Restore focus to the element that was focused before CTA
        if (this._ctaPreviousFocus && document.contains(this._ctaPreviousFocus)) {
            this._ctaPreviousFocus.focus();
        }
        this._ctaPreviousFocus = null;

        if (this.ctaResumeTime !== undefined) {
            this.player.currentTime = this.ctaResumeTime;
        }

        if (!skipResume) {
            this.player.play();
        }
    }

    handleActionBar() {
        const actionBarEl = this.container.querySelector('.action-bar-overlay');
        if (!actionBarEl) return;

        // Show action bar at specified percentage
        const percentage = this.settings.action_bar?.percentage_start || 0;

        const timeUpdateHandler = throttle(() => {
            const currentTime = this.player?.currentTime;
            const duration = this.player?.duration;

            if (typeof currentTime !== 'number' || typeof duration !== 'number' || duration <= 0) return;

            const currentPercentage = (currentTime / duration) * 100;
            if (currentPercentage >= percentage && !this.actionBarShown && !this.closedActionBar) {
                this.showActionBar(actionBarEl);
            }

            if (currentPercentage < percentage && this.actionBarShown) {
                this.hideActionBar(actionBarEl);
            }
        }, CONSTANTS.TIME_UPDATE_THROTTLE_MS);

        this.addEventListener(this.player, 'time-update', timeUpdateHandler);

        // Handle custom action bar button click
        const actionButton = actionBarEl.querySelector('.action-bar-button');
        if (actionButton) {
            const actionClickHandler = () => {
                // Get link and target from data attributes
                const link = actionButton.dataset.link;
                const target = actionButton.dataset.target;

                if (link) {
                    window.open(link, target);
                }
            };
            this.addEventListener(actionButton, 'click', actionClickHandler);
        }

        // Handle YouTube button click
        const youtubeButton = actionBarEl.querySelector('.action-bar-youtube-button');
        if (youtubeButton) {
            const youtubeClickHandler = () => {
                const channelId = youtubeButton.dataset.channel;
                if (channelId) {
                    window.open(`https://www.youtube.com/channel/${channelId}?sub_confirmation=1`, '_blank');
                }
            };
            this.addEventListener(youtubeButton, 'click', youtubeClickHandler);
        }

        // Handle close button click
        const closeButton = actionBarEl.querySelector('.action-bar-close');
        if (closeButton) {
            const closeClickHandler = () => {
                this.hideActionBar(actionBarEl);
                this.closedActionBar = true;
            };
            this.addEventListener(closeButton, 'click', closeClickHandler);
        }
    }

    setupTimestamps() {
        const timestamps = document.querySelectorAll(`fluentplayer-timestamp[media_id='${this.mediaId}']`);

        timestamps.forEach(timestamp => {
            const clickHandler = () => {
                const timestampMediaId = timestamp.getAttribute('media_id');
                if (timestampMediaId !== this.mediaId.toString()) {
                    return;
                }

                const timeAttr = timestamp.getAttribute('time');
                if (!timeAttr || !timeAttr.includes(':')) {
                    console.warn('FluentPlayer: Invalid timestamp format. Use MM:SS or HH:MM:SS format.');
                    return;
                }

                // Parse the time attribute
                let seconds = 0;
                try {
                    const parts = timeAttr.split(':').map(part => parseInt(part, 10) || 0);

                    if (parts.length === 2) {
                        // Minutes:Seconds format (e.g., "00:30", "0:30")
                        seconds = (parts[0] * 60) + parts[1];
                    } else if (parts.length === 3) {
                        // Hours:Minutes:Seconds format (e.g., "00:00:30", "0:0:30")
                        seconds = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
                    } else {
                        console.warn('FluentPlayer: Invalid timestamp format. Use MM:SS or HH:MM:SS format.');
                        return;
                    }
                } catch (e) {
                    console.error('FluentPlayer: Error parsing timestamp', e);
                    return;
                }

                // Validate the calculated time
                if (seconds < 0) {
                    console.warn('FluentPlayer: Timestamp cannot be negative');
                    return;
                }

                // Ensure the player is ready and has a valid duration
                const duration = this.player?.duration;
                if (!this.player || typeof duration !== 'number' || duration <= 0) {
                    console.warn('FluentPlayer: Player not ready or duration not available');
                    return;
                }

                // Check if the time exceeds the video duration
                if (seconds > duration) {
                    console.warn(`FluentPlayer: Timestamp (${seconds}s) exceeds video duration (${duration}s)`);
                    return;
                }

                // Set the player time to the specified time
                this.player.currentTime = seconds;
                this.player.play().catch(e => {
                    // If autoplay is blocked, try with muted playback
                    if (e.name === 'NotAllowedError') {
                        this.player.muted = true;
                        this.player.play().catch(err => console.error('FluentPlayer: Cannot play video:', err));
                    }
                });

                // Scroll to the player if it's not in view
                this.player.scrollIntoView({behavior: 'smooth', block: 'center'});
            };

            this.addEventListener(timestamp, 'click', clickHandler);
            this.addEventListener(timestamp, 'keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    clickHandler();
                }
            });

            // Add cursor pointer and styling to indicate clickable timestamps
            timestamp.style.cursor = 'pointer';
            timestamp.style.textDecoration = 'underline';
            timestamp.setAttribute('role', 'button');
            timestamp.setAttribute('tabindex', '0');
        });
    }

    // ------------------------------------------------------------------------
    // Language switcher
    // ------------------------------------------------------------------------

    setupLanguageSwitcher() {
        const languageMenu = this.container.querySelector('.fluent-player-language-switcher-radio-group');

        if (!languageMenu) {
            setTimeout(() => {
                const retryLanguageMenu = this.container.querySelector('.fluent-player-language-switcher-radio-group');
                if (retryLanguageMenu) {
                    this.initializeLanguageSwitcher(retryLanguageMenu);
                }
            }, CONSTANTS.UI_ANIMATION_MS);
            return;
        }

        this.initializeLanguageSwitcher(languageMenu);
    }

    initializeLanguageSwitcher(languageMenu) {
        this.loadLanguage(languageMenu);

        this.setupLanguageMenuAutoClose();

        const changeHandler = (e) => {
            const selectedMediaId = e.target.value || e.detail;

            if (selectedMediaId && selectedMediaId != this.mediaId) {
                this.loadMediaById(selectedMediaId, languageMenu);
            }

            this.closeLanguageMenu();
        };

        this.addEventListener(languageMenu, 'change', changeHandler);
    }

    loadLanguage(radioGroup) {
        let detectedLang = this.detectUserLanguage();
        const languageMediaSources = this.getLanguageMediaSources();
        let targetMediaId = null;

        // First try exact match (e.g., 'en_US' === 'en_US')
        if (languageMediaSources[detectedLang]) {
            targetMediaId = languageMediaSources[detectedLang].mediaId;
        } else {
            // Support both locale keys ('en_US') and legacy base-language keys ('en').
            const langCode = detectedLang.split('_')[0];
            for (const [langKey, source] of Object.entries(languageMediaSources)) {
                if (langKey === langCode || langKey.startsWith(langCode + '_')) {
                    targetMediaId = source.mediaId;
                    break;
                }
            }
        }

        if (targetMediaId && targetMediaId != this.mediaId) {
            radioGroup.value = targetMediaId;
            this.loadMediaById(targetMediaId, radioGroup);
        }
    }

    detectUserLanguage() {
        let detectedLang = null;
        if (navigator.language) {
            const browserLang = navigator.language;

            if (browserLang.includes('-')) {
                detectedLang = browserLang.replace('-', '_');
            } else if (browserLang.length === 2) {
                detectedLang = browserLang.toLowerCase();
            } else {
                detectedLang = browserLang;
            }
        }

        if (!detectedLang) {
            detectedLang = window.fluent_player?.serverLang;
        }
        if (!detectedLang) {
            detectedLang = 'en_US';
        }

        return detectedLang;
    }


    loadMediaById(mediaId, radioGroup) {

        if (!mediaId) {
            return;
        }

        // Convert to string for comparison since HTML attributes are strings
        const mediaIdStr = String(mediaId);
        const currentMediaIdStr = String(this.mediaId);


        if (mediaIdStr === currentMediaIdStr) {
            return;
        }

        if (radioGroup) {
            radioGroup.style.opacity = '0.5';
            radioGroup.style.pointerEvents = 'none';
        }

        const languageSources = this.getLanguageMediaSources();
        let mediaSource = null;
        for (const [langCode, source] of Object.entries(languageSources)) {
            if (source.mediaId == mediaId) {
                mediaSource = source;
                break;
            }
        }

        if (mediaSource && this.player) {

            try {
                // Prevent an in-flight resume from carrying over to the newly selected source.
                this.abandonPendingResume();

                if (mediaSource.src) {
                    this.player.src = mediaSource.src;
                }

                if (mediaSource.posterSrc) {
                    const poster = this.player.querySelector('media-poster');
                    if (poster) {
                        poster.src = privacyEnhanceYouTubePoster(mediaSource.posterSrc);
                    }
                }

                // Update the title when switching languages
                if (mediaSource.title) {
                    this.player.title = mediaSource.title;
                }

                this.mediaId = mediaId;

                // Update button display
                this.updateLanguageButton(mediaSource);

                // Show success message
                const languageName = this.getLanguageNameFromSource(mediaSource);

            } catch (error) {
            }
        }
        if (radioGroup) {
            radioGroup.style.opacity = '1';
            radioGroup.style.pointerEvents = 'auto';
        }
    }

    getLanguageMediaSources() {
        const mediaVarName = this.container.dataset.var_name;

        // First try to get from window variable (regular WordPress context)
        if (mediaVarName && window[mediaVarName]) {
            const sources = window[mediaVarName].languageMediaSources || {};
            if (Object.keys(sources).length > 0) {
                return sources;
            }
        }

        // Fallback to instance property (FluentCommunity AJAX context)
        if (this.languageMediaSources && Object.keys(this.languageMediaSources).length > 0) {
            return this.languageMediaSources;
        }

        return {};
    }

    getLanguageNameFromSource(mediaSource) {
        // Try to get language name from the radio option
        const radioOption = this.container.querySelector(`media-radio[value="${mediaSource.mediaId}"]`);
        if (radioOption) {
            const labelElement = radioOption.querySelector('.fluent-player-language-radio-label');
            if (labelElement) {
                return labelElement.textContent.trim();
            }
        }

        // Fallback to media title
        return mediaSource.title || $t('Selected Language');
    }


    updateLanguageButton(mediaSource) {
        const languageButton = this.container.querySelector('.fluent-player-language-button');
        if (!languageButton) return;

        const flagElement = languageButton.querySelector('.fluent-player-language-flag');
        const codeElement = languageButton.querySelector('.fluent-player-language-code');

        if (!flagElement || !codeElement) return;

        // Find the selected radio option to get language info
        const selectedRadio = this.container.querySelector(`media-radio[value="${mediaSource.mediaId}"]`);
        if (!selectedRadio) return;

        const flagOption = selectedRadio.querySelector('.fluent-player-language-flag-option');
        const langCode = selectedRadio.getAttribute('data-lang');

        if (flagOption && langCode) {
            // Update flag
            flagElement.textContent = flagOption.textContent;

            // Update language code (first 2 letters, uppercase)
            const shortCode = langCode.split('_')[0].toUpperCase();
            codeElement.textContent = shortCode;

            // Add visual feedback
            languageButton.style.transform = 'scale(1.05)';
            setTimeout(() => {
                languageButton.style.transform = 'scale(1)';
            }, CONSTANTS.UI_ANIMATION_MS);
        }
    }

    closeLanguageMenu() {
        const mediaMenu = this.container.querySelector('media-menu.fluent-player-language-menu');
        const languageButton = this.container.querySelector('media-menu-button.fluent-player-language-button');

        if (mediaMenu && languageButton) {
            const isExpanded = languageButton.getAttribute('aria-expanded') === 'true';

            if (isExpanded) {
                if (mediaMenu.close && typeof mediaMenu.close === 'function') {
                    mediaMenu.close();
                } else {
                    languageButton.click();
                }
            }
        }
    }

    setupLanguageMenuAutoClose() {
        const events = ['play', 'pause', 'seeked'];

        events.forEach(eventName => {
            const handler = () => {
                setTimeout(() => this.closeLanguageMenu(), CONSTANTS.UI_DELAY_MS);
            };
            this.addEventListener(this.player, eventName, handler);
        });

        const clickHandler = (e) => {
            const languageControls = this.container.querySelector('.fluent-player-language-controls');
            if (languageControls && !languageControls.contains(e.target)) {
                this.closeLanguageMenu();
            }
        };

        this.addEventListener(this.player, 'click', clickHandler);
    }


    setupVideoEndBehavior() {
        if (!this.player) return;

        this.player.removeAttribute('loop');
        this.setupEndScreenCSS();

        const autoplayUI = this.settings.mutedAutoplay ? null : this.setupAutoplayOverlay();

        this.addEventListener(this.player, 'ended', () => {
            if (!this.isLoopEnabled()) {
                return;
            }

            if (this.settings.mutedAutoplay) {
                // Seamless loop for ambient/background mode — no countdown UI.
                // Don't use the native loop attribute — it conflicts with Vidstack's
                // ended handling on YouTube. Instead, manually seek and play.
                setTimeout(() => {
                    this.player.currentTime = 0;
                    this.player.paused = false;
                    this.player.play().catch(() => {});
                }, 500);
                return;
            }

            if (!autoplayUI) {
                return;
            }

            autoplayUI.style.display = 'flex';
            this.startAutoplayCountdown(autoplayUI);
        });
    }

    setupAutoplayOverlay() {
        // Create the autoplay UI if it doesn't exist
        let autoplayUI = this.container.querySelector('.fluent-player-autoplay-overlay');

        if (!autoplayUI) {
            autoplayUI = document.createElement('div');
            autoplayUI.className = 'fluent-player-autoplay-overlay';
            autoplayUI.style.display = 'none';

            // Create the UI
            autoplayUI.innerHTML = `
            <div class="fluent-player-autoplay-container">
                <div class="fluent-player-autoplay-info">
                    <div class="fluent-player-autoplay-title" aria-live="polite" aria-atomic="true">${$t('Playing again in')}</div>
                    <div class="fluent-player-autoplay-countdown">
                        <svg viewBox="0 0 36 36" aria-hidden="true" focusable="false">
                            <circle class="fluent-player-countdown-bg" cx="18" cy="18" r="16" />
                            <circle class="fluent-player-countdown-progress" cx="18" cy="18" r="16" stroke-dasharray="100 100" />
                        </svg>
                        <span class="fluent-player-countdown-number">${CONSTANTS.AUTOPLAY_COUNTDOWN_SECONDS}</span>
                    </div>
                </div>
                <button class="fluent-player-autoplay-cancel" aria-label="${$t('Cancel autoplay')}">${$t('Cancel')}</button>
            </div>
        `;

            // Add to container
            this.container.appendChild(autoplayUI);

            // Add cancel button handler
            const cancelButton = autoplayUI.querySelector('.fluent-player-autoplay-cancel');
            const cancelHandler = () => {
                this.cancelAutoplay();
            };
            this.addEventListener(cancelButton, 'click', cancelHandler);
        }

        return autoplayUI;
    }

    startAutoplayCountdown(uiElement) {
        const numberEl = uiElement.querySelector('.fluent-player-countdown-number');
        const progressEl = uiElement.querySelector('.fluent-player-countdown-progress');

        // Initialize countdown state
        let count = CONSTANTS.AUTOPLAY_COUNTDOWN_SECONDS;
        numberEl.textContent = count;
        progressEl.style.strokeDasharray = '100, 100';

        // Clear any existing timeouts
        if (this.countdownTimeouts && this.countdownTimeouts.length) {
            this.countdownTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        }
        this.countdownTimeouts = [];

        // Update countdown each second
        for (let i = 0; i < CONSTANTS.AUTOPLAY_COUNTDOWN_SECONDS; i++) {
            const timeout = setTimeout(() => {
                count--;
                if (count >= 0) {
                    numberEl.textContent = count;
                    // Animate progress circle
                    const dashOffset = ((CONSTANTS.AUTOPLAY_COUNTDOWN_SECONDS - count) / CONSTANTS.AUTOPLAY_COUNTDOWN_SECONDS) * 100;
                    progressEl.style.strokeDasharray = `${dashOffset} 100`;
                }

                // When countdown ends, restart the video
                if (count === 0) {
                    const finalTimeout = setTimeout(() => {
                        uiElement.style.display = 'none';
                        if (this.player) {
                            this.player.currentTime = 0;
                            this.player.play().catch(e => {
                                console.warn('FluentPlayer: Auto-restart failed:', e);
                            });
                        }
                    }, CONSTANTS.AUTOPLAY_FINAL_DELAY_MS);
                    this.countdownTimeouts.push(finalTimeout);
                }
            }, i * 1000);

            this.countdownTimeouts.push(timeout);
        }
    }

    cancelAutoplay() {
        if (this.countdownTimeouts && this.countdownTimeouts.length) {
            this.countdownTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        }

        const autoplayUI = this.container.querySelector('.fluent-player-autoplay-overlay');
        if (autoplayUI) {
            autoplayUI.style.display = 'none';
        }
    }

    setupEndScreenCSS() {
        const element = this.container.querySelector('.vds-blocker');
        if (!element) return;

        const endedHandler = () => {
            element.style.display = 'block';
            element.style.backgroundColor = 'transparent';
            element.style.backgroundImage = `url("${privacyEnhanceYouTubePoster(this.settings.posterSrc)}")`;
            element.style.backgroundSize = 'cover';
            element.style.backgroundPosition = 'center';
        };

        const playHandler = () => {
            if (element) {
                element.style.display = 'none';
            }
        };

        this.addEventListener(this.player, 'ended', endedHandler);
        this.addEventListener(this.player, 'play', playHandler);
    }

    showActionBar(actionBarEl) {
        actionBarEl.classList.add('active');
        actionBarEl.style.display = 'flex';
        this.actionBarShown = true;
    }

    hideActionBar(actionBarEl) {
        actionBarEl.classList.remove('active');
        actionBarEl.style.display = 'none';
        this.actionBarShown = false;
    }

    setupPauseOtherVideos() {
        const shouldPauseOthers = true; // Maybe make this configurable if needed later

        if (shouldPauseOthers === false) {
            return;
        }

        const playHandler = () => {
            const event = new CustomEvent('fluent-player-play', {
                detail: {
                    playerId: this.instanceId
                }
            });
            document.dispatchEvent(event);
        };

        const documentPlayHandler = (e) => {
            if (e.detail.playerId !== this.instanceId && this.player) {
                this.player.pause();
            }
        };

        this.addEventListener(this.player, 'play', playHandler);
        this.addEventListener(document, 'fluent-player-play', documentPlayHandler);
    }
}

export default FluentPlayer;
