/**
 * Resolve the persistent timed-content editor mount for a Fluent Player widget in
 * the Elementor preview iframe.
 *
 * Elementor re-renders a widget server-side (renderRemoteServer) on every media
 * change, replacing the contents of `.elementor-widget-container`. A React root
 * mounted inside that container would be wiped on each refresh (dropping editing
 * state). So the mount is appended to the `.elementor-element` wrapper — a sibling
 * of the re-rendered container — and reused across renders.
 *
 * @param {Element|null} elementorElement the widget's `.elementor-element` wrapper
 * @returns {Element|null} the (created-once) mount node, or null if no element
 */
export function resolveCanvasMount(elementorElement) {
    if (!elementorElement || typeof elementorElement.querySelector !== 'function') {
        return null;
    }

    const existing = elementorElement.querySelector(':scope > .fp-el-tc-editor-mount');
    if (existing) {
        return existing;
    }

    const doc = elementorElement.ownerDocument || document;
    const mount = doc.createElement('div');
    mount.className = 'fp-el-tc-editor-mount fluent-player-block-panel';
    // Elementor makes preview widgets non-interactive (it intercepts clicks to
    // select/edit the widget). Re-enable pointer events and lift the mount above
    // Elementor's edit overlay so the block editor inside is actually clickable.
    mount.style.pointerEvents = 'auto';
    mount.style.position = 'relative';
    mount.style.zIndex = '10';
    elementorElement.appendChild(mount);
    return mount;
}

/**
 * Stop a mount's pointer events from reaching Elementor's widget handlers, which select the
 * widget on mousedown and blur the canvas mid-interaction.
 *
 * stopPropagation, NOT stopImmediatePropagation: React 18 delegates at the root container,
 * which is this mount, so the mount's own listeners must still run.
 *
 * Only for mounts that own their whole interaction (the in-canvas pickers) — the playlist
 * editor mount needs its clicks to bubble so Elementor opens the widget panel.
 *
 * @param {Element|null} mount
 */
export function isolateFromElementor(mount) {
    if (!mount || mount._fpIsolated) {
        return;
    }
    mount._fpIsolated = true;
    ['mousedown', 'pointerdown', 'click', 'dblclick'].forEach((type) => {
        mount.addEventListener(type, (e) => { e.stopPropagation(); }, false);
    });
}

/**
 * Read the media id the widget rendered, from the player markup's data-media-id
 * (emitted by MediaRenderer). Returns "" when no media is selected/rendered yet.
 *
 * @param {Element|null} scopeEl the widget's `.elementor-element` wrapper
 * @returns {string}
 */
export function readWidgetMediaId(scopeEl) {
    if (!scopeEl || typeof scopeEl.querySelector !== 'function') {
        return '';
    }
    const node = scopeEl.querySelector('[data-media-id]');
    const id = node && node.getAttribute('data-media-id');
    return id ? String(id) : '';
}

/**
 * Tear down editor roots whose mount node has been detached from the document —
 * i.e. the Elementor widget was deleted. A server re-render keeps the mount
 * attached (it's a sibling of the re-rendered container), so those are left alone.
 * Without this, a deleted widget leaks its React root + TimedContentEditor's
 * document event listeners. Mutates `mounts`, dropping cleaned-up entries.
 *
 * @param {Map<Element, {root: {unmount?: Function}}>} mounts
 * @param {Document} doc
 */
export function cleanupDetachedMounts(mounts, doc) {
    if (!mounts || typeof mounts.forEach !== 'function') {
        return;
    }
    mounts.forEach((entry, mount) => {
        if (doc && typeof doc.contains === 'function' && doc.contains(mount)) {
            return; // still live (e.g. a re-render) — keep it
        }
        try {
            if (entry && entry.root && typeof entry.root.unmount === 'function') {
                entry.root.unmount();
            }
        } catch (e) { /* already gone */ }
        mounts.delete(mount);
    });
}

/**
 * Tear down the editor a widget still holds — used when its media is cleared, so
 * the persistent mount doesn't leave an editor for the old media under a widget
 * that no longer represents it. Unmounts the root, forgets it, removes the node.
 *
 * @param {Element|null} scopeEl the widget's `.elementor-element` wrapper
 * @param {Map<Element, {root: {unmount?: Function}}>} mounts
 * @returns {boolean} whether a mount was torn down
 */
export function teardownMount(scopeEl, mounts) {
    if (!scopeEl || typeof scopeEl.querySelector !== 'function') {
        return false;
    }
    const mount = scopeEl.querySelector(':scope > .fp-el-tc-editor-mount');
    if (!mount) {
        return false;
    }
    const entry = mounts && typeof mounts.get === 'function' ? mounts.get(mount) : null;
    try {
        if (entry && entry.root && typeof entry.root.unmount === 'function') {
            entry.root.unmount();
        }
    } catch (e) { /* already gone */ }
    if (mounts && typeof mounts.delete === 'function') {
        mounts.delete(mount);
    }
    if (mount.parentNode) {
        mount.parentNode.removeChild(mount);
    }
    return true;
}

/**
 * Whether a batch of MutationObserver records actually removed nodes, so the
 * detached-mount sweep only runs on a delete/clear — not on the frequent add /
 * attribute churn from typing or opening popovers in the editor.
 *
 * @param {MutationRecord[]|null} records
 * @returns {boolean}
 */
export function mutationsIncludeRemovals(records) {
    return Array.isArray(records)
        && records.some((r) => r && r.removedNodes && r.removedNodes.length > 0);
}
