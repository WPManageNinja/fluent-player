/**
 * True when a click should dismiss the colour picker: it landed neither on the trigger nor
 * inside the (portaled) popover. Divi mounts the popover on a body-level host, so this matches
 * the popover by class rather than by DOM containment. Kept wp-free so it unit-tests directly.
 */
export function isClickOutsideColorPopover(target, triggerEl) {
    if (!target || !triggerEl) return false;
    if (triggerEl.contains(target)) return false;
    // Match the popover by class (Divi portals it to a body-level host) and, defensively, any
    // WP popover/dropdown portal — e.g. ColorPalette's advanced custom-colour sub-popover, so a
    // click there doesn't dismiss the picker.
    if (typeof target.closest === 'function'
        && target.closest('.fp-color-picker-popover, .components-popover, .components-dropdown__content')) {
        return false;
    }
    return true;
}
