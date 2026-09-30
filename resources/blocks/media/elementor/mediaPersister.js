/**
 * Persist a media's player settings to the REST endpoint the block uses
 * (PUT /media/{id} with the block payload shape) and, on SUCCESS ONLY, notify
 * the host so it can react — e.g. Elementor re-rendering the widget preview.
 *
 * Kept as a pure, host-agnostic helper (no React) so the save → onSaved contract
 * is unit-testable in isolation: onSaved fires after a resolved save and never
 * after a rejected one.
 *
 * @param {Object}   deps
 * @param {Function} deps.apiFetch      wp.apiFetch (or compatible) — ({path, method, data}) => Promise
 * @param {string}   deps.path          REST path, e.g. "/fluent-player/v2/media/123"
 * @param {Object}   deps.data          current media data to persist
 * @param {Function} deps.buildPayload  (data) => payload sent as the request body
 * @param {Function} [deps.onSaved]     called once after a successful save
 * @param {Function} [deps.onSaving]    called with true before the request and false after (always)
 * @returns {Promise<Object|null>}      the saved media (res.media), or null
 */
export async function savePlayerMedia({ apiFetch, path, data, buildPayload, onSaved, onSaving }) {
    if (onSaving) onSaving(true);
    try {
        const res = await apiFetch({ path, method: 'PUT', data: buildPayload(data) });
        if (onSaved) onSaved();
        return (res && res.media) || res || null;
    } finally {
        if (onSaving) onSaving(false);
    }
}

/**
 * Serializing, debounced media saver for the Elementor settings host — mirrors
 * the block editor's saveMediaRequestRef/pendingSaveRef guard so overlapping
 * saves can't corrupt the media.
 *
 * Guarantees:
 *  - At most one PUT is in flight at a time (no out-of-order completion can
 *    revert the record to a stale snapshot).
 *  - Only the LATEST snapshot is ever written: edits made while a save is in
 *    flight coalesce into a single trailing save that reads `latest` at send
 *    time (never a queue of stale payloads).
 *  - `flush()` cancels any pending debounce so an imperative save persists the
 *    newest snapshot immediately, and resolves to the saved media (or null on
 *    failure) — never rejects, so callers can't leak unhandled rejections.
 *  - Failures surface via `onError` (and resolve `flush` to null) instead of
 *    being silently swallowed.
 *
 * @param {Object}   deps
 * @param {Function} deps.apiFetch
 * @param {Function} deps.buildPayload
 * @param {Function} deps.getPath        () => REST path (re-read each save, so a
 *                                        changed media id is honoured)
 * @param {number}   [deps.debounceMs]   background-save debounce (default 600)
 * @param {Function} [deps.onSaved]      (media) => void, after each successful save
 * @param {Function} [deps.onError]      (error) => void, after each failed save
 * @param {Function} [deps.onSaving]     (bool) => void, around the in-flight window
 * @returns {{ schedule: Function, flush: Function, cancel: Function }}
 */
export function createMediaSaver({ apiFetch, buildPayload, getPath, debounceMs = 600, onSaved, onError, onSaving }) {
    let debounceTimer = null;
    let running = null; // Promise while a save (+ any coalesced trailing save) runs
    let pending = false; // a newer snapshot arrived while a save was in flight
    let latest = null;

    async function drain() {
        let media = null;
        do {
            pending = false;
            const data = latest;
            if (!data) break;
            if (onSaving) onSaving(true);
            try {
                media = await savePlayerMedia({ apiFetch, path: getPath(), data, buildPayload });
                if (onSaved) onSaved(media);
            } catch (err) {
                if (onError) onError(err);
                media = null;
            } finally {
                if (onSaving) onSaving(false);
            }
        } while (pending); // a snapshot arrived mid-save → write the latest once more
        running = null;
        return media;
    }

    function run() {
        if (running) { pending = true; return running; }
        running = drain();
        return running;
    }

    return {
        // Debounced background save (used by every settings change).
        schedule(data) {
            latest = data;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(run, debounceMs);
        },
        // Imperative save now: cancel the debounce, persist the newest snapshot,
        // resolve to the saved media (null on failure).
        flush(data) {
            if (data !== undefined && data !== null) latest = data;
            clearTimeout(debounceTimer);
            return run();
        },
        // Drop a pending debounced save without firing it (e.g. on unmount).
        cancel() { clearTimeout(debounceTimer); },
    };
}
