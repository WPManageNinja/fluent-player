import { ClaimChannel, canReport } from './claimChannel.js';

const AJAX_ACTION = 'fluent_player_layer_event';
const EVENTS = ['seen', 'completed', 'skipped'];

function normalizeArmed(armed) {
    if (!armed || typeof armed !== 'object') return {};
    const out = {};
    for (const [layerId, events] of Object.entries(armed)) {
        const clean = Array.isArray(events) ? events.filter((e) => EVENTS.includes(e)) : [];
        if (clean.length) out[String(layerId)] = clean;
    }
    return out;
}

class LayerReporter {
    constructor(layersManager, options = {}) {
        this.layersManager = layersManager;
        this.mediaId = options.mediaId;
        this.armed = normalizeArmed(options.armed);
        this.canReport = canReport(options);

        this.channel = new ClaimChannel({
            action: AJAX_ACTION,
            nonce: options.nonce,
            mediaId: options.mediaId,
        });

        if (!layersManager || !this.mediaId || !this.canReport || !Object.keys(this.armed).length) {
            return;
        }

        this._unsubscribe = layersManager.subscribeLayerEvents((layerId, event) => this._onEvent(layerId, event));
        // pagehide/visibilitychange cover mobile; latch so overlapping hide events beacon once
        this._flushedOnHide = false;
        this._onUnload = () => {
            if (this._flushedOnHide) return;
            this._flushedOnHide = true;
            this.channel.flush(true);
        };
        this._onVisibility = () => {
            if (document.visibilityState === 'hidden') this._onUnload();
            else this._flushedOnHide = false;
        };
        window.addEventListener('beforeunload', this._onUnload);
        window.addEventListener('pagehide', this._onUnload);
        document.addEventListener('visibilitychange', this._onVisibility);
        this._attached = true;
    }

    get fired() {
        return this.channel.fired;
    }

    get pending() {
        return this.channel.pending;
    }

    get sending() {
        return this.channel.sending;
    }

    _onEvent(layerId, event) {
        const armedEvents = this.armed[String(layerId)];
        if (!armedEvents) return;
        // seen is always reported for armed layers so the server can anchor plausibility
        if (event !== 'seen' && !armedEvents.includes(event)) return;

        this.channel.claim([String(layerId) + ':' + event]);
        this.channel.flush(false);
    }

    destroy() {
        if (this._attached) {
            if (this.channel.pending.size > 0) {
                this.channel.flush(true);
            }
            this._unsubscribe();
            window.removeEventListener('beforeunload', this._onUnload);
            window.removeEventListener('pagehide', this._onUnload);
            document.removeEventListener('visibilitychange', this._onVisibility);
            this._attached = false;
        }
        this.layersManager = null;
    }
}

export default LayerReporter;
