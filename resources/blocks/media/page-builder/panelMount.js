/**
 * Resolve the Elementor panel mount a playlist editor should portal its settings
 * into, scoped to the editor's owning widget.
 *
 * An Elementor canvas can hold several playlist widgets; each keeps its own editor
 * root mounted (and persisting) in the preview iframe. The panel's settings mount
 * (.fp-el-playlist-settings-mount) is stamped with the currently-open widget's
 * element id (data-fp-widget-id) by the top-window panel hook. Matching on that id
 * ensures only the SELECTED widget's editor portals into the panel — otherwise every
 * mounted editor targets the first mount and inspector controls collide.
 *
 * When widgetId is unknown (empty), fall back to the first attached mount so a
 * single-widget canvas still works.
 *
 * @param {Document|null} pdoc the parent (top-window) document
 * @param {string} widgetId the owning widget's Elementor element id
 * @returns {Element|null} the matching mount, or null when this widget isn't open
 */
export function resolvePlaylistPanelMount(pdoc, widgetId) {
    if (!pdoc || typeof pdoc.querySelectorAll !== 'function') {
        return null;
    }
    const attached = (node) => typeof pdoc.contains !== 'function' || pdoc.contains(node);
    const mounts = pdoc.querySelectorAll('.fp-el-playlist-settings-mount');
    const id = widgetId ? String(widgetId) : '';

    for (const mount of mounts) {
        if (!attached(mount)) {
            continue;
        }
        // No widget id to scope by -> first attached mount (single-widget canvas).
        if (!id) {
            return mount;
        }
        if (mount.getAttribute('data-fp-widget-id') === id) {
            return mount;
        }
    }
    return null;
}
