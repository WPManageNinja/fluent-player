import $t from './translator.js';

/**
 * Centralized video error handler for the frontend player.
 * Maps MediaError codes and error message patterns to user-friendly messages.
 */

/**
 * MediaError code to error message mapping
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MediaError/code
 */
const MEDIA_ERROR_MAP = {
    1: { // MEDIA_ERR_ABORTED
        title: 'Playback aborted',
        detail: 'Video playback was interrupted.'
    },
    2: { // MEDIA_ERR_NETWORK
        title: 'Network error',
        detail: 'Please check your internet connection and try again.'
    },
    3: { // MEDIA_ERR_DECODE
        title: 'Playback error',
        detail: 'The video could not be decoded. The file may be corrupted.'
    },
    4: { // MEDIA_ERR_SRC_NOT_SUPPORTED
        title: 'Video unavailable',
        detail: 'The video source could not be loaded. Please verify the video URL is correct.'
    }
};

/**
 * Error message string patterns matched against error.message (lowercase)
 * Order matters: first match wins
 */
const MESSAGE_PATTERNS = [
    {
        test: (msg) => msg.includes('network') || msg.includes('fetch'),
        title: 'Network error',
        detail: 'Please check your internet connection and try again.'
    },
    {
        test: (msg) => msg.includes('404') || msg.includes('not found'),
        title: 'Video not found',
        detail: 'The requested video could not be found.'
    },
    {
        test: (msg) => msg.includes('403') || msg.includes('forbidden'),
        title: 'Access denied',
        detail: 'You do not have permission to view this video.'
    },
    {
        test: (msg) => msg.includes('401') || msg.includes('unauthorized'),
        title: 'Authentication required',
        detail: 'You need to be signed in to view this video.'
    },
    {
        test: (msg) => msg.includes('timeout') || msg.includes('timed out'),
        title: 'Request timed out',
        detail: 'The server took too long to respond. Please try again.'
    },
    {
        test: (msg) => msg.includes('hls') || msg.includes('manifest'),
        title: 'Streaming error',
        detail: 'Unable to load video stream. Please try again.'
    },
    {
        test: (msg) => msg.includes('decode') || msg.includes('format') || msg.includes('codec'),
        title: 'Format not supported',
        detail: 'This video format is not supported by your browser.'
    },
    {
        test: (msg) => msg.includes('cors') || msg.includes('cross-origin'),
        title: 'Video blocked',
        detail: 'The video could not be loaded due to cross-origin restrictions.'
    },
    {
        test: (msg) => msg.includes('500') || msg.includes('server error'),
        title: 'Server error',
        detail: 'The video server encountered an error. Please try again later.'
    }
];

/**
 * Default error when no pattern matches
 */
const DEFAULT_ERROR = {
    title: 'Unable to play video',
    detail: 'Please check your internet connection or verify the video source.'
};

/**
 * Error overlay SVG icon markup
 */
const ERROR_ICON_SVG = `<svg class="fluent-player-error-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
    <line x1="12" y1="8" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none"/>
</svg>`;

/**
 * Parse an error object and return a user-friendly { title, detail } pair.
 *
 * @param {Error|MediaError|Object|null} error
 * @returns {{ title: string, detail: string }}
 */
export function getVideoError(error) {
    if (!error) {
        return {
            title: $t('Unable to play video'),
            detail: $t('Please check your internet connection or verify the video source.')
        };
    }

    // 1. Try MediaError code (most reliable for playback errors)
    const mediaErrorCode = error?.code ?? error?.detail?.code;
    if (mediaErrorCode && MEDIA_ERROR_MAP[mediaErrorCode]) {
        return {
            title: $t(MEDIA_ERROR_MAP[mediaErrorCode].title),
            detail: $t(MEDIA_ERROR_MAP[mediaErrorCode].detail)
        };
    }

    // 2. Try string pattern matching on error.message
    if (error?.message) {
        const msg = error.message.toLowerCase();
        for (const pattern of MESSAGE_PATTERNS) {
            if (pattern.test(msg)) {
                return { title: $t(pattern.title), detail: $t(pattern.detail) };
            }
        }
    }

    return {
        title: $t('Unable to play video'),
        detail: $t('Please check your internet connection or verify the video source.')
    };
}

/**
 * Create an error overlay DOM element with title, detail, and retry button.
 *
 * @param {{ title: string, detail: string }} errorInfo
 * @returns {HTMLElement}
 */
export function createErrorOverlay(errorInfo) {
    const overlay = document.createElement('div');
    overlay.className = 'fluent-player-error-overlay';
    const content = document.createElement('div');
    content.className = 'fluent-player-error-content';
    content.innerHTML = ERROR_ICON_SVG;
    const titleEl = document.createElement('div');
    titleEl.className = 'fluent-player-error-title';
    titleEl.textContent = errorInfo.title || '';
    const detailEl = document.createElement('div');
    detailEl.className = 'fluent-player-error-detail';
    detailEl.textContent = errorInfo.detail || '';
    const retryBtn = document.createElement('button');
    retryBtn.className = 'fluent-player-error-retry';
    retryBtn.textContent = $t('Try Again');
    content.appendChild(titleEl);
    content.appendChild(detailEl);
    content.appendChild(retryBtn);
    overlay.appendChild(content);
    return overlay;
}

export default {
    getVideoError,
    createErrorOverlay,
    MEDIA_ERROR_MAP,
    MESSAGE_PATTERNS,
    DEFAULT_ERROR
};
