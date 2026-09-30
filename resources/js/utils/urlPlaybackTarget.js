const TARGET_CACHE_KEY = '__flpUrlPlaybackTarget';
const SCROLLED_KEYS_CACHE_KEY = '__flpUrlPlaybackScrolledKeys';

function getWindowObject() {
    return typeof window !== 'undefined' ? window : null;
}

function sanitizeRef(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const normalizedValue = value.trim().toLowerCase();
    if (!normalizedValue || !/^[a-z0-9_-]{1,80}$/.test(normalizedValue)) {
        return null;
    }

    return normalizedValue;
}

function sanitizeTime(value) {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
        return null;
    }

    const parsedValue = Number.parseInt(value, 10);
    if (!Number.isSafeInteger(parsedValue) || parsedValue < 0) {
        return null;
    }

    return parsedValue;
}

function normalizeTimeValue(value) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        const parsedValue = Math.floor(value);
        return Number.isSafeInteger(parsedValue) ? parsedValue : null;
    }

    if (typeof value === 'string') {
        return sanitizeTime(value);
    }

    return null;
}

function isInViewport(element) {
    if (!element || typeof element.getBoundingClientRect !== 'function') {
        return true;
    }

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;

    return (
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < viewportHeight &&
        rect.left < viewportWidth
    );
}

export function getUrlPlaybackTarget() {
    const win = getWindowObject();
    if (!win) {
        return null;
    }

    if (Object.prototype.hasOwnProperty.call(win, TARGET_CACHE_KEY)) {
        return win[TARGET_CACHE_KEY];
    }

    const search = typeof win.location?.search === 'string' ? win.location.search : '';
    const params = new URLSearchParams(search);

    const playerRef = sanitizeRef(params.get('flp_r'));
    const mediaRef = sanitizeRef(params.get('flp_v'));
    const time = sanitizeTime(params.get('flp_t'));
    const hasRelevantParam = params.has('flp_r') || params.has('flp_v') || params.has('flp_t');

    win[TARGET_CACHE_KEY] = hasRelevantParam ? {
        playerRef,
        mediaRef,
        time
    } : null;

    return win[TARGET_CACHE_KEY];
}

/**
 * Build a playback target from a shortcode `start` offset (settings.startTime).
 * This is the lowest-priority source: it is only consulted when the URL carries
 * no playback target (see resolveInitialPlaybackTarget). Returns null for live
 * streams and for zero / negative / missing / non-numeric values so it never
 * forces a seek that would fight the URL deep-link or a live edge.
 *
 * @param {object|null} settings Player settings (expects `startTime`).
 * @param {{isLiveStream?: boolean}} [options]
 * @returns {{playerRef: null, mediaRef: null, time: number}|null}
 */
export function resolveShortcodeStartTarget(settings, { isLiveStream = false } = {}) {
    if (isLiveStream) {
        return null;
    }

    const time = normalizeTimeValue(settings?.startTime);
    if (time === null || time <= 0) {
        return null;
    }

    return { playerRef: null, mediaRef: null, time };
}

export function matchesUrlPlaybackRef(expectedRef, actualRef) {
    const sanitizedExpectedRef = sanitizeRef(expectedRef);
    const sanitizedActualRef = sanitizeRef(actualRef);

    return !!sanitizedExpectedRef && sanitizedExpectedRef === sanitizedActualRef;
}

export function scrollPlaybackTargetIntoView(element, scrollKey) {
    const win = getWindowObject();
    const normalizedScrollKey = sanitizeRef(scrollKey);

    if (!win || !element || !normalizedScrollKey) {
        return false;
    }

    const scrolledKeys = win[SCROLLED_KEYS_CACHE_KEY] || new Set();
    win[SCROLLED_KEYS_CACHE_KEY] = scrolledKeys;

    if (scrolledKeys.has(normalizedScrollKey)) {
        return false;
    }

    scrolledKeys.add(normalizedScrollKey);

    if (isInViewport(element)) {
        return false;
    }

    requestAnimationFrame(() => {
        if (!document.body.contains(element)) {
            return;
        }

        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
        });
    });

    return true;
}

export function buildPlaybackTargetUrl({
    playerRef,
    mediaRef = null,
    time = null,
    currentUrl = null
} = {}) {
    const normalizedPlayerRef = sanitizeRef(playerRef);
    const normalizedMediaRef = sanitizeRef(mediaRef);
    const normalizedTime = normalizeTimeValue(time);
    const win = getWindowObject();
    const baseUrl = currentUrl || win?.location?.href;

    if (!normalizedPlayerRef || !baseUrl) {
        return '';
    }

    const url = new URL(baseUrl, win?.location?.origin);
    url.searchParams.set('flp_r', normalizedPlayerRef);

    if (normalizedMediaRef) {
        url.searchParams.set('flp_v', normalizedMediaRef);
    } else {
        url.searchParams.delete('flp_v');
    }

    if (normalizedTime !== null) {
        url.searchParams.set('flp_t', String(normalizedTime));
    } else {
        url.searchParams.delete('flp_t');
    }

    return url.toString();
}
