/**
 * Shared AJAX utilities for FluentPlayer frontend.
 * Centralizes ajax_url/nonce access and FormData construction.
 */

export function getAjaxUrl() {
    if (window.fluent_player?.ajax_url) {
        return window.fluent_player.ajax_url;
    }
    console.error('FluentPlayer: ajax_url not found. Please ensure wp_localize_script is called properly.');
    return null;
}

export function getNonce() {
    return window.fluent_player?.nonce || '';
}

/**
 * Build a FormData object with action, nonce, and additional key-value pairs.
 * @param {string} action - The WordPress AJAX action name
 * @param {Object} data - Additional key-value pairs to append
 * @returns {FormData}
 */
export function buildFormData(action, data = {}) {
    const formData = new FormData();
    formData.append('action', action);
    const requestNonce = data.nonce || getNonce();
    formData.append('nonce', requestNonce);
    for (const [key, value] of Object.entries(data)) {
        if (key !== 'nonce' && value !== undefined && value !== null) {
            formData.append(key, value);
        }
    }
    return formData;
}

/**
 * Send a POST AJAX request and return parsed JSON.
 * @param {string} action - The WordPress AJAX action name
 * @param {Object} data - Additional key-value pairs
 * @returns {Promise<Object|null>} Parsed response or null if ajax_url unavailable
 */
export async function ajaxPost(action, data = {}) {
    const ajaxUrl = getAjaxUrl();
    if (!ajaxUrl) return null;

    const formData = buildFormData(action, data);
    const response = await fetch(ajaxUrl, { method: 'POST', body: formData });
    return response.json();
}
