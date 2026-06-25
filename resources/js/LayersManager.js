import $t from './translator.js';
import {
    evaluateConditionals,
    hasEnabledConditionals,
    mergeConditionStates,
} from './utils/conditions.js';

/**
 * Layers Manager for CTA, Hotspot, and Ad layers only
 */
class LayersManager {
    constructor(player, container, mediaId, settings = {}, playerInstance = {}, options = {}) {
        this.player = player;
        this.payerClass = playerInstance;
        this.container = container;
        this.mediaId = mediaId;
        this.settings = settings;
        this.preserveDOM = options.preserveDOM || false;
        // Initialize tracking properties before early return so destroy() always works
        this.layerStates = new Map();
        this.persistedConditionStates = new Map();
        this.currentDisplayedLayers = new Set();
        this.eventListeners = new Map();
        this._layerDomListeners = new Map();
        this.conditionState = settings?.condition_state || playerInstance?.conditionState || {};
        this.browserStorage = typeof window !== 'undefined' ? window.FluentBrowserStorage : null;

        this.layers = this.parseLayers();
        if (!this.layers.length) {
            return;
        }

        // Layer Dom Element
        this.layerContainer = null;
        this.activeLayerEls = new Map();  // layerId → DOM element

        this.initializeLayerStates(options.initialLayerStates);
        this.initializePersistedConditionStates();
        this.setupEventListeners();
    }

    /**
     * Parse layers from settings
     */
    parseLayers() {
        if (!this.settings.layers || !Array.isArray(this.settings.layers)) {
            return [];
        }
        return this.settings.layers
            .sort((a, b) => a.displayTime - b.displayTime);
    }

    /**
     * Initialize layer states for all layers
     */
    initializeLayerStates(initialStates = null) {
        this.layers.forEach(layer => {
            if (initialStates?.has(layer.id)) {
                this.layerStates.set(layer.id, { ...initialStates.get(layer.id) });
            } else if (!this.layerStates.has(layer.id)) {
                this.layerStates.set(layer.id, {
                    seen: false,
                    completed: false,
                    skipped: false
                });
            }
        });
    }

    /**
     * Restore persisted seen/completed state for condition checks only.
     * This does not alter session lifecycle state, so reloads do not auto-skip layers.
     */
    initializePersistedConditionStates() {
        if (!this.browserStorage || !this.mediaId) {
            return;
        }

        const storedStates = this.browserStorage.getLayerConditionStates(this.mediaId);
        if (!storedStates || typeof storedStates !== 'object') {
            return;
        }

        this.layers.forEach((layer) => {
            const conditionStateKey = this.getConditionStateKey(layer);
            if (!conditionStateKey) {
                return;
            }

            const storedState = storedStates[conditionStateKey];
            if (!storedState || typeof storedState !== 'object') {
                return;
            }

            this.persistedConditionStates.set(layer.id, {
                seen: Boolean(storedState.seen),
                completed: Boolean(storedState.completed),
            });
        });
    }

    getConditionStateKey(layerOrId) {
        const layer = typeof layerOrId === 'object'
            ? layerOrId
            : this.layers.find((item) => item.id === layerOrId);

        const rawKey = layer?.condition_state_key;
        return rawKey ? String(rawKey) : null;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.player) return;

        this._boundHandleTimeUpdate = this.handleTimeUpdate.bind(this);
        this._boundHandlePlay = this.handlePlay.bind(this);
        this._boundHandlePlaying = this.handlePlaying.bind(this);
        this._boundPreventSeekHandler = this.preventSeekHandler.bind(this);

        this.player.addEventListener('time-update', this._boundHandleTimeUpdate);
        this.player.addEventListener('play', this._boundHandlePlay);
        this.player.addEventListener('playing', this._boundHandlePlaying);

        this.timeSliderEl = this.player?.querySelector('media-time-slider');
        if (this.timeSliderEl) {
            this.timeSliderEl.addEventListener('media-seek-request', this._boundPreventSeekHandler);
        }

