import { getAjaxUrl, buildFormData, ajaxPost } from '../utils/ajax';

const MAX_CLAIM_ATTEMPTS = 8;

export function canReport(options = {}) {
    return !!(options.isLoggedIn || options.hasContact || options.hasEmailCapture);
}

export class ClaimChannel {
    constructor({ action, nonce, mediaId, buildEvidence }) {
        this.action = action;
        this.nonce = nonce || '';
        this.mediaId = mediaId;
        this.buildEvidence = buildEvidence;
        this.fired = new Set();
        this.pending = new Set();
        this.attempts = {};
        this.sending = false;
    }

    claim(keys) {
        for (const key of keys) {
            if (!this.fired.has(key)) {
                this.pending.add(key);
                if (this.sending) {
                    this._claimedWhileSending = true;
                }
            }
        }
    }

    flush(useBeacon = false) {
        if (this.pending.size === 0) return;
        if (this.sending && !useBeacon) return;
        this.ping(Array.from(this.pending), useBeacon);
    }

    ping(batch, useBeacon = false) {
        const ajaxUrl = getAjaxUrl();
        if (!ajaxUrl) return;

        const payload = {
            nonce: this.nonce,
            media_id: this.mediaId,
            crossed: JSON.stringify(batch),
            ...(this.buildEvidence ? this.buildEvidence() : {}),
        };

        if (useBeacon && navigator.sendBeacon) {
            // no response to read, so don't mark fired — a later ajax tick reconciles
            navigator.sendBeacon(ajaxUrl, buildFormData(this.action, payload));
            return;
        }

        this.sending = true;
        ajaxPost(this.action, payload)
            .then((res) => {
                const reached = res?.data?.reached;
                if (!Array.isArray(reached)) {
                    this._confirm(batch);
                    return;
                }
                this._confirm(reached);
                // the server judges with its own data, which can lag the client's at an
                // exact boundary — retry unconfirmed claims on later ticks, bounded
                for (const key of batch) {
                    if (this.fired.has(key)) continue;
                    this.attempts[key] = (this.attempts[key] || 0) + 1;
                    if (this.attempts[key] >= MAX_CLAIM_ATTEMPTS) {
                        this._confirm([key]);
                    }
                }
            })
            .catch(() => {})
            .finally(() => {
                this.sending = false;
                // claims made while this send was in flight have no later tick of
                // their own (layer events are one-shot) — flush them now
                if (this._claimedWhileSending) {
                    this._claimedWhileSending = false;
                    this.flush(false);
                }
            });
    }

    _confirm(keys) {
        for (const key of keys) {
            this.pending.delete(key);
            this.fired.add(key);
        }
    }
}
