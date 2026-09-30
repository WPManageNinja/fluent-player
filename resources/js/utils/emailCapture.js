import $t from '../translator.js';
import { buildFormData } from './ajax';

export function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Render the post-submit confirmation state inside the email-capture overlay.
 * Only runs when the admin configured a confirmation message (rendered into the
 * overlay's data-confirmation-* attributes, smartcodes already resolved
 * server-side). When no message is set, the overlay is dismissed immediately
 * with no confirmation step. When a message is set, the form is hidden and the
 * message is shown with an optional auto-dismiss countdown bar and a dismiss
 * button.
 *
 * @param {object}       opts
 * @param {HTMLElement}  opts.overlayEl   the `.media-email-capture-overlay`, or a wrapper containing it (layer)
 * @param {() => void}   opts.onDismiss   runs when the user dismisses, the countdown elapses, or no message is set
 */
export function showEmailConfirmation({ overlayEl, onDismiss }) {
    let timerId = null;
    let closed = false;
    const finish = () => {
        if (closed) return;
        closed = true;
        if (timerId) clearInterval(timerId);
        if (typeof onDismiss === 'function') onDismiss();
    };

    // Caller passes the overlay (preset) or a wrapper that contains it (layer).
    const overlay = overlayEl && overlayEl.matches && overlayEl.matches('.media-email-capture-overlay')
        ? overlayEl
        : (overlayEl && overlayEl.querySelector && overlayEl.querySelector('.media-email-capture-overlay')) || overlayEl;

    const message = (overlay?.dataset?.confirmationMessage || '').trim();
    if (!overlay || !message) {
        finish();
        return;
    }

    const container = overlay.querySelector('.email-capture-container') || overlay;

    const dismissText = (overlay.dataset.confirmationDismissText || '').trim();
    let countdown = parseInt(overlay.dataset.confirmationCountdown ?? '10', 10);
    if (!Number.isFinite(countdown) || countdown < 0) countdown = 10;

    container
        .querySelectorAll('.email-capture-headline, .email-capture-form, .email-capture-bottom-text, .email-capture-message')
        .forEach((el) => { el.style.display = 'none'; });
    // Layer skip button is a sibling of the overlay with a different class.
    const skipScope = overlay.closest('.fluent-player-layer-cta-email-content') || container;
    skipScope.querySelectorAll('.email-capture-skip, .fluent-player-skip-button')
        .forEach((el) => { el.style.display = 'none'; });

    const existing = container.querySelector('.email-capture-confirmation');
    if (existing) existing.remove();

    const wrap = document.createElement('div');
    wrap.className = 'email-capture-confirmation';

    const text = document.createElement('p');
    text.className = 'email-capture-confirmation-text';
    text.setAttribute('role', 'status');
    text.setAttribute('aria-live', 'polite');
    text.textContent = message;
    wrap.appendChild(text);

    if (countdown > 0) {
        const counter = document.createElement('p');
        counter.className = 'email-capture-countdown-text';
        counter.setAttribute('aria-hidden', 'true');
        const render = (secs) => { counter.textContent = $t('Media will resume in %ds', secs); };
        render(countdown);
        wrap.appendChild(counter);

        let remaining = countdown;
        const tick = () => {
            remaining -= 1;
            if (remaining <= 0) { finish(); return; }
            render(remaining);
        };
        const startTimer = () => { timerId = setInterval(tick, 1000); };
        // Pause only while keyboard focus is inside so it can't time out mid-read
        // (WCAG 2.2.1); mouse users stop it with the dismiss button. Hover-pause is
        // intentionally omitted — the cursor sits on the confirmation after submit.
        const pauseTimer = () => {
            if (closed || timerId === null) return;
            clearInterval(timerId);
            timerId = null;
        };
        const resumeTimer = () => {
            if (closed || timerId !== null || remaining <= 0) return;
            startTimer();
        };
        startTimer();
        wrap.addEventListener('focusin', pauseTimer);
        wrap.addEventListener('focusout', resumeTimer);
    }

    // Always render a dismiss control: it is the keyboard-accessible stop
    // mechanism for the auto-dismiss countdown (WCAG 2.2.1).
    const dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.className = 'email-capture-confirmation-dismiss';
    dismissBtn.textContent = dismissText || $t('Continue');
    dismissBtn.addEventListener('click', () => finish());
    wrap.appendChild(dismissBtn);

    container.appendChild(wrap);
    // Skip auto-focus during a countdown — focus would immediately pause it.
    if (countdown <= 0) {
        setTimeout(() => dismissBtn.focus({ preventScroll: true }), 0);
    }
}

/**
 * Shared email-capture submit flow for the player and the playlist. The caller
 * injects the instance-specific request fields and DOM hooks; the validate ->
 * loading -> POST -> branch logic lives here so both surfaces stay in lockstep.
 *
 * @param {object}   opts
 * @param {HTMLInputElement} opts.emailInput
 * @param {HTMLElement}      opts.messageTarget        element queried for the submit button + message area
 * @param {string|null}      opts.ajaxUrl
 * @param {(submitButton: HTMLElement|null) => object} opts.resolveRequestData
 * @param {(target: HTMLElement, message: string, type?: string, loader?: boolean) => void} opts.showMessage
 * @param {(data: any) => void} opts.onSuccess
 * @returns {Promise<{success: boolean, data?: any, message?: string}>}
 */
export async function submitEmailCapture({ emailInput, messageTarget, ajaxUrl, resolveRequestData, showMessage, onSuccess }) {
    const email = emailInput.value.trim();

    if (!email) {
        emailInput.classList.add('error');
        const message = $t('Please enter your email address');
        showMessage(messageTarget, message, 'error');
        return { success: false, message };
    }

    if (!isValidEmail(email)) {
        emailInput.classList.add('error');
        const message = $t('Please enter a valid email address');
        showMessage(messageTarget, message, 'error');
        return { success: false, message };
    }

    emailInput.classList.remove('error');

    const submitButton = messageTarget.querySelector('.email-capture-button');
    if (submitButton) submitButton.disabled = true;
    showMessage(messageTarget, $t('Submitting...'), 'info', true);

    if (!ajaxUrl) {
        if (submitButton) submitButton.disabled = false;
        emailInput.classList.add('error');
        const message = $t('Error: Unable to submit email. Please try again later.');
        showMessage(messageTarget, message, 'error');
        return { success: false, message };
    }

    const formData = buildFormData('fluent_player_email_submit', {
        email,
        ...resolveRequestData(submitButton),
    });

    try {
        const response = await fetch(ajaxUrl, { method: 'POST', body: formData });
        const result = await response.json();

        if (result.success) {
            onSuccess(result.data);
            return { success: true, data: result.data };
        }

        if (submitButton) submitButton.disabled = false;
        emailInput.classList.add('error');
        const message = result.data?.message || $t('Error submitting email. Please try again.');
        showMessage(messageTarget, message, 'error');
        return { success: false, message };
    } catch (e) {
        if (submitButton) submitButton.disabled = false;
        emailInput.classList.add('error');
        const message = $t('Error submitting email. Please try again.');
        showMessage(messageTarget, message, 'error');
        return { success: false, message };
    }
}
