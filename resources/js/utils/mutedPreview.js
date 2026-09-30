/**
 * Muted preview runtime — silent looping autoplay with a click-for-sound
 * overlay. The overlay and the `fp-muted-preview` state class are server
 * rendered (present from first paint); this module only wires behavior.
 *
 * Pro options honored when present (all under mutedPreviewConfig):
 * captions (subtitles during the silent loop), range {start, end} (loop
 * window), clickBehavior ('continue' keeps the preview position on convert
 * instead of restarting).
 */

export const NEAR_END_SECONDS = 0.25;
const CAPTIONS_GUARD_TICK_MS = 150;
const UNMUTE_REASSERT_WINDOW_MS = 3000;

/**
 * Whether the preview premise fails in this context and the player should
 * degrade to a normal click-to-play player.
 *
 * @param {Object} settings Media settings.
 * @param {HTMLElement} container Player root element.
 * @return {boolean}
 */
export function shouldSkipPreview(settings, container) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
        return true;
    }

    if (settings?.viewType === 'audio') {
        return true;
    }

    if (settings?.streamType && settings.streamType !== 'on-demand') {
        return true;
    }

    const body = container?.ownerDocument?.body;
    if (body && (
        body.classList.contains('elementor-editor-active') ||
        body.classList.contains('block-editor-page') ||
        body.classList.contains('et-fb') ||
        /(\?|&)et_fb=1(&|$)/.test(window.location.search)
    )) {
        return true;
    }

    return false;
}

/**
 * Strip the server-rendered preview state so the player behaves as a normal
 * click-to-play player (used when shouldSkipPreview is true).
 *
 * @param {Object} fp FluentPlayer instance.
 */
function teardownServerPreviewState(fp) {
    fp.container.classList.remove('fp-muted-preview');
    fp.container.querySelector('.fp-muted-preview-overlay')?.remove();
    fp.player?.removeAttribute('autoplay');
    if (fp.player && !fp.settings?.muted) {
        fp.player.muted = false;
    }
}

/**
 * Resolve the preview range loop window [start, end) from settings.
 * end = 0 means "to the natural end".
 *
 * @param {Object} settings Media settings.
 * @return {{start: number, end: number}}
 */
export function getLoopWindow(settings) {
    const range = settings?.mutedPreviewConfig?.range || {};
    const start = Math.max(0, parseFloat(range.start) || 0);
    let end = parseFloat(range.end) || 0;
    if (end <= start) {
        end = 0;
    }
    return { start, end };
}

/**
 * Resolve a loop window against the known duration. A start at/past the end, or
 * a window too small to play, falls back to the full video — a stale range must
 * degrade, never freeze the preview.
 *
 * @param {{start: number, end: number}} loopWindow Window from getLoopWindow().
 * @param {number} duration Known media duration in seconds.
 * @return {{start: number, end: number}}
 */
export function resolveLoopWindow(loopWindow, duration) {
    const start = loopWindow.start;
    const end = loopWindow.end > 0 ? Math.min(loopWindow.end, duration) : duration;
    if (start >= duration - NEAR_END_SECONDS || end - start < 1) {
        return { start: 0, end: duration };
    }
    return { start, end };
}

/**
 * Continuous caption guard for the silent loop: the flag is authoritative
 * both ways — on shows a track (default-flagged preferred), off suppresses
 * every track, even one Vidstack default-enables after startup. Polls for the
 * whole preview because remote providers register tracks late; a late
 * 'showing' is recorded as that track's natural mode for the restore.
 *
 * @param {Object} player Vidstack media-player element.
 * @param {boolean} wantCaptions Whether captions should show during preview.
 * @param {Function} isDone Returns true when the guard should stop itself.
 * @return {Function} Stops the guard and restores the pre-preview modes.
 */
export function startPreviewCaptionsGuard(player, wantCaptions, isDone) {
    let snapshot = null;

    const previewTracks = () => {
        const trackList = player?.textTracks;
        return trackList
            ? [...trackList].filter((track) => track.kind === 'captions' || track.kind === 'subtitles')
            : [];
    };

    const sync = () => {
        if (isDone()) {
            clearInterval(timer);
            return;
        }
        const tracks = previewTracks();
        if (!tracks.length) {
            return;
        }
        if (!snapshot) {
            snapshot = tracks.map((track) => track.mode);
        }
        if (wantCaptions) {
            if (!tracks.some((track) => track.mode === 'showing')) {
                (tracks.find((track) => track.default) || tracks[0]).mode = 'showing';
            }
        } else {
            tracks.forEach((track, index) => {
                if (track.mode === 'showing') {
                    snapshot[index] = 'showing';
                    track.mode = 'disabled';
                }
            });
        }
    };

    const timer = setInterval(sync, CAPTIONS_GUARD_TICK_MS);
    sync();

    return () => {
        clearInterval(timer);
        if (!snapshot) {
            return;
        }
        previewTracks().forEach((track, index) => {
            track.mode = snapshot[index] || 'disabled';
        });
    };
}

