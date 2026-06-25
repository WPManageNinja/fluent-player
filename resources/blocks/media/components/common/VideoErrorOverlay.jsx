/**
 * Video Error Overlay Component
 * Displays a user-friendly error message when video playback fails.
 * Uses the same styles as the frontend player error overlay.
 */

const { __ } = wp.i18n;

/**
 * MediaError code to error message mapping
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MediaError/code
 */
const MEDIA_ERROR_MAP = {
    1: { // MEDIA_ERR_ABORTED
        title: __('Playback aborted', 'fluent-player'),
        detail: __('Video playback was interrupted.', 'fluent-player')
    },
    2: { // MEDIA_ERR_NETWORK
        title: __('Network error', 'fluent-player'),
        detail: __('Please check your internet connection and try again.', 'fluent-player')
    },
    3: { // MEDIA_ERR_DECODE
        title: __('Playback error', 'fluent-player'),
        detail: __('The video could not be decoded. The file may be corrupted.', 'fluent-player')
    },
    4: { // MEDIA_ERR_SRC_NOT_SUPPORTED
        title: __('Video unavailable', 'fluent-player'),
        detail: __('The video source could not be loaded. Please verify the video URL is correct.', 'fluent-player')
    }
};

/**
 * Error message string patterns matched against error.message (lowercase)
 */
const MESSAGE_PATTERNS = [
    {
        test: (msg) => msg.includes('network') || msg.includes('fetch'),
        title: __('Network error', 'fluent-player'),
        detail: __('Please check your internet connection and try again.', 'fluent-player')
    },
    {
        test: (msg) => msg.includes('404') || msg.includes('not found'),
        title: __('Video not found', 'fluent-player'),
        detail: __('The requested video could not be found.', 'fluent-player')
    },
    {
        test: (msg) => msg.includes('403') || msg.includes('forbidden'),
        title: __('Access denied', 'fluent-player'),
        detail: __('You do not have permission to view this video.', 'fluent-player')
    },
    {
        test: (msg) => msg.includes('401') || msg.includes('unauthorized'),
        title: __('Authentication required', 'fluent-player'),
        detail: __('You need to be signed in to view this video.', 'fluent-player')
    },
    {
        test: (msg) => msg.includes('timeout') || msg.includes('timed out'),
        title: __('Request timed out', 'fluent-player'),
        detail: __('The server took too long to respond. Please try again.', 'fluent-player')
    },
    {
        test: (msg) => msg.includes('hls') || msg.includes('manifest'),
        title: __('Streaming error', 'fluent-player'),
        detail: __('Unable to load video stream. Please try again.', 'fluent-player')
    },
    {
        test: (msg) => msg.includes('decode') || msg.includes('format') || msg.includes('codec'),
        title: __('Format not supported', 'fluent-player'),
        detail: __('This video format is not supported by your browser.', 'fluent-player')
    },
    {
        test: (msg) => msg.includes('cors') || msg.includes('cross-origin'),
        title: __('Video blocked', 'fluent-player'),
        detail: __('The video could not be loaded due to cross-origin restrictions.', 'fluent-player')
    },
    {
        test: (msg) => msg.includes('500') || msg.includes('server error'),
        title: __('Server error', 'fluent-player'),
        detail: __('The video server encountered an error. Please try again later.', 'fluent-player')
    }
];

const DEFAULT_ERROR = {
    title: __('Unable to play video', 'fluent-player'),
    detail: __('Please check your internet connection or verify the video source.', 'fluent-player')
};

/**
 * Parse an error object and return a user-friendly { title, detail } pair.
 */
export function getVideoError(error) {
    if (!error) {
        return { ...DEFAULT_ERROR };
    }

    const mediaErrorCode = error?.code ?? error?.detail?.code;
    if (mediaErrorCode && MEDIA_ERROR_MAP[mediaErrorCode]) {
        return { ...MEDIA_ERROR_MAP[mediaErrorCode] };
    }

    if (error?.message) {
        const msg = error.message.toLowerCase();
        for (const pattern of MESSAGE_PATTERNS) {
            if (pattern.test(msg)) {
                return { title: pattern.title, detail: pattern.detail };
            }
        }
    }

    return { ...DEFAULT_ERROR };
}

/**
 * Error overlay component matching the frontend player design.
 */
const VideoErrorOverlay = ({ error, onRetry }) => {
    const errorInfo = getVideoError(error);

    return (
        <div className="fluent-player-error-overlay">
            <div className="fluent-player-error-content">
                <svg className="fluent-player-error-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <line x1="12" y1="8" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none"/>
                </svg>
                <div className="fluent-player-error-title">{errorInfo.title}</div>
                <div className="fluent-player-error-detail">{errorInfo.detail}</div>
                {onRetry && (
                    <button className="fluent-player-error-retry" onClick={onRetry}>
                        {__('Try Again', 'fluent-player')}
                    </button>
                )}
            </div>
        </div>
    );
};

export default VideoErrorOverlay;
