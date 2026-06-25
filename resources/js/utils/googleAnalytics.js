const DEFAULT_GA_POLL_INTERVAL_MS = 200;
const DEFAULT_GA_POLL_MAX_MS = 5000;

let gaReadyPromise = null;
let hasWarnedMissingGtag = false;

function hasGtag() {
    return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

function finalizeReadyResult(result) {
    if (result.ready) {
        gaReadyPromise = Promise.resolve(result);
    } else {
        gaReadyPromise = null;
    }

    return result;
}

export function waitForGoogleAnalytics({
    pollIntervalMs = DEFAULT_GA_POLL_INTERVAL_MS,
    pollMaxMs = DEFAULT_GA_POLL_MAX_MS,
} = {}) {
    if (hasGtag()) {
        return Promise.resolve({ ready: true, source: 'existing' });
    }

    if (gaReadyPromise) {
        return gaReadyPromise;
    }

    gaReadyPromise = new Promise((resolve) => {
        const deadline = Date.now() + pollMaxMs;
        let pollId = null;

        const finish = (result) => {
            if (pollId) {
                clearInterval(pollId);
                pollId = null;
            }
            resolve(finalizeReadyResult(result));
        };

        const checkReadiness = () => {
            if (hasGtag()) {
                finish({ ready: true, source: 'existing' });
                return;
            }

            if (Date.now() < deadline) {
                return;
            }

            if (pollId) {
                clearInterval(pollId);
                pollId = null;
            }
            finish({ ready: false, source: null });
        };

        pollId = setInterval(checkReadiness, pollIntervalMs);
        checkReadiness();
    });

    return gaReadyPromise;
}

export function shouldWarnMissingGoogleAnalytics() {
    if (hasWarnedMissingGtag) {
        return false;
    }

    hasWarnedMissingGtag = true;
    return true;
}