/**
 * Wire the muted preview state machine onto a FluentPlayer instance.
 *
 * @param {Object} fp FluentPlayer instance (container, player, settings,
 *                    addEventListener, _armDeferredFeatures).
 * @return {boolean} True when the preview is active; false when skipped.
 */
export function setupMutedPreview(fp) {
    const overlay = fp.container.querySelector('.fp-muted-preview-overlay');

    if (!fp.player || !overlay) {
        return false;
    }

    if (shouldSkipPreview(fp.settings, fp.container)) {
        teardownServerPreviewState(fp);
        return false;
    }

    const loopWindow = getLoopWindow(fp.settings);

    const resolveWindow = (duration) => resolveLoopWindow(loopWindow, duration);

    // Never a native loop: `ended` must not fire during a preview.
    const loopHandler = () => {
        const duration = fp.player.duration;
        if (!duration) {
            return;
        }
        const { start, end } = resolveWindow(duration);
        if (fp.player.currentTime >= end - NEAR_END_SECONDS) {
            fp.player.currentTime = start;
        }
    };
    fp.addEventListener(fp.player, 'time-update', loopHandler);

    const previewStartHandler = () => {
        if (!fp.previewActive) {
            return;
        }
        const duration = fp.player.duration;
        const start = duration ? resolveWindow(duration).start : loopWindow.start;
        if (start > 0 && fp.player.currentTime < start) {
            fp.player.currentTime = start;
        }
    };
    fp.addEventListener(fp.player, 'playing', previewStartHandler, { once: true });

    let converted = false;

    const restoreCaptions = startPreviewCaptionsGuard(
        fp.player,
        !!fp.settings?.mutedPreviewConfig?.captions,
        () => converted || fp._isDestroyed
    );

    const convert = () => {
        if (converted || fp._isDestroyed) {
            return;
        }
        converted = true;
        fp.previewActive = false;
        // The seek to 0 below would otherwise read as a blocked autoplay.
        fp._autoplayVerifyDisarmed = true;

        fp.player.removeEventListener('time-update', loopHandler);
        fp.container.classList.remove('fp-muted-preview');
        overlay.remove();
        restoreCaptions();

        if (fp.settings?.mutedPreviewConfig?.showLogo === false) {
            fp.container.querySelector('.fp-media-logo-overlay')
                ?.style.setProperty('display', 'block', 'important');
        }

        const keepMuted = !!fp.settings?.muted;
        if (fp.settings?.mutedPreviewConfig?.clickBehavior !== 'continue') {
            fp.player.currentTime = 0;
        }
        if (!keepMuted) {
            const volume = parseInt(fp.settings?.mutedPreviewConfig?.volume, 10);
            if (volume >= 10 && volume <= 100) {
                fp.player.volume = volume / 100;
            }
            fp.player.muted = false;
            // Any viewer gesture disarms the re-assert — a manual mute must win.
            const unmuteGuard = () => {
                fp.player.muted = false;
            };
            const disarmUnmuteGuard = () => {
                fp.player?.removeEventListener('playing', unmuteGuard);
                fp.container?.removeEventListener('pointerdown', disarmUnmuteGuard, true);
                fp.container?.removeEventListener('keydown', disarmUnmuteGuard, true);
            };
            fp.addEventListener(fp.player, 'playing', unmuteGuard, { once: true });
            fp.container.addEventListener('pointerdown', disarmUnmuteGuard, true);
            fp.container.addEventListener('keydown', disarmUnmuteGuard, true);
            setTimeout(disarmUnmuteGuard, UNMUTE_REASSERT_WINDOW_MS);
        }
        fp.player.play().catch(() => {});

        fp._armDeferredFeatures?.();
        fp._armDeferredFeatures = null;

        if (fp.mediaId && fp.isSavePlayPositionEnabled?.()) {
            fp.setupSaveResume();
        }

        // Presets can hide the center play button — never drop keyboard focus to body.
        (fp.container.querySelector('media-play-button') || fp.player).focus?.();

        fp.container.dispatchEvent(new CustomEvent('fluentPlayer/mutedPreviewConverted', {
            bubbles: true,
            detail: { mediaId: fp.mediaId },
        }));
    };

    fp.addEventListener(overlay, 'click', convert);

    // No server autoplay attribute for previews — the runtime owns the start; setupAutoplay backs it up.
    const startPlayback = () => {
        if (!converted && !fp._isDestroyed) {
            fp.player.play?.()?.catch?.(() => {});
        }
    };
    if (fp.player.hasAttribute('data-can-play')) {
        startPlayback();
    } else {
        fp.addEventListener(fp.player, 'can-play', startPlayback, { once: true });
    }

    return true;
}
