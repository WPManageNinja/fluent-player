/**
 * Elementor preview-iframe bridge — mounts the shared timed-content block editor
 * (reused from the Divi integration) below the Fluent Player widget in the canvas.
 *
 * Elementor re-renders the widget server-side on every media change, so the editor
 * is mounted into resolveCanvasMount()'s persistent node (a sibling of the
 * re-rendered container) and only re-rendered when the media actually changes —
 * a plain re-render preserves the live editor + its focus.
 */
import TimedContentEditor from '../page-builder/TimedContentEditor.jsx';
import CanvasMediaPicker from '../page-builder/CanvasMediaPicker.jsx';
import {
    resolveCanvasMount,
    readWidgetMediaId,
    cleanupDetachedMounts,
    teardownMount,
    mutationsIncludeRemovals,
} from './canvasMount.js';

const wp = window.wp || {};

// Picker mounts (empty widget) keyed by their host node, so a re-render reuses the root.
const pickerMounts = new Map();

// Write the chosen media back to the Elementor widget model + trigger its server re-render.
// canvas.jsx runs in the preview iframe, so the editor model lives on window.parent.
function writeElementorMedia(scopeEl, mediaId) {
    const host = scopeEl.closest('[data-id]');
    const elId = host && host.dataset.id;
    const top = window.parent;
    if (!elId || !top || !top.$e || !top.elementor) return;
    const container = top.elementor.getContainer(elId);
    if (container) {
        top.$e.run('document/elements/settings', { container, settings: { media_id: String(mediaId) } });
    }
}

// Mount the canvas media picker on an empty widget; unmount it once media is chosen.
function mountPicker(scopeEl) {
    if (!wp.element) return;
    // Hide the widget's server-rendered "select a media" placeholder while the picker shows.
    const serverContent = scopeEl.querySelector(':scope > .elementor-widget-container');
    if (serverContent) serverContent.style.display = 'none';

    let mount = scopeEl.querySelector(':scope > .fp-el-picker-mount');
    if (!mount) {
        mount = scopeEl.ownerDocument.createElement('div');
        mount.className = 'fp-el-picker-mount fluent-player-block-panel fp-el-host';
        scopeEl.appendChild(mount);
    }
    if (pickerMounts.has(mount)) return; // already mounted
    const app = wp.element.createElement(CanvasMediaPicker, {
        onSelected: (mediaId) => writeElementorMedia(scopeEl, mediaId),
        instructions: 'Select an existing media or add a new one from different sources',
    });
    let root = null;
    if (wp.element.createRoot) { root = wp.element.createRoot(mount); root.render(app); }
    else if (wp.element.render) { wp.element.render(app, mount); }
    pickerMounts.set(mount, { root });
}

function removePicker(scopeEl) {
    const serverContent = scopeEl.querySelector(':scope > .elementor-widget-container');
    if (serverContent) serverContent.style.display = '';
    const mount = scopeEl.querySelector(':scope > .fp-el-picker-mount');
    if (!mount) return;
    const entry = pickerMounts.get(mount);
    try { if (entry && entry.root && entry.root.unmount) entry.root.unmount(); } catch (e) { /* gone */ }
    pickerMounts.delete(mount);
    mount.remove();
}

// mount node -> { root, mediaId } so a bare re-render doesn't remount the editor.
// A Map (not WeakMap) so we can sweep it when a widget is deleted.
const mounted = new Map();

// Unmount editor roots when their widget is removed from the canvas, so a deleted
// widget doesn't leak its React root + TimedContentEditor's document listeners.
let removalObserver = null;
let sweepScheduled = false;
function ensureRemovalObserver(doc) {
    if (removalObserver || !doc || typeof MutationObserver === 'undefined') return;
    removalObserver = new MutationObserver((records) => {
        // Only sweep on an actual removal (delete/clear), and coalesce to one pass
        // per frame — typing/popovers churn the subtree with adds we can ignore.
        if (!mutationsIncludeRemovals(records) || sweepScheduled) return;
        sweepScheduled = true;
        const raf = doc.defaultView && doc.defaultView.requestAnimationFrame;
        const run = () => { sweepScheduled = false; cleanupDetachedMounts(mounted, doc); };
        if (raf) raf(run); else run();
    });
    removalObserver.observe(doc.body || doc.documentElement, { childList: true, subtree: true });
}

// Elementor disables pointer events on preview content and intercepts clicks to
// select the widget. Re-enable events on the whole editor subtree, and stop the
// editor's own clicks from bubbling to Elementor so typing/clicking never selects
// or deselects the widget — the editor behaves like the block editor.
function injectInteractiveStyles(doc) {
    if (!doc || doc.getElementById('fp-el-tc-editor-styles')) return;
    const style = doc.createElement('style');
    style.id = 'fp-el-tc-editor-styles';
    style.textContent = '.fp-el-tc-editor-mount,.fp-el-tc-editor-mount *{pointer-events:auto !important;}';
    (doc.head || doc.documentElement).appendChild(style);
}

function isolateFromElementor(mount) {
    if (!mount || mount._fpIsolated) return;
    mount._fpIsolated = true;
    ['mousedown', 'pointerdown', 'click', 'dblclick'].forEach((type) => {
        mount.addEventListener(type, (e) => { e.stopPropagation(); }, false);
    });
}

function mountEditor(scopeEl) {
    if (!wp.element || !scopeEl) return;

    // The authoring editor owns timed content in the builder; hide the player's
    // frontend timed-content display so it isn't shown twice (mirrors Divi).
    scopeEl.querySelectorAll('.fp-timed-content-container').forEach((n) => { n.style.display = 'none'; });

    const mediaId = readWidgetMediaId(scopeEl);
    if (!mediaId) {
        // No media yet — tear down any editor from an old media and show the picker so the
        // media is chosen right in the canvas (no sidebar control).
        teardownMount(scopeEl, mounted);
        mountPicker(scopeEl);
        return;
    }

    // Media chosen — remove the picker if it was showing, then mount the timed-content editor.
    removePicker(scopeEl);

    const mount = resolveCanvasMount(scopeEl);
    if (!mount) return;

    injectInteractiveStyles(mount.ownerDocument);
    isolateFromElementor(mount);
    ensureRemovalObserver(mount.ownerDocument);

    const prev = mounted.get(mount);
    if (prev && prev.mediaId === mediaId) return; // unchanged media → keep the live editor

    const wpc = wp.components || {};
    const StyleProvider = wpc.StyleProvider || wpc.__experimentalStyleProvider;
    const app = wp.element.createElement(TimedContentEditor, { mediaId });
    const tree = StyleProvider
        ? wp.element.createElement(StyleProvider, { document: mount.ownerDocument }, app)
        : app;

    let root = prev && prev.root;
    if (wp.element.createRoot) {
        if (!root) root = wp.element.createRoot(mount);
        root.render(tree);
    } else if (wp.element.render) {
        wp.element.render(tree, mount);
    }
    mounted.set(mount, { root, mediaId });
}

function onElementReady($scope) {
    const el = ($scope && $scope[0]) || $scope;
    mountEditor(el);
}

function bind() {
    const ef = window.elementorFrontend;
    if (!ef || !ef.hooks) return false;
    ef.hooks.addAction('frontend/element_ready/fluent_player_media.default', onElementReady);
    return true;
}

// The preview bundle can load before OR after elementorFrontend inits.
if (!bind()) {
    window.addEventListener('elementor/frontend/init', bind);
    if (window.jQuery) window.jQuery(window).on('elementor/frontend/init', bind);
}
