/**
 * Mobile nav toggle for the admin header (handheld menu button + dropdown).
 * The nav HTML is rendered by PHP; this composable wires up click-to-open/close
 * and outside-click-to-close from the Vue app.
 *
 * @param {HTMLElement} [appRoot] - Root element containing .fplayer-handheld and .fplayer-navbar-center. If omitted, falls back to .fplayer-app or [id$="-app"].
 * @returns {function} cleanup - Call on beforeUnmount to remove listeners.
 */
export function initMobileNav(appRoot) {
    const root =
        appRoot ||
        document.querySelector('.fplayer-app') ||
        document.querySelector('[id$="-app"]');
    if (!root) return () => {};

    const handheld = root.querySelector('.fplayer-handheld');
    const center = root.querySelector('.fplayer-navbar-center');
    const menu = root.querySelector('.fplayer-menu');
    if (!handheld || !center || !menu) return () => {};

    const MENU_OPEN_CLASS = 'fplayer-menu-open';

    function closeMenu() {
        center.classList.remove(MENU_OPEN_CLASS);
    }

    function handleDocumentClick(e) {
        if (!center.classList.contains(MENU_OPEN_CLASS)) return;
        if (center.contains(e.target)) return;
        closeMenu();
    }

    function onHandheldClick(e) {
        e.preventDefault();
        e.stopPropagation();
        center.classList.toggle(MENU_OPEN_CLASS);
    }

    function onMenuLinkClick() {
        closeMenu();
    }

    handheld.addEventListener('click', onHandheldClick);
    document.addEventListener('click', handleDocumentClick);

    const links = menu.querySelectorAll('a');
    links.forEach((link) => link.addEventListener('click', onMenuLinkClick));

    return function cleanup() {
        handheld.removeEventListener('click', onHandheldClick);
        document.removeEventListener('click', handleDocumentClick);
        links.forEach((link) => link.removeEventListener('click', onMenuLinkClick));
    };
}
