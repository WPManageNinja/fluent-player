/**
 * Browser Storage for Fluent Player.
 * Stores playback positions and persisted layer condition state under dedicated localStorage keys.
 */
const POSITION_STORAGE_KEY = 'fluent_player_positions';
const LAYER_STATE_STORAGE_KEY = 'fluent_player_layer_states';
const MAX_ENTRIES = 100;

class BrowserStorage {
    constructor() {
        this.positions = this._load(POSITION_STORAGE_KEY);
        this.layerConditionStates = this._load(LAYER_STATE_STORAGE_KEY);
    }

    /**
     * Get saved position for a media item.
     * @param {string|number} mediaId
     * @returns {{ position: number, duration: number, last_saved: number } | null}
     */
    getPosition(mediaId) {
        return this.positions[String(mediaId)] || null;
    }

    /**
     * Save playback position for a media item.
     * @param {string|number} mediaId
     * @param {number} position - Current playback time in seconds
     * @param {number} duration - Total duration in seconds
     */
    savePosition(mediaId, position, duration) {
        this.positions[String(mediaId)] = {
            position,
            duration,
            last_saved: Date.now(),
        };
        this._persistBucket('positions', POSITION_STORAGE_KEY);
    }

    /**
     * Remove saved position for a media item.
     * @param {string|number} mediaId
     */
    removePosition(mediaId) {
        delete this.positions[String(mediaId)];
        this._persistBucket('positions', POSITION_STORAGE_KEY);
    }

    /**
     * Get persisted layer condition state for a media item.
     * @param {string|number} mediaId
     * @returns {Object|null}
     */
    getLayerConditionStates(mediaId) {
        const entry = this.layerConditionStates[String(mediaId)];
        if (!entry || typeof entry !== 'object') {
            return null;
        }

        return entry.layers && typeof entry.layers === 'object' ? entry.layers : null;
    }

    /**
     * Update the persisted condition state for a single layer.
     * Only seen/completed are persisted and they are treated as additive UX memory.
     *
     * @param {string|number} mediaId
     * @param {string|number} conditionStateKey
     * @param {{ seen?: boolean, completed?: boolean }} nextState
     */
    updateLayerConditionState(mediaId, conditionStateKey, nextState = {}) {
        const mediaKey = String(mediaId);
        const stateKey = String(conditionStateKey);
        const existingEntry = this.layerConditionStates[mediaKey];
        const existingStates = { ...(this.getLayerConditionStates(mediaKey) || {}) };
        const previousState = existingStates[stateKey] || {};
        const mergedState = {
            seen: Boolean(previousState.seen) || Boolean(nextState.seen),
            completed: Boolean(previousState.completed) || Boolean(nextState.completed),
        };

        if (mergedState.seen || mergedState.completed) {
            existingStates[stateKey] = mergedState;
            this.layerConditionStates[mediaKey] = {
                ...(existingEntry && typeof existingEntry === 'object' ? existingEntry : {}),
                last_saved: Date.now(),
                layers: existingStates,
            };
        } else {
            delete existingStates[stateKey];
            if (Object.keys(existingStates).length) {
                this.layerConditionStates[mediaKey] = {
                    ...(existingEntry && typeof existingEntry === 'object' ? existingEntry : {}),
                    last_saved: Date.now(),
                    layers: existingStates,
                };
            } else {
                delete this.layerConditionStates[mediaKey];
            }
        }

        this._persistBucket('layerConditionStates', LAYER_STATE_STORAGE_KEY);
    }

    /**
     * Load positions map from localStorage.
     *
     * @param {string} storageKey
     * @returns {Object}
     */
    _load(storageKey) {
        try {
            const raw = localStorage.getItem(storageKey);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return (typeof parsed === 'object' && parsed !== null) ? parsed : {};
        } catch (e) {
            return {};
        }
    }

    /**
     * Write a storage bucket to localStorage, cleaning up if over limit.
     */
    _persistBucket(bucketKey, storageKey) {
        if (!this[bucketKey] || typeof this[bucketKey] !== 'object') {
            this[bucketKey] = {};
        }

        if (Object.keys(this[bucketKey]).length > MAX_ENTRIES) {
            this._cleanup(bucketKey);
        }

        try {
            localStorage.setItem(storageKey, JSON.stringify(this[bucketKey]));
        } catch (e) {
            // Quota exceeded — force cleanup and retry
            this._cleanup(bucketKey);
            try {
                localStorage.setItem(storageKey, JSON.stringify(this[bucketKey]));
            } catch (_) {
                // silently fail
            }
        }
    }

    /**
     * Trim a storage bucket to the most recently saved media entries.
     */
    _cleanup(bucketKey) {
        const bucket = this[bucketKey];
        if (!bucket || typeof bucket !== 'object') {
            this[bucketKey] = {};
            return;
        }

        const trimmedEntries = Object.entries(bucket)
            .sort(([, a], [, b]) => {
                const aTime = Number(a?.last_saved || 0);
                const bTime = Number(b?.last_saved || 0);
                return bTime - aTime;
            })
            .slice(0, MAX_ENTRIES);

        this[bucketKey] = Object.fromEntries(trimmedEntries);
    }

}

// Initialize browser storage
window.FluentBrowserStorage = new BrowserStorage();

export default BrowserStorage;
