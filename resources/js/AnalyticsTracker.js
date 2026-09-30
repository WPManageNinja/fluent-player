import MediaWatchTracker from './MediaWatchTracker.js';
import { getAjaxUrl, buildFormData, ajaxPost } from './utils/ajax';

const FLUSH_DEBOUNCE_MS = 30000;

class AnalyticsTracker {
    /**
     * @param {HTMLElement} player - VidStack media-player element
     * @param {number|string} mediaId
     * @param {Object} options
     */
    constructor(player, mediaId, options = {}) {
        this.player = player;
        this.mediaId = mediaId;
        this.nonce = options?.nonce || '';

        const injectedTracker = options?.watchTracker;
        this._ownsWatchTracker = !injectedTracker;
        this.watchTracker = injectedTracker || new MediaWatchTracker(player, {
            completionThreshold: 100,
            mediaId: mediaId,
            segmentUpdateInterVal: 5,
        });

        this.dirty = false;
        this.flushTimer = null;
        this.flushing = false;
        this.lastSentPercentage = 0;
        this.lastSentDuration = 0;

        // Bound handlers for cleanup
        this._onPlay = this._handlePlay.bind(this);
        this._onPause = this._handlePause.bind(this);
        this._onEnded = this._handleEnded.bind(this);
        this._onVisibilityChange = this._handleVisibilityChange.bind(this);
        this._onBeforeUnload = this._handleBeforeUnload.bind(this);

        this._attachListeners();

        // Attached mid-playback (muted preview convert) — no 'play' event will follow.
        if (this.player?.paused === false) {
            this._handlePlay();
        }
    }

    _attachListeners() {
        this.player.addEventListener('play', this._onPlay);
        this.player.addEventListener('pause', this._onPause);
        this.player.addEventListener('ended', this._onEnded);

        document.addEventListener('visibilitychange', this._onVisibilityChange);
        window.addEventListener('beforeunload', this._onBeforeUnload);
    }

    _handlePlay() {
        this.dirty = true;
        // Cancel any pending pause flush — user resumed watching
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
    }

    _handlePause() {
        this.scheduleFlush();
    }

    _handleEnded() {
        this.dirty = true;
        // Flush on next microtask so MediaWatchTracker processes 'ended' first
        Promise.resolve().then(() => this.flush());
    }

    _handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            this._finalizeAndFlush(true);
        }
    }

    _handleBeforeUnload() {
        this._finalizeAndFlush(true);
    }

    /**
     * Force MediaWatchTracker to save its current segment, then flush.
     * Used for page unload / visibility change where pause/ended may not fire.
     */
    _finalizeAndFlush(useBeacon) {
        if (!this.dirty) return;

        // Force the tracker to capture current position and save in-progress segment
        if (this.watchTracker) {
            this.watchTracker.endTime = this.watchTracker.getPlayerCurrentTime();
            this.watchTracker.addWatchedSegment();
        }

        this.flush(useBeacon);
    }

    /**
     * Schedule a debounced flush (30s).
     */
    scheduleFlush() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
        }
        this.flushTimer = setTimeout(() => {
            this.flush();
        }, FLUSH_DEBOUNCE_MS);
    }

    /**
     * Send analytics data to server — only duration and percentage
     * @param {boolean} useBeacon - Use navigator.sendBeacon for page unload reliability
     */
    flush(useBeacon = false) {
        if (!this.dirty || this.flushing) return;
        // A missing per-media nonce can never satisfy Pro's
        // fluent_player_track_event:{id} verification, and falling back to the
        // generic frontend nonce would be silently rejected — skip instead.
        if (!this.mediaId || !this.nonce) {
            if (!this.nonce && !this._warnedMissingNonce) {
                this._warnedMissingNonce = true;
                console.debug('FluentPlayer: analytics beacon skipped — no per-media nonce for media', this.mediaId);
            }
            return;
        }

        // Clear debounce timer
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }

        this.flushing = true;

        if (!this.player?.duration) {
            this.flushing = false;
            return;
        }

        // Get values from MediaWatchTracker
        let percentage = Math.round(this.watchTracker.getWatchedPercentage());
        let watchedDuration = Math.round(this.watchTracker.getTotalWatchedTime());
        // Skip if nothing new to report
        if (percentage <= this.lastSentPercentage && watchedDuration <= this.lastSentDuration) {
            this.flushing = false;
            this.dirty = false;
            return;
        }

        const payload = {
            nonce: this.nonce,
            media_id: this.mediaId,
            duration: watchedDuration,
            percentage: percentage,
        };

        const ajaxUrl = getAjaxUrl();
        if (!ajaxUrl) {
            this.flushing = false;
            return;
        }

        this.dirty = false;

        const markSent = () => {
            this.lastSentPercentage = percentage;
            this.lastSentDuration = watchedDuration;
        };

        if (useBeacon && navigator.sendBeacon) {
            const formData = buildFormData('fluent_player_track_event', payload);
            // sendBeacon returns false when the UA cannot queue the payload. On
            // unload there is no later event to retry, so fall back to a keepalive
            // fetch rather than silently dropping the final flush.
            if (navigator.sendBeacon(ajaxUrl, formData)) {
                markSent();
            } else {
                this.dirty = true;
                this._keepaliveFlush(ajaxUrl, payload, markSent);
            }
            this.flushing = false;
        } else {
            ajaxPost('fluent_player_track_event', payload)
                .then((response) => {
                    // admin-ajax replies HTTP 200 even for nonce/permission
                    // failures, so a resolved promise is not success. Only advance
                    // the sent watermark when the server confirms the write;
                    // otherwise keep the data dirty so the next flush retries it.
                    if (response && response.success) {
                        markSent();
                    } else {
                        this.dirty = true;
                    }
                })
                .catch(() => {
                    this.dirty = true;
                })
                .finally(() => {
                    this.flushing = false;
                });
        }
    }

    /**
     * Best-effort retry for the unload path when sendBeacon refuses to queue.
     * keepalive lets the request outlive the page; success advances the sent
     * watermark, failure leaves the data dirty.
     */
    _keepaliveFlush(ajaxUrl, payload, markSent) {
        try {
            const body = buildFormData('fluent_player_track_event', payload);
            fetch(ajaxUrl, { method: 'POST', body, keepalive: true })
                .then((res) => res.json())
                .then((response) => {
                    if (response && response.success) {
                        markSent();
                        this.dirty = false;
                    }
                })
                .catch(() => { /* terminal on unload; nothing else to try */ });
        } catch (_) {
            /* fetch/keepalive unsupported */
        }
    }

    /**
     * Clean up all listeners and flush pending data
     */
    destroy() {
        if (this.dirty) {
            this._finalizeAndFlush(true);
        }

        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }

        this.player.removeEventListener('play', this._onPlay);
        this.player.removeEventListener('pause', this._onPause);
        this.player.removeEventListener('ended', this._onEnded);

        document.removeEventListener('visibilitychange', this._onVisibilityChange);
        window.removeEventListener('beforeunload', this._onBeforeUnload);

        if (this.watchTracker) {
            if (this._ownsWatchTracker) {
                this.watchTracker.destroy();
            }
            this.watchTracker = null;
        }
    }
}

export default AnalyticsTracker;
