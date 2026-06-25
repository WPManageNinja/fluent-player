/**
 * Toggle the server-rendered Analytics nav link to match the given enabled
 * state. Shared by the settings shell (index.vue) and the Analytics tab so the
 * link stays in sync regardless of which one triggers the change.
 *
 * @param {boolean} enabled Whether analytics is enabled.
 */
export function toggleAnalyticsMenu(enabled) {
    const $el = jQuery('.fplayer-menu .fplayer-item__analytics');
    if ($el.length) {
        $el.toggle(!!enabled);
    }
}
