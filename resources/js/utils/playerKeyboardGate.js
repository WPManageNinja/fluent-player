/**
 * Keyboard/focus gate for blocking layers (forms, email capture, CTA…) shown
 * over the player. When a layer is up it must own the keyboard: the player's
 * shortcuts are disabled and focus moves into the layer, so typing (Shift,
 * letters, space) goes to the overlay instead of triggering player actions.
 */

/**
 * Toggle the Vidstack media-player keyboard shortcuts. Safe on a null player.
 *
 * @param {Element|null} player   The <media-player> element.
 * @param {boolean}      disabled True to disable shortcuts (layer open).
 */
export function setPlayerKeyboardDisabled(player, disabled) {
    if (!player) return;
    try {
        player.keyDisabled = !!disabled;
    } catch (_) {
        // Property proxy throws on a Vidstack element already disposed by SPA teardown.
    }
}

const FOCUSABLE = [
    'input:not([type="hidden"])',
    'textarea',
    'select',
    'button',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
].join(',');

function isVisible(el) {
    if (el.disabled || el.getAttribute('aria-hidden') === 'true') return false;
    // offsetParent is null for display:none (good enough for our overlay markup;
    // jsdom returns null, so treat null offsetParent as visible there).
    if (typeof el.offsetParent === 'undefined') return true;
    const style = el.ownerDocument?.defaultView?.getComputedStyle?.(el);
    if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
    return true;
}

/**
 * Move focus to the first focusable control inside the layer (e.g. a form
 * field). Falls back to focusing the layer element itself so screen-reader /
 * keyboard users land on the overlay rather than the player behind it.
 *
 * @param {Element|null} layerEl
 * @returns {Element|null} The element that received focus, or null.
 */
export function focusFirstFocusable(layerEl) {
    if (!layerEl) return null;
    const candidates = layerEl.querySelectorAll(FOCUSABLE);
    for (const el of candidates) {
        if (isVisible(el)) {
            el.focus({ preventScroll: true });
            return el;
        }
    }
    // No focusable child — make the layer itself programmatically focusable.
    if (!layerEl.hasAttribute('tabindex')) {
        layerEl.setAttribute('tabindex', '-1');
    }
    layerEl.focus({ preventScroll: true });
    return layerEl;
}

/**
 * Whether focus should be pulled back into the (still-open) blocking layer.
 *
 * The bug this guards against is narrow: focus leaking to the player chrome
 * behind the modal (its idle/controls behavior calling `.focus()`), or being
 * lost entirely. We deliberately do NOT pull focus back when it lands on a real
 * element elsewhere — a Fluent Forms field that portals its popup to <body>
 * (select dropdown, date picker, captcha iframe), or a second player's overlay
 * on the same page. Yanking focus out of those would break the form / start a
 * focus war between two overlays.
 *
 * @param {Element|null} layerEl    The active blocking layer.
 * @param {Element|null} candidate  The element focus moved to.
 * @param {Element|null} playerEl   The <media-player> the layer belongs to.
 * @returns {boolean}
 */
export function shouldReturnFocusToLayer(layerEl, candidate, playerEl = null) {
    if (!layerEl || !layerEl.isConnected) return false;
    if (candidate && layerEl.contains(candidate)) return false;
    if (!candidate || candidate === candidate.ownerDocument?.body) return true;
    if (playerEl && playerEl.contains(candidate)) return true;
    return false;
}

/**
 * One modal gate per <media-player>. Email capture (FluentPlayer) and blocking
 * layers (LayersManager) both open over the same player, so they share a single
 * ref-counted gate instead of each running its own keyboard toggle, focus guard,
 * and cross-check of the other's state. While any overlay is open the player's
 * keyboard is disabled, `overlay-active` is set, and a single focusout guard
 * keeps focus inside the top-most overlay. Keyboard/focus are handed back only
 * when the last overlay closes.
 */
class PlayerModalGate {
    constructor(player) {
        this.player = player;
        this.openLayers = [];
        this._guard = null;
    }

    _topLayer() {
        for (let i = this.openLayers.length - 1; i >= 0; i--) {
            if (this.openLayers[i].isConnected) return this.openLayers[i];
        }
        return null;
    }

    open(layerEl, { focusDelay = 0 } = {}) {
        if (!layerEl) return;
        if (!this.openLayers.includes(layerEl)) this.openLayers.push(layerEl);
        setPlayerKeyboardDisabled(this.player, true);
        this.player?.classList.add('overlay-active');
        this._installGuard();
        if (focusDelay > 0) {
            setTimeout(() => {
                if (this.openLayers.includes(layerEl) && layerEl.isConnected) {
                    focusFirstFocusable(layerEl);
                }
            }, focusDelay);
        } else {
            focusFirstFocusable(layerEl);
        }
    }

    close(layerEl) {
        const wasOpen = this.openLayers.includes(layerEl);
        this.openLayers = this.openLayers.filter((el) => el !== layerEl && el.isConnected);
        if (!wasOpen || this.openLayers.length) return;
        setPlayerKeyboardDisabled(this.player, false);
        this.player?.classList.remove('overlay-active');
        this._removeGuard();
        this.player?.focus?.({ preventScroll: true });
    }

    teardown() {
        this.openLayers = [];
        this._removeGuard();
        setPlayerKeyboardDisabled(this.player, false);
        this.player?.classList.remove('overlay-active');
    }

    _installGuard() {
        if (this._guard) return;
        this._guard = () => {
            setTimeout(() => {
                const top = this._topLayer();
                if (top && shouldReturnFocusToLayer(top, document.activeElement, this.player)) {
                    focusFirstFocusable(top);
                }
            }, 0);
        };
        document.addEventListener('focusout', this._guard, true);
    }

    _removeGuard() {
        if (!this._guard) return;
        document.removeEventListener('focusout', this._guard, true);
        this._guard = null;
    }
}

const GATES = new WeakMap();

/**
 * The shared modal gate for a player element (created once per element).
 *
 * @param {Element|null} player
 * @returns {PlayerModalGate|null}
 */
export function getPlayerModalGate(player) {
    if (!player) return null;
    let gate = GATES.get(player);
    if (!gate) {
        gate = new PlayerModalGate(player);
        GATES.set(player, gate);
    }
    return gate;
}
