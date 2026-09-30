import $t from './translator.js';
import { bindUnlockForm } from './utils/unlock.js';

// One modal is active at a time. The player inside is mounted by the runtime's
// observeInjectedPlayers() (it reads the fp-inline-config block the endpoint ships
// with the markup), so this module only builds the shell and tears it down.
let activeModal = null;

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

async function fetchModalHtml(mediaId, accessKey) {
    const cfg = window.fluent_player || {};
    const ajaxUrl = cfg.ajax_url || '/wp-admin/admin-ajax.php';
    const nonce = cfg.nonce || '';

    const response = await fetch(ajaxUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            action: 'fluent_player_get_modal_media',
            media_id: mediaId,
            nonce,
            access_key: accessKey || '',
        }),
    });

    // Parse before judging status: a 4xx still carries the endpoint's own reason.
    let data = null;
    try {
        data = await response.json();
    } catch (_) { /* not JSON */ }

    if (!response.ok || !data || data.error || !data.html) {
        const err = new Error('modal-fetch-failed');
        if (data && data.error) err.serverMessage = data.error;
        throw err;
    }
    return data.html;
}

function trapFocus(event, overlay) {
    const focusable = Array.from(overlay.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
    );
    if (!focusable.length) {
        event.preventDefault();
        return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

export async function openModal(opts = {}) {
    const mediaId = opts.mediaId;
    if (!mediaId) return;
    if (activeModal) closeModal();

    const overlay = document.createElement('div');
    overlay.className = 'fp-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', opts.title || $t('Media player'));

    const dialog = document.createElement('div');
    dialog.className = 'fp-modal-dialog';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'fp-modal-close';
    closeBtn.setAttribute('aria-label', $t('Close'));
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.42 1.42L10.59 13.4 4.3 19.71 2.88 18.3 9.17 12 2.88 5.71 4.3 4.29l6.29 6.3 6.29-6.3z"/></svg>';

    const body = document.createElement('div');
    body.className = 'fp-modal-body fp-modal-loading';
    body.setAttribute('aria-busy', 'true');
    body.innerHTML = '<span class="fp-modal-sr-only" role="status">' + $t('Loading media…') + '</span>';

    dialog.appendChild(closeBtn);
    dialog.appendChild(body);
    overlay.appendChild(dialog);

    const trigger = opts.trigger || document.activeElement;

    const keyHandler = (event) => {
        if (event.key === 'Escape') {
            closeModal();
        } else if (event.key === 'Tab') {
            trapFocus(event, overlay);
        }
    };

    activeModal = { overlay, body, trigger, keyHandler, inerted: [] };

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeModal();
    });
    document.addEventListener('keydown', keyHandler);

    document.body.appendChild(overlay);
    document.body.classList.add('fp-modal-open');

    // Make the rest of the page inert so screen readers and Tab can't reach behind
    // the dialog — aria-modal alone is only advisory.
    Array.prototype.forEach.call(document.body.children, (el) => {
        // Skip the overlay and anything already inert/hidden, so close() restores only
        // what we set and never strips a pre-existing inert / aria-hidden.
        if (el === overlay || el.hasAttribute('inert') || el.getAttribute('aria-hidden') === 'true') return;
        el.setAttribute('inert', '');
        el.setAttribute('aria-hidden', 'true');
        activeModal.inerted.push(el);
    });

    closeBtn.focus();

    // The document-level unlock delegate reloads on success, which would close this dialog.
    body.addEventListener('submit', (event) => {
        if (event.target && event.target.closest && event.target.closest('.fp-unlock-form')) {
            event.stopPropagation();
        }
    });

    // Swap the unlock form for the player in place once the password is accepted.
    const wireUnlockForm = () => {
        const wrapper = body.querySelector('.fp-media-locked');
        const form = wrapper && wrapper.querySelector('.fp-unlock-form');
        if (!form) return;
        bindUnlockForm(form, wrapper.dataset.mediaId || mediaId, () => { load(); });
        const input = form.querySelector('[name="password"]');
        if (input) input.focus();
    };

    async function load() {
        try {
            const html = await fetchModalHtml(mediaId, opts.accessKey);
            // The user may have closed the modal while the request was in flight.
            if (!activeModal || activeModal.overlay !== overlay) return;

            body.classList.remove('fp-modal-loading');
            body.removeAttribute('aria-busy');
            // Injecting the markup (player + its fp-inline-config block) is enough — the
            // runtime's MutationObserver hydrates the <media-player> on insertion.
            body.innerHTML = html;
            wireUnlockForm();
        } catch (error) {
            if (!activeModal || activeModal.overlay !== overlay) return;
            body.classList.remove('fp-modal-loading');
            body.removeAttribute('aria-busy');
            // textContent, so a server-supplied string can't inject markup.
            const p = document.createElement('p');
            p.className = 'fp-modal-error';
            p.setAttribute('role', 'alert');
            p.textContent = (error && error.serverMessage) || $t('Unable to load media.');
            body.innerHTML = '';
            body.appendChild(p);
            console.error('FluentPlayer: modal load failed:', error);
        }
    }

    await load();
}

export function closeModal() {
    if (!activeModal) return;
    const modal = activeModal;
    activeModal = null;

    document.removeEventListener('keydown', modal.keyHandler);

    // Tear the mounted player down before its container leaves the DOM, so its
    // trackers/listeners don't linger. The runtime owns the instance registry.
    const container = modal.overlay.querySelector('.fluent-player');
    if (container) {
        document.dispatchEvent(new CustomEvent('DestroyFluentPlayer', { detail: { container } }));
    }

    if (modal.overlay.parentNode) {
        modal.overlay.parentNode.removeChild(modal.overlay);
    }
    document.body.classList.remove('fp-modal-open');

    // Restore the page we made inert on open.
    (modal.inerted || []).forEach((el) => {
        el.removeAttribute('inert');
        el.removeAttribute('aria-hidden');
    });

    if (modal.trigger && typeof modal.trigger.focus === 'function') {
        try {
            modal.trigger.focus();
        } catch (_) { /* trigger may be gone */ }
    }
}

// One document-level listener so ANY element carrying data-fluent-player-open — a
// link, button, or thumbnail placed by the [fluent_player_modal] shortcode (Pro) or
// by raw HTML — opens the modal. This is the "use anywhere" surface. Self-idempotent
// so a repeat call (Pro/3rd-party) can't double-bind and double-fetch.
let triggersBound = false;
export function bindModalTriggers() {
    if (triggersBound) return;
    triggersBound = true;

    document.addEventListener('click', (event) => {
        const trigger = event.target.closest && event.target.closest('[data-fluent-player-open]');
        if (!trigger) return;
        event.preventDefault();
        openModal({
            mediaId: trigger.getAttribute('data-fluent-player-open'),
            accessKey: trigger.getAttribute('data-access-key') || '',
            title: trigger.getAttribute('data-fluent-player-title') || '',
            trigger,
        }).catch((error) => console.error('FluentPlayer: modal open failed:', error));
    });
}
