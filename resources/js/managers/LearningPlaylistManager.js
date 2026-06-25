import MediaWatchTracker from "../MediaWatchTracker.js";
import $t from "../translator.js";

/**
 * Learning Playlist Manager
 * Handles learning-specific functionality like progress tracking, chapter navigation, and locked content
 */
class LearningPlaylistManager {
    constructor(playlistInstance, options = {}) {
        this.playlist = playlistInstance;
        this.options = {
            enableProgress: true,
            enableChapters: true,
            completionThreshold: 80,
            showLockedContent: true,
            ...options
        };

        this.progressData = new Map();
        this.currentTracker = null;
        this.completedLessons = [];

        this.init();
    }

    normalizeId(id) {
        return String(id);
    }

    init() {
        this.loadProgressData();
        this.setupEventListeners();
        this.updateUI();
    }

    /**
     * Load user progress data from storage/API
     */
    loadProgressData() {
        // Load from localStorage first
        const stored = localStorage.getItem(`fluent_learning_progress_${this.playlist.playlist.ID}`);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.progressData = new Map(data);
            } catch (e) {
                console.warn('Failed to load learning progress data:', e);
            }
        }

        // TODO: Load from server for logged-in users
    }

    isMediaCompleted(mediaId) {
        const key = this.normalizeId(mediaId);
        return this.progressData.has(key) && this.progressData.get(key).completed;
    }

    /**
     * Save progress data to storage
     */
    saveProgressData() {
        const data = Array.from(this.progressData.entries());
        localStorage.setItem(`fluent_learning_progress_${this.playlist.playlist.ID}`, JSON.stringify(data));

        // TODO: Save to server for logged-in users
    }

    /**
     * Set up event listeners for learning features
     */
    setupEventListeners() {
        // Track listeners for cleanup
        this._listeners = [];

        // Create tracker when media metadata is loaded
        this._loadedMetadataHandler = () => {
            this.initTracker();
        };
        this.playlist.player.addEventListener('loaded-metadata', this._loadedMetadataHandler);
        this._listeners.push({ el: this.playlist.player, event: 'loaded-metadata', handler: this._loadedMetadataHandler });

        // Listen for playlist item clicks
        this._clickHandler = (e) => {
            const item = e.target.closest('.learning-item');
            if (item && item.classList.contains('locked')) {
                e.preventDefault();
                this.showLockedMessage(item);
            }
        };
        this.playlist.container.addEventListener('click', this._clickHandler);
        this._listeners.push({ el: this.playlist.container, event: 'click', handler: this._clickHandler });
    }

    /**
     * Initialize video tracker when media is ready
     */
    initTracker() {
        const currentMedia = this.playlist.currentMedia;
        if (!currentMedia || !this.playlist.player.duration) return;

        const mediaId = this.normalizeId(currentMedia.ID);

        // Clean up previous tracker if exists
        if (this.currentTracker) {
            this.currentTracker.destroy();
        }

        // Get existing progress data
        const progressData = this.progressData.get(mediaId);

        // Initialize progress data for this media if not exists
        if (!progressData) {
            this.progressData.set(mediaId, {
                started: true,
                progress: 0,
                completed: false,
                lastPosition: 0,
                segments: []
            });
            this.saveProgressData();
            this.updateUI();
        } else if (progressData.completed) {
            this.updateVideoProgress({
                mediaId: mediaId,
                percentage: 100,
                watchedTime: this.playlist.player.duration,
                segments: progressData.segments,
                completed: true
            });
            return;
        }

        // Initialize tracker
        this.currentTracker = new MediaWatchTracker(this.playlist.player, {
            completionThreshold: this.options.completionThreshold,
            mediaId: mediaId,
            onProgressUpdate: (data) => {
                this.updateVideoProgress(data);
            },
            onComplete: (data) => {
                this.onMediaCompleted(data.mediaId);
            }
        });

        // Load existing segments if available
        if (progressData && progressData.segments && progressData.segments.length > 0) {
            this.currentTracker.loadProgress(progressData.segments);
        }
    }

    /**
     * Update video progress from tracker
     */
    updateVideoProgress(data) {
        const mediaId = data.mediaId;
        if (!mediaId) return;

        const key = this.normalizeId(mediaId);
        if (!this.progressData.has(key)) {
            this.progressData.set(key, {
                started: true,
                progress: 0,
                completed: false,
                lastPosition: 0,
                segments: []
            });
        }

        const progressData = this.progressData.get(key);
        progressData.progress = data.percentage;
        progressData.lastPosition = this.playlist.player.currentTime;
        progressData.segments = data.segments;

        // Check for completion
        if (data.percentage >= this.options.completionThreshold && !progressData.completed) {
            progressData.completed = true;
            this.onMediaCompleted(key);
        }

        this.saveProgressData();
        this.updateUI();
    }

    /**
     * Handle lesson completion
     */
    onMediaCompleted(mediaId) {
        // Update progress data
        const key = this.normalizeId(mediaId);
        if (this.progressData.has(key)) {
            const data = this.progressData.get(key);
            data.completed = true;
            this.saveProgressData();
        }
        // Update server completion state
        this.playlist.setMediaCompleted(mediaId, true);

        // Update UI to show completion
        const item = this.playlist.container.querySelector(`[data-media-id="${this.normalizeId(mediaId)}"]`);
        if (item) {
            item.classList.add('completed');
        }
        this.updateUI();

        // Unlock next lesson if applicable
        this.unlockNextLesson(this.normalizeId(mediaId));
    }

    syncCompletionState(mediaId, completed) {
        mediaId = this.normalizeId(mediaId);
        if (completed) {
            if (this.progressData.has(mediaId) && this.progressData.get(mediaId).completed) {
                return;
            }
            this.onMediaCompleted(mediaId);
        } else {
            this.onMediaIncomplete(mediaId);
        }
    }

    onMediaIncomplete(mediaId) {
        mediaId = this.normalizeId(mediaId);
        if (this.progressData.has(mediaId)) {
            const data = this.progressData.get(mediaId);
            data.completed = false;
            data.segments = [];
            this.saveProgressData();
        }
        this.playlist.setMediaCompleted(mediaId, false);
        this.updateUI();
    }

    /**
     * Show locked content message
     */
    showLockedMessage(item) {
        // Create and show tooltip/message
        const message = document.createElement('div');
        message.className = 'learning-locked-tooltip';
        message.setAttribute('role', 'status');
        message.setAttribute('aria-live', 'polite');
        message.textContent = $t('Complete previous lessons to unlock this content');
        item.appendChild(message);

        setTimeout(() => message.remove(), 3000);
    }

    /**
     * Unlock next lesson
     */
    unlockNextLesson(completedMediaId) {
        const items = Array.from(this.playlist.container.querySelectorAll('.learning-item'));
        const completedIndex = items.findIndex(item =>
            item.dataset.mediaId === completedMediaId
        );

        if (completedIndex >= 0 && completedIndex < items.length - 1) {
            const nextItem = items[completedIndex + 1];
            nextItem.classList.remove('locked');
            nextItem.removeAttribute('aria-disabled');
        }
    }

    /**
     * Update UI elements
     */
    updateUI() {
        this.updateProgressBars();
        this.updateLessonStatuses();
        this.updateOverallProgress();
        this.playlist.updateNavigationButtons();
        this.playlist.updateFooterCompletionButton();
        this.playlist.updateSidebarCompletionForIndex(this.playlist.currentMediaIndex);
    }

    /**
     * Update progress bars for individual lessons
     */
    updateProgressBars() {
        this.playlist.container.querySelectorAll('.learning-item').forEach(item => {
            const key = this.normalizeId(item.dataset.mediaId);
            const progressBar = item.querySelector('.thumbnail-progress .progress-fill');

            if (progressBar && this.progressData.has(key)) {
                const progress = this.progressData.get(key).progress;
                progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
            }
        });
    }

    /**
     * Update lesson completion statuses
     */
    updateLessonStatuses() {
        this.playlist.container.querySelectorAll('.learning-item').forEach(item => {
            const key = this.normalizeId(item.dataset.mediaId);

            if (this.progressData.has(key)) {
                const data = this.progressData.get(key);

                if (data.completed) {
                    item.classList.add('completed');
                    item.classList.remove('locked');
                    item.removeAttribute('aria-disabled');
                } else {
                    item.classList.remove('completed');
                    if (this.isLessonLocked(item)) {
                        item.classList.add('locked');
                        item.setAttribute('aria-disabled', 'true');
                    } else {
                        item.classList.remove('locked');
                        item.removeAttribute('aria-disabled');
                    }
                }
            } else {
                item.classList.toggle('completed', false);
                if (this.isLessonLocked(item)) {
                    item.classList.add('locked');
                    item.setAttribute('aria-disabled', 'true');
                } else {
                    item.classList.remove('locked');
                    item.removeAttribute('aria-disabled');
                }
            }
        });
    }

    /**
     * Update overall course progress
     */
    updateOverallProgress() {
        const progressContainer = this.playlist.container.querySelector('.progress-container');
        if (!progressContainer) return;

        const totalLessons = this.playlist.medias.length;
        let completedLessons = 0;

        this.playlist.medias.forEach(media => {
            const key = this.normalizeId(media.ID);
            const data = this.progressData.get(key);
            if (data && data.completed) {
                completedLessons += 1;
            }
        });

        const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

        const progressFill = progressContainer.querySelector('.progress-fill');
        const progressText = progressContainer.querySelector('.progress-text');
        const progressPercentage = progressContainer.querySelector('.progress-percentage');

        if (progressFill) {
            progressFill.style.width = `${Math.max(0, Math.min(100, overallProgress))}%`;
        }

        if (progressText) {
            progressText.textContent = $t('%1$d/%2$d completed', completedLessons, totalLessons);
        }

        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(Math.max(0, Math.min(100, overallProgress)))}%`;
        }
    }

    destroy() {
        if (this.currentTracker) {
            this.currentTracker.destroy();
            this.currentTracker = null;
        }
        // Remove all tracked event listeners
        if (this._listeners) {
            for (const { el, event, handler } of this._listeners) {
                el.removeEventListener(event, handler);
            }
            this._listeners = [];
        }
    }

    /**
     * Check if a lesson is locked
     */
    isLessonLocked(item) {
        if (!this.options.showLockedContent) return false;

        const items = Array.from(this.playlist.container.querySelectorAll('.learning-item'));
        const currentIndex = items.indexOf(item);

        for (let i = 0; i < currentIndex; i++) {
            const prevItem = items[i];
            const prevKey = this.normalizeId(prevItem.dataset.mediaId);
            const data = this.progressData.get(prevKey);
            if (!data || !data.completed) {
                return true;
            }
        }

        return false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LearningPlaylistManager;
}

export default LearningPlaylistManager;