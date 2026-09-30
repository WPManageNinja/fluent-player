import { throttle } from './utils/throttle.js';
import $t from './translator.js';

// Binds to the Vidstack <media-player> directly, so it works without a FluentPlayer instance.

// Lets initChapterStrips sweep strips whose player was removed via destroyContainer, which
// fires no DestroyFluentPlayer event.
const activeStrips = new Map();

const FOLLOW_SUSPEND_MS = 8000;

const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function smoothScroll(el, options) {
    el.scrollTo({ ...options, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

function scrollIntoView(el, inline) {
    el.scrollIntoView({ inline, block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

function bindStrip(root) {
    if (root.dataset.fpStripBound) return;
    const rail = root.querySelector('.fp-chapters-rail');
    const container = root.closest('.fluent-player-container') || root.closest('.fluent-player');
    const player = container && container.querySelector('media-player');
    if (!rail || !player) return;
    root.dataset.fpStripBound = '1';

    // Recorded so teardown() can undo every registration; otherwise the resize listener and
    // ResizeObserver outlive the player and pin the detached DOM.
    const cleanups = [];
    const on = (target, event, handler, opts) => {
        target.addEventListener(event, handler, opts);
        cleanups.push(() => target.removeEventListener(event, handler, opts));
    };

    // Sorted by start, not DOM order — storage keeps author order and the scan below breaks
    // on the first entry that is out of sequence.
    const items = Array.from(rail.querySelectorAll('.fp-chapter-pill'))
        .map((pill) => ({ pill, start: parseFloat(pill.dataset.fpStart) || 0 }))
        .sort((a, b) => a.start - b.start);
    if (!items.length) return;

    const prevBtn = root.querySelector('.fp-chapters-prev');
    const nextBtn = root.querySelector('.fp-chapters-next');
    const jumpBtn = root.querySelector('.fp-chapters-jump');
    // Absent when Pro predates the titled jump button — the generic fallback string stays.
    const jumpTitle = jumpBtn && jumpBtn.querySelector('.fp-chapters-jump-title');
    const isRtl = getComputedStyle(rail).direction === 'rtl';

    // Read from the title attribute — the visible span is ellipsised, so its textContent
    // would bake a literal ellipsis into the label.
    const titleOf = (pill) => {
        if (!pill) return '';
        const full = pill.getAttribute('title');
        if (full) return full;
        const span = pill.querySelector('.fp-chapter-title');
        return span ? span.textContent.trim() : '';
    };
    const labelJump = (pill) => {
        if (!jumpTitle) return;
        const name = titleOf(pill);
        if (!name) return;
        jumpTitle.textContent = name;
        jumpBtn.setAttribute('title', name);
        jumpBtn.setAttribute('aria-label', $t('Jump to the chapter now playing: %s', name));
    };

    // RTL scrolls from 0 down to -max, so normalise to a 0..max distance-from-start.
    const scrolled = () => (isRtl ? -rail.scrollLeft : rail.scrollLeft);
    const maxScroll = () => rail.scrollWidth - rail.clientWidth - 1;

    let followSuspendedUntil = 0;
    const followSuspended = () => performance.now() < followSuspendedUntil;
    const suspendFollow = () => {
        followSuspendedUntil = performance.now() + FOLLOW_SUSPEND_MS;
        syncControls();
    };

    // play() returns a promise that rejects under autoplay policy, which a sync catch misses.
    const safePlay = (target) => {
        if (!target || typeof target.play !== 'function') return;
        try { Promise.resolve(target.play()).catch(() => {}); } catch (_) { /* not ready */ }
    };

    let pendingPill = null;
    const applySeek = (time) => {
        const remote = player.remoteControl;
        if (remote && typeof remote.seek === 'function') {
            // Two-call idiom so iframe providers (YouTube/Vimeo) register a real user seek.
            remote.seeking(time);
            remote.seek(time);
            if (player.paused && typeof remote.play === 'function') safePlay(remote);
            return;
        }
        try {
            player.currentTime = time;
            if (player.paused) safePlay(player);
        } catch (_) { /* provider not ready */ }
    };
    let pendingSeek = null;
    const clearPending = () => {
        if (pendingPill) pendingPill.classList.remove('is-pending');
        pendingPill = null;
        pendingSeek = null;
    };
    // One listener for the strip, not one per click — three clicks while the provider boots
    // must land on the third, not replay all three seeks.
    const onCanPlay = () => {
        const time = pendingSeek;
        clearPending();
        if (time !== null) applySeek(time);
    };
    on(player, 'can-play', onCanPlay);
    // Without this a source that errors leaves the pill pulsing 'pending' forever.
    on(player, 'error', clearPending);
    on(player, 'abort', clearPending);

    const canSeekNow = () =>
        (player.state ? player.state.canPlay : player.hasAttribute('data-can-play'));

    const seekTo = (time, pill) => {
        // Picking a chapter is a request to follow it, and the rail's pointerdown listener has
        // already fired by now — so clear the suspension it just set.
        followSuspendedUntil = 0;
        if (canSeekNow()) {
            clearPending();
            applySeek(time);
            return;
        }
        if (pendingPill && pendingPill !== pill) pendingPill.classList.remove('is-pending');
        pendingPill = pill;
        pendingSeek = time;
        if (pill) pill.classList.add('is-pending');
        // Kick the provider awake; onCanPlay lands the seek the moment it can accept one.
        safePlay(player);
    };

    on(rail, 'click', (event) => {
        const pill = event.target.closest('.fp-chapter-pill');
        if (!pill) return;
        seekTo(parseFloat(pill.dataset.fpStart) || 0, pill);
    });

    // Active chapter follows playback (throttled). DOM only touched when the index changes.
    // Seed from the server-rendered active pill so the first real update clears it.
    let activeIndex = items.findIndex((item) => item.pill.classList.contains('is-active'));
    const setActive = (index) => {
        if (index === activeIndex || index < 0) return;
        // Clear every pill so a server-rendered active state cannot linger beside the live one.
        items.forEach(({ pill }) => {
            pill.classList.remove('is-active');
            pill.removeAttribute('aria-current');
        });
        activeIndex = index;
        const pill = items[index] && items[index].pill;
        if (pill) {
            pill.classList.add('is-active');
            pill.setAttribute('aria-current', 'true');
            labelJump(pill);
            if (!followSuspended()) scrollIntoView(pill, 'center');
        }
        syncControls();
    };

    const onTimeUpdate = throttle(() => {
        const t = player.currentTime || 0;
        let index = 0;
        for (let i = 0; i < items.length; i++) {
            if (t >= items[i].start) index = i; else break;
        }
        setActive(index);
    }, 400);
    on(player, 'time-update', onTimeUpdate);

    // Keyboard: Tab lands on a pill → bring it into view.
    items.forEach(({ pill }) => on(pill, 'focus', () => scrollIntoView(pill, 'nearest')));

    // Input events, not 'scroll' — follow's own smooth scroll fires 'scroll' and would
    // suspend the very behaviour that caused it.
    ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((evt) =>
        on(rail, evt, suspendFollow, { passive: true })
    );

    // Arrows: page-scroll, disabled at the ends (kept in place to avoid layout shift).
    const page = () => Math.max(160, Math.round(rail.clientWidth * 0.8));
    const pageBy = (towardEnd) => {
        suspendFollow();
        const delta = towardEnd ? page() : -page();
        smoothScroll(rail, { left: rail.scrollLeft + (isRtl ? -delta : delta) });
    };
    if (prevBtn) on(prevBtn, 'click', () => pageBy(false));
    if (nextBtn) on(nextBtn, 'click', () => pageBy(true));

    function syncControls() {
        // The ResizeObserver still fires on detach, so this is the self-heal for a container
        // removed without a DestroyFluentPlayer event.
        if (!root.isConnected) { teardown(); return; }
        const max = maxScroll();
        const atStart = scrolled() <= 0;
        const atEnd = scrolled() >= max;
        if (prevBtn) prevBtn.disabled = atStart;
        if (nextBtn) nextBtn.disabled = atEnd || max <= 0;
        root.classList.toggle('fp-chapters--scrollable', max > 0);
        // Fade only the edge that has more content to scroll toward.
        rail.classList.toggle('fp-fade-start', max > 0 && !atStart);
        rail.classList.toggle('fp-fade-end', max > 0 && !atEnd);
        // Only while the active pill is out of sight, so it never competes with follow.
        const active = items[activeIndex] && items[activeIndex].pill;
        if (jumpBtn && active) {
            const railBox = rail.getBoundingClientRect();
            const pillBox = active.getBoundingClientRect();
            const offscreen = pillBox.right < railBox.left + 1 || pillBox.left > railBox.right - 1;
            jumpBtn.hidden = !offscreen;
        } else if (jumpBtn) {
            jumpBtn.hidden = true;
        }
    }

    on(rail, 'scroll', throttle(syncControls, 120), { passive: true });
    on(window, 'resize', throttle(syncControls, 200));
    // Overflow depends on final layout (webfonts, provider iframe) that lands after init;
    // recheck on any size change and once shortly after so the fades/arrows settle.
    if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => syncControls());
        ro.observe(rail);
        cleanups.push(() => ro.disconnect());
    }
    const settleTimer = setTimeout(syncControls, 300);
    cleanups.push(() => clearTimeout(settleTimer));
    if (jumpBtn) {
        on(jumpBtn, 'click', () => {
            followSuspendedUntil = 0;
            const active = items[activeIndex] && items[activeIndex].pill;
            if (active) scrollIntoView(active, 'center');
            syncControls();
        });
    }

    // Clearing the bound flag lets a reused container re-bind cleanly.
    const teardown = () => {
        cleanups.forEach((fn) => fn());
        cleanups.length = 0;
        document.removeEventListener('DestroyFluentPlayer', onDestroy);
        activeStrips.delete(root);
        delete root.dataset.fpStripBound;
    };
    const onDestroy = (event) => {
        const gone = event.detail && event.detail.container;
        if (gone && (gone === container || gone.contains(root))) {
            teardown();
        }
    };
    document.addEventListener('DestroyFluentPlayer', onDestroy);
    activeStrips.set(root, teardown);

    labelJump(items[activeIndex] && items[activeIndex].pill);
    syncControls();
}

/**
 * Bind every unbound chapter strip under `root`, sweeping any whose container has since left
 * the DOM. Safe to call repeatedly — the runtime calls it on init and on injected players.
 *
 * @param {ParentNode} [root] Subtree to scan. Defaults to the document.
 * @return {void}
 */
export function initChapterStrips(root = document) {
    for (const [stripRoot, teardown] of activeStrips) {
        if (!stripRoot.isConnected) teardown();
    }
    root.querySelectorAll('.fp-chapters[data-fp-chapters]').forEach(bindStrip);
}
