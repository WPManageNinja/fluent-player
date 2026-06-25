import $t from '../translator.js';
import { buildFormData } from './ajax';

export function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
