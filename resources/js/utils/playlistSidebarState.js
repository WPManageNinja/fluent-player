/**
 * Decide how the playlist sidebar's collapsed state should change on a resize /
 * breakpoint event, given whether we are now on mobile and whether we were on
 * mobile on the previous evaluation.
 *
 * Only an actual crossing of the mobile breakpoint changes the state:
 *   - entering mobile (wasMobile !== true → isMobile)  → collapse (mobile default)
 *   - leaving mobile  (wasMobile === true → !isMobile)  → restore (expand)
 *   - staying on the same side of the breakpoint        → do nothing, so the
 *     user's manual toggle (sidebar-collapsed) is preserved.
 *
 * The "do nothing when staying" rule is the fix for the toggle reverting: the
 * desktop branch previously force-expanded on every resize, and the resize
 * handler's self-perpetuating loop made that happen continuously.
 *
 * @param {boolean} isMobile  Whether the viewport is now at/below the breakpoint.
 * @param {boolean} wasMobile Whether it was on the previous evaluation.
 * @returns {{collapse: boolean, restore: boolean}}
 */
export function resolveSidebarTransition(isMobile, wasMobile) {
    return {
        collapse: isMobile && wasMobile !== true,
        restore: !isMobile && wasMobile === true,
    };
}
