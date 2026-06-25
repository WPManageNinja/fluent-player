/**
 * App Configuration Composable
 * Provides centralized access to date formatting and other app-wide settings
 */

/**
 * Get the user's locale for date formatting
 * @returns {string} The locale string (e.g., 'en-US')
 */
export function getUserLocale() {
    const locale = window.fluentFrameworkAdmin?.user_locale || 'en-US';
    return locale.replace('_', '-');
}

/**
 * Format a date string according to WordPress settings
 * @param {string|Date} dateInput - The date to format
 * @param {object} options - Optional Intl.DateTimeFormat options
 * @returns {string} The formatted date string
 */
export function formatDate(dateInput, options = {}) {
    if (!dateInput) return '--';

    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    };

    return new Intl.DateTimeFormat(getUserLocale(), defaultOptions).format(date);
}
