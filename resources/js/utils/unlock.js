/**
 * Shared password-unlock helpers for the frontend player and playlist.
 * The server sets the HttpOnly unlock cookie in its AJAX response; the client
 * only submits the password and reloads once it succeeds.
 */

import { ajaxPost } from './ajax';

export async function submitUnlock(mediaId, password) {
    try {
        const json = await ajaxPost('fluent_player_unlock', { id: mediaId, password });
        return json || { success: false, data: { message: 'Unlock failed' } };
    } catch (_) {
        return { success: false, data: { message: 'Network error' } };
    }
}

async function runUnlock(form, mediaId, onSuccess) {
    const input = form.querySelector('[name="password"]');
    const errEl = form.querySelector('.fp-unlock-error');
    const btn = form.querySelector('button[type="submit"]');
    if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
    if (btn) btn.disabled = true;

    const json = await submitUnlock(mediaId, input ? input.value : '');

    if (json && json.success) {
        onSuccess();
        return;
    }

    if (btn) btn.disabled = false;
    const msg = (json && json.data && json.data.message) || 'Unlock failed';
    if (errEl) { errEl.textContent = msg; errEl.hidden = false; }
}

export function bindUnlockForm(form, mediaId, onSuccess) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        runUnlock(form, mediaId, onSuccess);
    });
}

let delegated = false;
export function delegateMediaUnlockForms() {
    if (delegated) return;
    delegated = true;
    document.addEventListener('submit', (e) => {
        const form = e.target && e.target.closest ? e.target.closest('.fp-media-locked .fp-unlock-form') : null;
        if (!form) return;
        const wrapper = form.closest('.fp-media-locked');
        const mediaId = wrapper && wrapper.dataset.mediaId;
        if (!mediaId) return;
        e.preventDefault();
        runUnlock(form, mediaId, () => window.location.reload());
    });
}
