import { createMediaSaver } from '../elementor/mediaPersister.js';

/**
 * Pure helpers (they only touch the passed-in `wp`) for authoring timed content in
 * a page-builder canvas, unit-testable without a browser. The block-editor React +
 * the section/container blocks live in TimedContentEditor.jsx.
 */

/**
 * Register core blocks (paragraph/heading/image/…), idempotently — they aren't
 * registered outside the WP post editor, so the canvas must pull them in.
 *
 * @param {object} wp
 * @return {boolean} true if core blocks are available afterwards.
 */
export function registerCoreEditorBlocks(wp) {
    if (!wp || !wp.blocks || !wp.blocks.getBlockType) {
        return false;
    }
    if (wp.blockLibrary && wp.blockLibrary.registerCoreBlocks && !wp.blocks.getBlockType('core/paragraph')) {
        try {
            wp.blockLibrary.registerCoreBlocks();
        } catch (e) {
            // registerCoreBlocks throws if a subset is already registered; ignore.
        }
    }
    return !!wp.blocks.getBlockType('core/paragraph');
}

/**
 * Extract a media's timed-content sections from `post_content` (the source of
 * truth): parse, find the media block, keep its `fluent-player/timed-content` children.
 *
 * @param {object} wp
 * @param {string} postContent
 * @return {Array} timed-content block objects (possibly empty).
 */
export function parseTimedContentBlocks(wp, postContent) {
    if (!wp || !wp.blocks || !wp.blocks.parse || !postContent) {
        return [];
    }
    const parsed = wp.blocks.parse(postContent);
    const mediaBlock = parsed.find((b) => b && b.name === 'fluent-player/media');
    const inner = (mediaBlock && mediaBlock.innerBlocks) || [];
    return inner.filter((b) => b && b.name === 'fluent-player/timed-content');
}

/**
 * Serialize sections back to the block markup the timed-content REST endpoint expects.
 *
 * @param {object} wp
 * @param {Array}  sections
 * @return {string} serialized block markup.
 */
export function serializeTimedContentBlocks(wp, sections) {
    if (!wp || !wp.blocks || !wp.blocks.serialize || !Array.isArray(sections)) {
        return '';
    }
    return wp.blocks.serialize(sections);
}

/**
 * Debounced, single-in-flight saver for a media's timed content. Wraps the shared
 * createMediaSaver so pending edits survive a media switch / builder close (flush())
 * and failed saves surface via onStateChange('error') instead of being swallowed.
 *
 * @param {object}        deps
 * @param {Function}      deps.apiFetch
 * @param {object}        deps.wp
 * @param {string|number} deps.mediaId
 * @param {string}        deps.restBase        REST base, e.g. "/fluent-player/v2"
 * @param {Function}      [deps.onStateChange] (state) => void — 'saving' | 'saved' | 'error'
 * @param {Function}      [deps.onSaved]       () => void — after a successful save
 * @param {number}        [deps.debounceMs]
 * @returns {{ schedule: Function, flush: Function, cancel: Function }}
 */
export function createTimedContentSaver({ apiFetch, wp, mediaId, restBase, onStateChange, onSaved, debounceMs = 600 }) {
    const notify = (state) => { if (onStateChange) onStateChange(state); };
    const saver = createMediaSaver({
        apiFetch,
        buildPayload: (sections) => ({ timed_content: serializeTimedContentBlocks(wp, sections) }),
        getPath: () => `${restBase}/media/${mediaId}/timed-content`,
        debounceMs,
        // onSaving(false) fires in a finally even after a failure, so only mark
        // 'saving' on the way in; onSaved/onError own the terminal state.
        onSaving: (inFlight) => { if (inFlight) notify('saving'); },
        onSaved: () => { notify('saved'); if (onSaved) onSaved(); },
        onError: () => notify('error'),
    });
    return {
        schedule(sections) { saver.schedule(Array.isArray(sections) ? sections : []); },
        flush() { return saver.flush(); },
        cancel() { saver.cancel(); },
    };
}