        this.seekButtons = this.player?.querySelectorAll('media-seek-button') || [];
        if (this.seekButtons.length) {
            this.seekButtons.forEach(button => {
                button.addEventListener('media-seek-request', this._boundPreventSeekHandler);
            });
        }
    }

    /**
     * Handle time updates from the player
     */
    handleTimeUpdate() {
        if (!this.player) return;
        const currentTime = this.player.currentTime;
        const isPlaying = !this.player.paused;
        const timeDiff = this._lastTime !== undefined ? Math.abs(currentTime - this._lastTime) : 0;

        // Detect seek-while-playing: time jumped > 2s.
        // YouTube gets permanently stuck if we call pause() during its seek+buffer cycle.
        // Wait for the 'playing' event (YouTube finished buffering) before checking layers.
        if (isPlaying && this._lastTime !== undefined && timeDiff > 2) {
            this._lastTime = currentTime;
            this._seekInProgress = true;
            clearTimeout(this._seekSettleTimeout);

            const onPlaying = () => {
                clearTimeout(this._seekSettleTimeout);
                this._seekInProgress = false;
                if (this.player) {
                    this._lastTime = this.player.currentTime;
                    this.checkLayersAtTime(this.player.currentTime);
                }
            };
            this._seekPlayingHandler = onPlaying;
            this.player.addEventListener('playing', onPlaying, { once: true });

            // Fallback: if 'playing' never fires (e.g. paused mid-seek), check after 3s
            this._seekSettleTimeout = setTimeout(() => {
                this.player.removeEventListener('playing', onPlaying);
                this._seekInProgress = false;
                if (this.player) {
                    this._lastTime = this.player.currentTime;
                    this.checkLayersAtTime(this.player.currentTime);
                }
            }, 3000);
            return;
        }

        // Skip time-updates during seek settle period
        if (this._seekInProgress) {
            return;
        }

        this._lastTime = currentTime;
        this.checkLayersAtTime(currentTime);
    }

    /**
     * Prevent seeking over blocking layers
     */
    preventSeekHandler(e) {
        if (!this.player) return;
        if (this.hasBlockingLayer()) {
            const layer = this.layers.find(l => this.currentDisplayedLayers.has(l.id));
            if (layer && layer.displayTime < e.detail) {
                e.preventDefault();
            }
        }
    }

    /**
     * Pause video if there is a blocking layer
     */
    handlePlay() {
        if (this.hasBlockingLayer()) {
            const layer = this.layers.find(l => this.currentDisplayedLayers.has(l.id));
            if (layer && this.player.currentTime >= layer.displayTime) {
                this.pauseVideoForBlockingLayer();
            }
        }
    }

    /**
     * Pause once playback actually starts if a blocking layer became active
     * while the provider was still buffering the initial play request.
     */
    handlePlaying() {
        if (this.hasBlockingLayer()) {
            this.pauseVideo();
        }
    }

    /**
     * Check for layers that should be displayed at current time
     */
    checkLayersAtTime(currentTime) {
        const hasActiveLayer = this.currentDisplayedLayers.size > 0;

        for (const layer of this.layers) {
            const layerState = this.layerStates.get(layer.id);
            // Skip if layer is already completed or skipped
            if (layerState.completed || layerState.skipped) {
                continue;
            }

            const shouldShow = this.shouldShowLayer(layer, currentTime);
            if (shouldShow && layer.type !== 'hotspot') {
                this.pauseVideoForBlockingLayer();
            }

            const isCurrentlyDisplayed = this.currentDisplayedLayers.has(layer.id);
            if (shouldShow && !isCurrentlyDisplayed) {
                if (hasActiveLayer && this.hasBlockingLayer()) {
                    continue;
                }
                this.showLayer(layer);
                break;
            } else if (!shouldShow && isCurrentlyDisplayed) {
                this.hideLayer(layer);
            }
        }
    }

    /**
     * Determine if a layer should be shown
     */
    shouldShowLayer(layer, currentTime) {
        const isCurrentlyDisplayed = this.currentDisplayedLayers.has(layer.id);
        let timeMatched = currentTime >= layer.displayTime;

        if (layer.type === 'hotspot') {
            const endTime = layer.displayTime + (layer.duration || 5);
            timeMatched = currentTime >= layer.displayTime && currentTime <= endTime;
        }

        if (!timeMatched) {
            return false;
        }

        // Once a layer is active and still inside its display window, let lifecycle/end-time govern it.
        if (isCurrentlyDisplayed) {
            return true;
        }

        if (!hasEnabledConditionals(layer.conditionals)) {
            return true;
        }

        return evaluateConditionals(layer.conditionals, this.getLayerConditionState(layer));
    }

    getLayerConditionState(layer) {
        const sessionState = this.layerStates.get(layer.id) || {};
        const persistedState = this.persistedConditionStates.get(layer.id) || {};

        return mergeConditionStates(this.conditionState, {
            ...(this.payerClass?.emailSubmitted ? {
                viewer: {
                    email_submitted: true,
                },
            } : {}),
            layer: {
                seen: Boolean(sessionState.seen) || Boolean(persistedState.seen),
                completed: Boolean(sessionState.completed) || Boolean(persistedState.completed),
            },
        });
    }

    /**
     * Show a layer using pre-rendered content
     */
    showLayer(layer) {
        this.currentDisplayedLayers.add(layer.id);
        this.markLayerAsSeen(layer.id);

        // Find existing layer element in the DOM
        if (!this.layerContainer) {
            this.layerContainer = this.container.querySelector('.fluent-player-layers-wrapper');
        }
        if (!this.layerContainer) {
            return;
        }

        // Show the layers wrapper
        this.layerContainer.style.display = 'block';
        if (layer.type === 'hotspot') {
            this.layerContainer.classList.add('hotspot-active');
        } else {
            if (this.currentDisplayedLayers.size > 1) {
                this.layerContainer.classList.add('multiple-active');
            } else {
                this.layerContainer.classList.remove('hotspot-active');
            }
        }

        // Find the specific layer template
        const layerEl = this.container.querySelector(`[data-layer-id="${layer.id}"]`);
        if (!layerEl) {
            return;
        }

        // Restore visibility if previously hidden by preserveDOM
        if (this.preserveDOM && layerEl.style.display === 'none') {
            layerEl.style.display = '';
            layerEl.classList.remove('layer-completed');
        }

        this.activeLayerEls.set(layer.id, layerEl);
        layerEl.classList.add('layer-active');
        if (this.hasBlockingLayer()) {
            layerEl.classList.add('blocking-layer');
        }

        // Setup interactions
        this.setupLayerInteractions(layer);

        // Handle layer-specific behavior
        this.handleLayerBehavior(layer);
    }

    /**
     * Handle layer-specific behavior
     */
    handleLayerBehavior(layer) {
        switch (layer.type) {
            case 'hotspot':
                if (layer.pauseOnHover) {
                    this.setupHotspotPauseOnHover(layer);
                }
                break;
        }
    }

    /**
     * Get the active DOM element for a layer from the Map.
     */
    getLayerEl(layer) {
        return this.activeLayerEls.get(layer.id);
    }

    /**
     * Add event listener on a layer element and track for cleanup when layer hides
     */
    _addLayerListener(layerId, target, event, handler, options) {
        const key = String(layerId);
        target.addEventListener(event, handler, options);
        if (!this._layerDomListeners.has(key)) {
            this._layerDomListeners.set(key, []);
        }
        this._layerDomListeners.get(key).push({ target, event, handler, options });
    }

    /**
     * Remove all tracked DOM listeners for a specific layer
     */
    _cleanupLayerListeners(layerId) {
        const key = String(layerId);
        const listeners = this._layerDomListeners.get(key);
        if (listeners) {
            listeners.forEach(({ target, event, handler, options }) => {
                target.removeEventListener(event, handler, options);
            });
            this._layerDomListeners.delete(key);
        }
    }

    /**
     * Setup layer interactions
     */
    setupLayerInteractions(layer) {
        const layerEl = this.getLayerEl(layer);
        if (!layerEl) return;

        this._addLayerListener(layer.id, layerEl, "click", (e) => {
            const action = e.target.dataset.action;
            switch (action) {
                case "skip":
                    this.handleLayerSkip(layer);
                    break;
                case 'cta-click':
                    this.handleCTAClick(e.target, layer);
                    break;
                case 'hotspot-click':
                    this.handleHotspotClick(e.target, layer);
                    break;
                case 'continue':
                    this.handleLayerComplete(layer);
                    break;
                default:
                    break;
            }
        });

        if (layer.type === 'cta' && layer.cta_type !== 'email') {
            const completionType = layer.completion_type || 'link_click';

            if (completionType === 'link_click') {
                const links = layerEl.querySelectorAll('.cta-text-content a');
                links.forEach(link => {
                    this._addLayerListener(layer.id, link, 'click', () => {
                        this.handleLayerComplete(layer, { skipResume: true });
                    });
                });
            } else if (completionType === 'auto_dismiss') {
                const duration = (layer.auto_dismiss_duration || 5) * 1000;
                const timeoutId = setTimeout(() => {
                    this.handleLayerComplete(layer);
                }, duration);
                if (!this.eventListeners.has(layer.id)) this.eventListeners.set(layer.id, []);
                this.eventListeners.get(layer.id).push(() => {
                    clearTimeout(timeoutId);
                });
            }
        }

        // Setup form submission listeners for FluentForms
        if (layer.type === 'form' && layer.form_type === 'fluentforms') {
            this.setupFluentFormListeners(layer);
        }
        // Handle ad layer
        if (layer.type === 'ad') {
            this.setupAdLayer(layer);
        }
        // Handle email capture
        if (layer.type === 'cta' && layer.cta_type === 'email') {
            this.setupEmailCapture(layer);
        }
    }

    /**
     * Create ad skip button
     */
    createAdSkipButton(layer) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fluent-player-skip-button';
        btn.textContent = $t('Skip');
        btn.dataset.action = 'skip';
        return btn;
    }

    /**
     * Return the same color at 50% opacity for the ad bar track (hex or rgba string).
     */
    adBarColorAt50Opacity(color) {
        if (!color || typeof color !== 'string') return '';
        const hex = color.trim().match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/);
        if (hex) {
            let r, g, b;
            const raw = hex[1];
            if (raw.length === 3) {
                r = parseInt(raw[0] + raw[0], 16);
                g = parseInt(raw[1] + raw[1], 16);
                b = parseInt(raw[2] + raw[2], 16);
            } else {
                r = parseInt(raw.slice(0, 2), 16);
                g = parseInt(raw.slice(2, 4), 16);
                b = parseInt(raw.slice(4, 6), 16);
            }
            return `rgba(${r},${g},${b},0.5)`;
        }
        const rgba = color.trim().match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/);
        if (rgba) {
            return `rgba(${rgba[1]},${rgba[2]},${rgba[3]},0.5)`;
        }
        return '';
    }

    /**
     * Setup skip button for ad layer. Returns { button, cleanup }
     */
    setupAdSkipButton(layer) {
        const layerEl = this.getLayerEl(layer);
        if (!layer.allow_skip || !layerEl) return { button: null, cleanup: () => {} };
        const skipOffset = Number(layer.skip_offset) || 0;
        let button = null;
        let timeoutId = null;

        const addButton = () => {
            if (button) return;
            button = this.createAdSkipButton(layer);
            layerEl.appendChild(button);
        };

        if (skipOffset > 0) {
            timeoutId = setTimeout(addButton, skipOffset * 1000);
        } else {
            addButton();
        }

        return {
            button,
            cleanup: () => {
                if (timeoutId !== null) clearTimeout(timeoutId);
                if (button && button.parentNode) button.remove();
            }
        };
    }

    setupAdLayer(layer) {
        const layerEl = this.getLayerEl(layer);
        if (!layerEl) return;
        const adContentEl = layerEl.querySelector('.fluent-player-layer-ad-content');
        const mediaType = layer.media_type || adContentEl?.dataset?.mediaType || 'video';
        const adVideo = layerEl.querySelector('video');
        const adImage = layerEl.querySelector('img');

        if (adVideo) {
            const skipOffset = Number(layer.skip_offset) || 0;
            let adSkipButtonRef = null;
            const timeRemainingBarTrack = layerEl.querySelector('.fluent-player-layer-ad-time-remaining-bar');
            const timeRemainingBarFill = layerEl.querySelector('.fluent-player-layer-ad-time-remaining-bar-fill');
            if (layer.fill_bar_color) {
                if (timeRemainingBarFill) timeRemainingBarFill.style.backgroundColor = layer.fill_bar_color;
                const trackColor = this.adBarColorAt50Opacity(layer.fill_bar_color);
                if (trackColor && timeRemainingBarTrack) timeRemainingBarTrack.style.backgroundColor = trackColor;
            }

            const handleTimeUpdate = () => {
                const timeRemainingBar = layerEl.querySelector('.fluent-player-layer-ad-time-remaining-bar-fill');
                if (timeRemainingBar) {
                    const remainingTime = adVideo.duration - adVideo.currentTime;
                    const percent = (remainingTime / adVideo.duration) * 100;
                    timeRemainingBar.style.width = `${percent}%`;
                }
                if (layer.allow_skip && skipOffset > 0 && !adSkipButtonRef && adVideo.currentTime >= skipOffset) {
                    const btn = this.createAdSkipButton(layer);
                    layerEl.appendChild(btn);
                    adSkipButtonRef = { button: btn, cleanup: () => { if (btn.parentNode) btn.remove(); } };
                }
            };

            const handleVideoEnd = () => {
                this.handleLayerComplete(layer);
            };

            adVideo.addEventListener('ended', handleVideoEnd);
            adVideo.addEventListener('timeupdate', handleTimeUpdate);

            if (layer.allow_skip && skipOffset === 0) {
                adSkipButtonRef = this.setupAdSkipButton(layer);
            }

            if (!this.eventListeners.has(layer.id)) this.eventListeners.set(layer.id, []);
            this.eventListeners.get(layer.id).push(() => {
                adVideo.removeEventListener('ended', handleVideoEnd);
                adVideo.removeEventListener('timeupdate', handleTimeUpdate);
                if (adSkipButtonRef) adSkipButtonRef.cleanup();
            });

            const playPromise = adVideo.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {}).catch(() => {
                    const playButton = document.createElement('button');
                    playButton.className = 'fluent-player-play-button';
                    playButton.textContent = $t('Play Ad');
                    playButton.addEventListener('click', () => {
                        adVideo.play();
                        playButton.remove();
                    });
                    layerEl.appendChild(playButton);
                });
            }
            return;
        }

        if (mediaType === 'image' || adImage) {
            const timeRemainingBar = layerEl.querySelector('.fluent-player-layer-ad-time-remaining-bar');
            const timeRemainingBarFill = layerEl.querySelector('.fluent-player-layer-ad-time-remaining-bar-fill');
            if (layer.fill_bar_color) {
                if (timeRemainingBarFill) timeRemainingBarFill.style.backgroundColor = layer.fill_bar_color;
                const trackColor = this.adBarColorAt50Opacity(layer.fill_bar_color);
                if (trackColor && timeRemainingBar) timeRemainingBar.style.backgroundColor = trackColor;
            }
            const duration = Number(layer.duration) || 0;

            let durationTimeoutId = null;
            let countdownIntervalId = null;
            const startTime = Date.now();

            const adSkipButtonRef = this.setupAdSkipButton(layer);

            if (!duration) {
                if (timeRemainingBar) timeRemainingBar.style.display = 'none';
            } else if (timeRemainingBarFill) {
                timeRemainingBarFill.style.width = '100%';
                countdownIntervalId = setInterval(() => {
                    const elapsed = (Date.now() - startTime) / 1000;
                    const remaining = Math.max(0, duration - elapsed);
                    const percent = duration > 0 ? (remaining / duration) * 100 : 0;
                    timeRemainingBarFill.style.width = `${percent}%`;
                    if (remaining <= 0 && countdownIntervalId) {
                        clearInterval(countdownIntervalId);
                        countdownIntervalId = null;
                    }
                }, 100);
            }

            if (duration > 0) {
                durationTimeoutId = setTimeout(() => {
                    this.handleLayerComplete(layer);
                    durationTimeoutId = null;
                }, duration * 1000);
            }

            if (!this.eventListeners.has(layer.id)) this.eventListeners.set(layer.id, []);
            this.eventListeners.get(layer.id).push(() => {
                if (durationTimeoutId !== null) clearTimeout(durationTimeoutId);
                if (countdownIntervalId !== null) clearInterval(countdownIntervalId);
                adSkipButtonRef.cleanup();
                if (timeRemainingBar) timeRemainingBar.style.display = '';
            });
        }
    }

    setupEmailCapture(layer) {
        const layerEl = this.getLayerEl(layer);
        if (!layerEl) return;
        const emailInput = layerEl.querySelector('.email-capture-input');
        const submitButton = layerEl.querySelector('.email-capture-button');
        const inputListener = () => {
            emailInput.value.trim();
            emailInput.classList.remove('error');
            this.payerClass.hideMessage(layerEl);
        };
        const inputKeyPressListener = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleLayerEmailSubmit(emailInput, layer);
            }
        };

        const emailSubmitListener = () => {
            this.handleLayerEmailSubmit(emailInput, layer);
        };

        if (emailInput && submitButton) {
            emailInput.addEventListener('input', inputListener);
            emailInput.addEventListener('keydown', inputKeyPressListener);
            submitButton.addEventListener('click', emailSubmitListener);

            if (!this.eventListeners.has(layer.id)) this.eventListeners.set(layer.id, []);
            this.eventListeners.get(layer.id).push(() => {
                emailInput.removeEventListener('input', inputListener);
                emailInput.removeEventListener('keydown', inputKeyPressListener);
                submitButton.removeEventListener('click', emailSubmitListener);
            });
        }
    }

    async handleLayerEmailSubmit(emailInput, layer) {
        const layerEl = this.activeLayerEls.get(layer.id);
        const result = await this.payerClass.handleEmailSubmit(emailInput, layerEl || this.container, { layer_id: layer.id, type: 'layer' });
        if (result.success) {
            this.handleLayerComplete(layer);
        } else {
            this.payerClass.showMessage(layerEl || this.container, result.message, 'error');
        }
    }

    /**
     * Setup FluentForm submission listeners
     */
    setupFluentFormListeners(layer) {
        const handleFormSuccess = (event, data) => {
            this.handleFormSubmissionSuccess(layer, event, data);
        };

        const hasJQuery = typeof window.jQuery === 'function';
        if (hasJQuery) {
            window.jQuery(document.body).on('fluentform_submission_success', handleFormSuccess);
        } else {
            document.addEventListener("fluentform_submission_success", handleFormSuccess);
        }

        const layerEl = this.activeLayerEls.get(layer.id);
        const conversationalForm = layerEl?.querySelector('.ff_conv_app');
        if (conversationalForm) {
            conversationalForm.addEventListener("fluentform_submission_success", handleFormSuccess);
        }

        if (!this.eventListeners.has(layer.id)) this.eventListeners.set(layer.id, []);
        this.eventListeners.get(layer.id).push(() => {
            if (hasJQuery) {
                window.jQuery(document.body).off('fluentform_submission_success', handleFormSuccess);
            } else {
                document.removeEventListener("fluentform_submission_success", handleFormSuccess);
            }
            if (conversationalForm) {
                conversationalForm.removeEventListener("fluentform_submission_success", handleFormSuccess);
            }
        });
    }

    /**
     * Handle form submission success
     */
    handleFormSubmissionSuccess(layer, event, data) {
        const formId = +(data?.config?.id || event.detail?.form_id || event.detail?.config?.id);
        if (formId && layer.form_id && formId === layer.form_id) {
            this.addContinueButton(layer);
        }
    }

    /**
     * Cleanup form listeners
     */
    maybeRemoveFormListeners(layerId) {
        const cleanups = this.eventListeners.get(layerId);
        if (cleanups) {
            cleanups.forEach(fn => fn());
            this.eventListeners.delete(layerId);
        }
    }

    /**
     * Add continue button after form submission
     */
    addContinueButton(layer) {
        const layerEl = this.activeLayerEls.get(layer.id);
        if (!layerEl) return;

        // Check if continue button already exists
        if (layerEl.querySelector('.fluent-player-continue-button')) {
            return;
        }

        const skipButton = layerEl.querySelector('.fluent-player-skip-button');
        if (skipButton) {
            skipButton.classList.add('fluent-player-continue-button');
            skipButton.textContent = $t('Continue');
            skipButton.dataset.action = 'continue';
            return;
        }

        // Create continue button
        const continueButton = document.createElement('button');
        continueButton.className = 'fluent-player-continue-button fluent-player-skip-button';
        continueButton.textContent = $t('Continue');
        continueButton.dataset.action = 'continue';
        layerEl.appendChild(continueButton);
    }

    /**
     * Handle CTA click
     */
    handleCTAClick(target, layer) {
        this.handleLayerComplete(layer);
        // Pause video if clicked on a link
        if (target.parentNode.tagName === 'A') {
            setTimeout(() => {
                this.pauseVideo();
            }, 100);
        }
    }

    handleHotspotClick(target, layer) {
        if (target.tagName === 'A') {
            this.pauseVideo();
        }
    }

    /**
     * Setup hotspot pause on hover
     */
    setupHotspotPauseOnHover(layer) {
        const layerEl = this.getLayerEl(layer);
        if (!layerEl) return;
        const hotspots = layerEl.querySelectorAll('.fluent-player-hotspot-marker');
        const layerId = layer.id;

        hotspots.forEach(hotspot => {
            this._addLayerListener(layerId, hotspot, 'mouseenter', () => {
                this.pauseVideo();
            });

            this._addLayerListener(layerId, hotspot, 'mouseleave', () => {
                this.resumeVideo();
            });

            this._addLayerListener(layerId, hotspot, 'click', (e) => {
                if (e.target.closest('a')) return;
                e.preventDefault();
                if (this.player && this.player.paused) {
                    this.resumeVideo();
                } else {
                    this.pauseVideo();
                }
            });

            this._addLayerListener(layerId, hotspot, 'keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    hotspot.click();
                }
            });
        });
    }

    /**
     * Mark layer as seen
     */
    markLayerAsSeen(layerId) {
        const layerState = this.layerStates.get(layerId);
        if (layerState) {
            layerState.seen = true;
            this.persistConditionState(layerId, { seen: true });
        }
    }

    /**
     * Handle layer skip
     */
    handleLayerSkip(layer) {
        if (!this.isLayerSkippable(layer)) {
            return;
        }
        const layerState = this.layerStates.get(layer.id);
        if (layerState) {
            layerState.skipped = true;
        }
        this.hideLayer(layer);
    }

    /**
     * Check is layer skippable or not
     */
    isLayerSkippable(layer) {
        return layer.type === 'form' || layer.type === 'ad' ? layer.allow_skip : true;
    }

    /**
     * Handle layer completion
     */
    handleLayerComplete(layer, { skipResume = false } = {}) {
        const layerState = this.layerStates.get(layer.id);
        if (layerState) {
            layerState.completed = true;
            this.persistConditionState(layer.id, { completed: true });
        }
        this.hideLayer(layer, { skipResume });
    }

    persistConditionState(layerId, nextState) {
        if (!this.browserStorage || !this.mediaId) {
            return;
        }

        const conditionStateKey = this.getConditionStateKey(layerId);
        if (!conditionStateKey) {
            return;
        }

        const currentPersistedState = this.persistedConditionStates.get(layerId) || {};
        const mergedState = {
            seen: Boolean(currentPersistedState.seen) || Boolean(nextState?.seen),
            completed: Boolean(currentPersistedState.completed) || Boolean(nextState?.completed),
        };

        this.persistedConditionStates.set(layerId, mergedState);
        this.browserStorage.updateLayerConditionState(this.mediaId, conditionStateKey, mergedState);
    }

    /**
     * Hide layer
     */
    hideLayer(layer, { skipResume = false } = {}) {
        if (!this.layerContainer) return;

        const layerEl = this.activeLayerEls.get(layer.id);
        if (layerEl) {
            layerEl.classList.remove('layer-active', 'blocking-layer');
        }
        this.currentDisplayedLayers.delete(layer.id);

        if (this.currentDisplayedLayers.size === 0) {
            this.layerContainer.style.display = 'none';
        } else if (this.currentDisplayedLayers.size <= 1) {
            this.layerContainer.classList.remove('multiple-active');
        }

        const layerState = this.layerStates.get(layer.id);
        const wasCompletedOrSkipped = layerState && (layerState.completed || layerState.skipped);

        this.maybeRemoveFormListeners(layer.id);
        this._cleanupLayerListeners(layer.id);

        if (wasCompletedOrSkipped && layerEl) {
            if (this.preserveDOM) {
                layerEl.classList.add('layer-completed');
                layerEl.style.display = 'none';
            } else {
                layerEl.remove();
            }
        }
        this.activeLayerEls.delete(layer.id);

        if (skipResume) return;

        // If there are more pending layers at current time, show them directly
        // without a play/pause cycle (which breaks YouTube after seeking).
        if (wasCompletedOrSkipped && this.hasPendingLayerAtTime()) {
            this.checkLayersAtTime(this.player.currentTime);
            return;
        }

        // No more layers — resume video
        if (wasCompletedOrSkipped || this.currentDisplayedLayers.size === 0) {
            this.resumeVideo();
        }
    }

    /**
     * Check if there are pending layers that should show at current time
     */
    hasPendingLayerAtTime() {
        if (!this.player) return false;
        const currentTime = this.player.currentTime;
        return this.layers.some(layer => {
            const state = this.layerStates.get(layer.id);
            if (!state || state.completed || state.skipped) return false;
            if (layer.type === 'hotspot') return false;
            return this.shouldShowLayer(layer, currentTime);
        });
    }

    /**
     * Pause video
     */
    pauseVideo() {
        if (this.player) {
            this.player.pause();
        }
    }

    /**
     * YouTube can get stuck forever if it is paused during the initial waiting
     * state. Let the first play request reach "playing", then handlePlaying()
     * pauses the video behind the blocking layer.
     */
    pauseVideoForBlockingLayer() {
        if (!this.player) return;

        const isInitialYouTubeWait = !this.player.hasAttribute('data-started')
            && this.player.hasAttribute('data-waiting');

        if (isInitialYouTubeWait) {
            return;
        }

        this.pauseVideo();
    }

    /**
     * Resume video
     */
    resumeVideo() {
        if (!this.player) return;

        const shouldNudgeYouTube = this.isInitialYouTubeWait();
        const playPromise = this.player.play();
        if (shouldNudgeYouTube) {
            this.playYouTubeIframe();
        }
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                if (!this.player) return;
                this.player.addEventListener('can-play', () => {
                    if (this.player && !this.hasBlockingLayer()) {
                        this.player.play().catch(() => {});
                        this.playYouTubeIframe();
                    }
                }, { once: true });
            });
        }
    }

    isInitialYouTubeWait() {
        if (!this.player) return false;
        return !this.player.hasAttribute('data-started')
            && this.player.hasAttribute('data-waiting')
            && !!this.player.querySelector('iframe.vds-youtube');
    }

    playYouTubeIframe() {
        const iframe = this.player?.querySelector('iframe.vds-youtube');
        if (!iframe?.contentWindow) return;

        iframe.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
            '*'
        );
    }

    /**
     * Cleanup method
     */
    destroy({ skipResume = false } = {}) {
        clearTimeout(this._seekSettleTimeout);
        if (this._seekPlayingHandler && this.player) {
            this.player.removeEventListener('playing', this._seekPlayingHandler);
        }

        if (this.player) {
            this.player.removeEventListener('time-update', this._boundHandleTimeUpdate);
            this.player.removeEventListener('play', this._boundHandlePlay);
            this.player.removeEventListener('playing', this._boundHandlePlaying);
        }

        // Remove all active layers (also calls _cleanupLayerListeners via hideLayer)
        this.currentDisplayedLayers.forEach(layerId => {
            const layer = this.layers.find(l => l.id === layerId);
            if (layer) {
                this.hideLayer(layer, { skipResume });
            }
        });

        // Clean up any remaining tracked layer listeners
        this._layerDomListeners.forEach((_, layerId) => {
            this._cleanupLayerListeners(layerId);
        });

        if (this.timeSliderEl) {
            this.timeSliderEl.removeEventListener('media-seek-request', this._boundPreventSeekHandler);
        }

        if (this.seekButtons && this.seekButtons.length) {
            this.seekButtons.forEach(button => {
                button.removeEventListener('media-seek-request', this._boundPreventSeekHandler);
            });
        }
    }

    /**
     * Check if there's an active blocking layer (CTA/Form)
     */
    hasBlockingLayer() {
        if (!this.currentDisplayedLayers.size) {
            return false;
        }
        return Array.from(this.currentDisplayedLayers).some(layerId => {
            const layer = this.layers.find(l => l.id === layerId);
            return layer && layer.type !== 'hotspot';
        });
    }
}

export default LayersManager;
