import { mergeSegments, sumWatched, computeCoverage } from './progression/coverage.js';

class MediaWatchTracker {
    constructor(player, options = {}) {
        this.player = player;
        this.options = {
            completionThreshold: 80,
            onComplete: null,
            onProgressUpdate: null,
            mediaId: null,
            segmentUpdateInterVal: 5,
            ...options
        };

        this.segments = [];
        this.duration = 0;
        this.startTime = 0;
        this.endTime = 0;
        this.seeking = false;
        this.completed = false;
        this.isPlaying = false;

        this.attachEventListeners();
    }

    attachEventListeners() {
        this._handleSeeking = this.handleSeeking.bind(this);
        this._handleSeeked = this.handleSeeked.bind(this);
        this._handleTimeUpdate = this.handleTimeUpdate.bind(this);
        this._handleEnded = this.handleEnded.bind(this);
        this._handlePause = this.handlePause.bind(this);
        this._handlePlay = this.handlePlay.bind(this);
        this.player.addEventListener("seeking", this._handleSeeking);
        this.player.addEventListener("seeked", this._handleSeeked);
        this.player.addEventListener("time-update", this._handleTimeUpdate);
        this.player.addEventListener("ended", this._handleEnded);
        this.player.addEventListener("pause", this._handlePause);
        this.player.addEventListener("play", this._handlePlay);
        this.handleLoadedMetadata();
    }

    handleLoadedMetadata() {
        this.duration = this.getPlayerDuration();
        this.startTime = this.getPlayerCurrentTime();
        this.endTime = this.startTime;
    }

    /**
     * Ensure duration is available. Player may not have been ready at construction time.
     */
    ensureDuration() {
        if (!this.duration) {
            this.duration = this.getPlayerDuration();
        }
    }

    handleSeeking() {
        // Save the segment watched before this seek
        if (this.isPlaying) {
            this.addWatchedSegment();
        }
        this.seeking = true;
    }

    handleSeeked() {
        this.startTime = this.getPlayerCurrentTime();
        this.endTime = this.startTime;
        this.seeking = false;
    }

    handlePlay() {
        this.ensureDuration();
        this.startTime = this.getPlayerCurrentTime();
        this.endTime = this.startTime;
        this.isPlaying = true;
    }

    handlePause() {
        this.endTime = this.getPlayerCurrentTime();
        this.addWatchedSegment();
        this.isPlaying = false;
    }

    handleTimeUpdate() {
        if (!this.seeking && this.isPlaying) {
            const currentTime = this.getPlayerCurrentTime();

            // Detect seek-like jump: VidStack may update currentTime before firing 'seeking'
            // Save the real watched segment before the jump overwrites endTime
            const jump = currentTime - this.endTime;
            if (this.endTime > this.startTime && Math.abs(jump) > 2) {
                this.addWatchedSegment();
                this.startTime = currentTime;
            }

            this.endTime = currentTime;
            const timeDiff = this.endTime - this.startTime;
            if (timeDiff > this.options.segmentUpdateInterVal) {
                this.addWatchedSegment();
                this.notifyProgressUpdate();
            }
        }
        this.checkCompletion();
    }

    handleEnded() {
        this.ensureDuration();
        this.endTime = this.getPlayerCurrentTime();
        this.addWatchedSegment();
        this.isPlaying = false;
        this.checkCompletion();
        this.notifyProgressUpdate();
    }

    getPlayerCurrentTime() {
        // A disposed Vidstack element (e.g. Bricks re-render) makes the currentTime getter
        // itself throw, so read it under try/catch to keep destroy()/flush from crashing.
        try {
            const t = typeof this.player.currentTime === "function"
                ? this.player.currentTime()
                : (this.player.currentTime || 0);
            this._lastCurrentTime = t;
            return t;
        } catch (_) {
            // Prefer the last good position over 0 so a disposal-time flush stays accurate.
            return this._lastCurrentTime || this.endTime || this.startTime || 0;
        }
    }

    getPlayerDuration() {
        try {
            if (typeof this.player.duration === "function") {
                return this.player.duration();
            }
            return this.player.duration || 0;
        } catch (_) {
            return this.duration || 0;
        }
    }

    addWatchedSegment() {
        this.ensureDuration();
        if (!this.duration || this.startTime >= this.endTime) return;
        const start = Math.max(0, Math.min(this.startTime, this.duration));
        const end = Math.max(0, Math.min(this.endTime, this.duration));
        if (end - start > 0.1) {
            this.segments.push({ start, end });
            this.mergeOverlappingSegments();
        }
        // Update start time to current end time for next segment
        this.startTime = this.endTime;
    }

    mergeOverlappingSegments() {
        this.segments = mergeSegments(this.segments);
    }

    checkCompletion() {
        const percentage = this.getWatchedPercentage();
        if (percentage >= this.options.completionThreshold && !this.completed) {
            this.completed = true;

            if (typeof this.options.onComplete === "function") {
                this.options.onComplete({
                    mediaId: this.options.mediaId,
                    percentage: percentage,
                    watchedTime: this.getTotalWatchedTime(),
                    segments: this.segments
                });
            }
            this.dispatchCompletionEvent(percentage);
            this.notifyProgressUpdate();
        }
    }

    notifyProgressUpdate() {
        if (typeof this.options.onProgressUpdate === "function") {
            this.options.onProgressUpdate({
                mediaId: this.options.mediaId,
                percentage: this.getWatchedPercentage(),
                watchedTime: this.getTotalWatchedTime(),
                segments: this.segments,
                completed: this.completed
            });
        }
    }

    dispatchCompletionEvent(percentage) {
        try {
            const event = new CustomEvent("playlist-media-completed", {
                detail: {
                    mediaId: this.options.mediaId,
                    percentage: percentage,
                    watchedTime: this.getTotalWatchedTime(),
                    segments: this.segments
                }
            });
            this.player.dispatchEvent(event);
        } catch (e) {
            console.warn("Could not dispatch completion event", e);
        }
    }

    getWatchedPercentage() {
        return computeCoverage(this.segments, this.duration) * 100;
    }

    getTotalWatchedTime() {
        return sumWatched(this.segments);
    }

    loadProgress(segments) {
        if (Array.isArray(segments)) {
            this.segments = segments;
            this.mergeOverlappingSegments();
        }
        this.checkCompletion();
    }

    reset() {
        this.segments = [];
        this.startTime = 0;
        this.endTime = 0;
        this.completed = false;
    }

    destroy() {
        this.player.removeEventListener("seeking", this._handleSeeking);
        this.player.removeEventListener("seeked", this._handleSeeked);
        this.player.removeEventListener("time-update", this._handleTimeUpdate);
        this.player.removeEventListener("ended", this._handleEnded);
        this.player.removeEventListener("pause", this._handlePause);
        this.player.removeEventListener("play", this._handlePlay);
    }
}

export default MediaWatchTracker;
