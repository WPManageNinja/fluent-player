/**
 * Fluent Player - Timed Content Frontend Controller
 *
 * Connects to FluentPlayer instances and shows/hides timed content
 * sections based on the current video playback position.
 */

class TimedContentController {
    constructor(container) {
        this.container = container;
        // data-media-id lives on the parent .fp-media-block wrapper
        this.parentBlock = container.closest('.fp-media-block');
        this.mediaId = this.parentBlock?.dataset.mediaId;
        this.sections = container.querySelectorAll('.fp-timed-content');
        this.player = null;
        this.activeSection = null;
        this._listeners = [];

        if (this.sections.length === 0) return;

        // Parse time data for each section
        this.sectionData = Array.from(this.sections).map((el) => ({
            el,
            start: parseFloat(el.dataset.start) || 0,
            end: parseFloat(el.dataset.end) || Infinity,
        }));

        this.findPlayer();
    }

    /**
     * Find the FluentPlayer <media-player> element associated with this container.
     * Player and timed content container are siblings inside .fp-media-block.
     */
    findPlayer() {
        // Strategy 1: Look inside the parent .fp-media-block wrapper
        let playerWrapper = this.parentBlock?.querySelector('.fluent-player');

        if (!playerWrapper && this.mediaId) {
            // Strategy 2: Search by media ID anywhere on page
            const selector = `.fluent-player .fluent-player-container[data-media-id="${this.mediaId}"]`;
            const playerContainer = document.querySelector(selector);
            if (playerContainer) {
                playerWrapper = playerContainer.closest('.fluent-player');
            }
        }

        if (!playerWrapper) return;

        this.player = playerWrapper.querySelector('media-player');
        if (!this.player) return;

        this.bindEvents();
    }

    bindEvents() {
        let lastUpdate = 0;
        const THROTTLE_MS = 300;

        const onTimeUpdate = () => {
            const now = Date.now();
            if (now - lastUpdate < THROTTLE_MS) return;
            lastUpdate = now;
            this.updateVisibility(this.player.currentTime);
        };

        const onSeeked = () => {
            // Immediate update on seek (bypass throttle)
            this.updateVisibility(this.player.currentTime);
        };

        const onEnded = () => {
            this.hideAll();
        };

        this.player.addEventListener('time-update', onTimeUpdate);
        this.player.addEventListener('seeked', onSeeked);
        this.player.addEventListener('ended', onEnded);

        this._listeners = [
            ['time-update', onTimeUpdate],
            ['seeked', onSeeked],
            ['ended', onEnded],
        ];

        // Sync visibility now: time-update/seek never fires in a paused editor preview
        // (Divi canvas), and a [0,x] section would stay hidden until play on the frontend.
        this.updateVisibility(this.player.currentTime || 0);
    }

    /**
     * Show the section matching the current time, hide all others.
     */
    updateVisibility(currentTime) {
        let matched = null;

        for (const data of this.sectionData) {
            if (currentTime >= data.start && currentTime < data.end) {
                matched = data;
                break;
            }
        }

        if (matched && matched.el !== this.activeSection) {
            if (this.activeSection) {
                this.activeSection.classList.remove('fp-tc-visible');
            }
            matched.el.classList.add('fp-tc-visible');
            this.activeSection = matched.el;
        } else if (!matched && this.activeSection) {
            this.activeSection.classList.remove('fp-tc-visible');
            this.activeSection = null;
        }
    }

    hideAll() {
        this.sections.forEach((section) => {
            section.classList.remove('fp-tc-visible');
        });
        this.activeSection = null;
    }

    destroy() {
        if (this.player && this._listeners) {
            this._listeners.forEach(([event, handler]) => {
                this.player.removeEventListener(event, handler);
            });
        }
        this._listeners = [];
    }
}

/**
 * Initialize all timed content containers on the page.
 */
function initTimedContent() {
    const containers = document.querySelectorAll('.fp-timed-content-container');
    containers.forEach((container) => {
        if (container._fpTimedContent) return;
        container._fpTimedContent = new TimedContentController(container);
    });
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTimedContent);
} else {
    initTimedContent();
}

// Re-initialize for SPA navigation (FluentCommunity)
document.addEventListener('FComMediaReady', initTimedContent);
document.addEventListener('InitSingleFluentPlayer', initTimedContent);

// Test seam: the Vite build already emits an ES module for this entry, so these
// named exports add no runtime cost in the browser (the bundle is loaded the
// same way) while letting the Vitest suite import the controller directly.
export { TimedContentController, initTimedContent };
