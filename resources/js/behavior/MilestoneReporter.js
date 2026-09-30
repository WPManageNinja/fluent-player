import { reachedMilestones, milestoneKey } from './milestones.js';
import { ClaimChannel, canReport } from './claimChannel.js';

const AJAX_ACTION = 'fluent_player_media_milestone';
const EVAL_THROTTLE_MS = 1000;
const QUARTILE_KEYS = ['q25', 'q50', 'q75'];

function normalizeArmed(armed) {
    const source = armed && typeof armed === 'object' ? armed : {};
    const quartiles = Array.isArray(source.quartiles)
        ? source.quartiles.filter((q) => QUARTILE_KEYS.includes(q))
        : [];
    const completions = Array.isArray(source.completions)
        ? source.completions.map(Number).filter((n) => n > 0 && n <= 1)
        : [];
    return { started: !!source.started, quartiles, completions };
}

class MilestoneReporter {
    constructor(watchTracker, options = {}) {
        this.watchTracker = watchTracker;
        this.player = watchTracker ? watchTracker.player : null;
        this.mediaId = options.mediaId;
        this.armed = normalizeArmed(options.armed);
        this.canReport = canReport(options);

        this.channel = new ClaimChannel({
            action: AJAX_ACTION,
            nonce: options.nonce,
            mediaId: options.mediaId,
            buildEvidence: () => ({
                segments: JSON.stringify(this.watchTracker?.segments || []),
                duration: Math.round(Number(this.watchTracker?.duration) || 0),
                ended: this.ended ? 1 : 0,
            }),
        });

        this.started = false;
        this.ended = false;
        this._lastEvalAt = 0;

        this._onPlay = this._handlePlay.bind(this);
        this._onTimeUpdate = this._handleTimeUpdate.bind(this);
        this._onPause = this._handlePause.bind(this);
        this._onEnded = this._handleEnded.bind(this);
        this._onVisibility = this._handleVisibility.bind(this);
        this._onBeforeUnload = this._handleBeforeUnload.bind(this);

        this._attach();
    }

    get fired() {
        return this.channel.fired;
    }

    get pending() {
        return this.channel.pending;
    }

    get attempts() {
        return this.channel.attempts;
    }

    get sending() {
        return this.channel.sending;
    }

    hasArmedMilestones() {
        return this.armed.started || this.armed.quartiles.length > 0 || this.armed.completions.length > 0;
    }

    _attach() {
        if (!this.watchTracker || !this.player || !this.mediaId) return;
        if (!this.canReport || !this.hasArmedMilestones()) return;

        this.player.addEventListener('play', this._onPlay);
        this.player.addEventListener('time-update', this._onTimeUpdate);
        this.player.addEventListener('pause', this._onPause);
        this.player.addEventListener('ended', this._onEnded);
        document.addEventListener('visibilitychange', this._onVisibility);
        window.addEventListener('beforeunload', this._onBeforeUnload);
        this._attached = true;
    }

    _handlePlay() {
        this.started = true;
        this._tick(true, false);
        // Stamp the server session clock so the first real crossing isn't temporally capped.
        if (!this._baselineSent) {
            this._baselineSent = true;
            if (this.channel.pending.size === 0) {
                this._captureNow();
                this.channel.ping([], false);
            }
        }
    }

    _handleTimeUpdate() {
        this._tick(false, false);
    }

    _handlePause() {
        this._tick(true, false);
    }

    _handleEnded() {
        this.ended = true;
        this._tick(true, false);
    }

    _handleVisibility() {
        if (document.visibilityState === 'hidden') {
            this._tick(true, true);
            this._persistEvidence();
        }
    }

    _handleBeforeUnload() {
        this._tick(true, true);
        this._persistEvidence();
    }

    /**
     * A session that never crosses a milestone locally must still persist its watch
     * time — cross-session accumulation and watched-% conditions depend on it.
     */
    _persistEvidence() {
        if (!this._attached || !this.started) return;
        if (this.channel.pending.size > 0) return;
        const watched = this.watchTracker ? this.watchTracker.getTotalWatchedTime() : 0;
        if (watched <= (this._lastPersistedWatched || 0)) return;
        this._lastPersistedWatched = watched;
        this._captureNow();
        this.channel.ping([], true);
    }

    _tick(force, useBeacon) {
        if (!this._attached) return;

        const now = Date.now();
        if (!force && now - this._lastEvalAt < EVAL_THROTTLE_MS) return;
        this._lastEvalAt = now;

        this._captureNow();

        this.channel.claim(reachedMilestones(this._evidence(), this.armed).map(milestoneKey));
        this.channel.flush(useBeacon);
    }

    _captureNow() {
        const t = this.watchTracker;
        if (t && t.isPlaying) {
            t.endTime = t.getPlayerCurrentTime();
            t.addWatchedSegment();
        }
    }

    _evidence() {
        const duration = Number(this.watchTracker.duration) || 0;
        const coverage = this.watchTracker.getWatchedPercentage() / 100;
        // mirrors the server's ≥1s started gate, else the play-instant ping is marked sent while refused
        const watched = this.watchTracker.getTotalWatchedTime();
        return {
            coverage,
            durationKnown: duration > 0,
            started: this.started && (duration > 0 ? watched >= 1 : true),
            ended: this.ended,
            maxCoverage: duration > 1 ? (duration - 1) / duration : 1,
        };
    }

    destroy() {
        if (this.channel.pending.size > 0) {
            this._tick(true, true);
        } else {
            this._persistEvidence();
        }
        if (this._attached) {
            this.player.removeEventListener('play', this._onPlay);
            this.player.removeEventListener('time-update', this._onTimeUpdate);
            this.player.removeEventListener('pause', this._onPause);
            this.player.removeEventListener('ended', this._onEnded);
            document.removeEventListener('visibilitychange', this._onVisibility);
            window.removeEventListener('beforeunload', this._onBeforeUnload);
            this._attached = false;
        }
        this.watchTracker = null;
    }
}

export default MilestoneReporter;
