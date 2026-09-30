/**
 * Elementor preview-iframe bridge for the Playlist widget — mounts the standalone
 * playlist block editor (PlaylistEditor) below the widget in the canvas for a saved
 * playlist, and the in-canvas picker (CanvasPlaylistPicker) on an empty widget. A
 * tag-source widget just shows its server render. Parallels the media bridge.
 */
import PlaylistEditor from '../page-builder/PlaylistEditor.jsx';
import CanvasPlaylistPicker from '../../playlist/page-builder/CanvasPlaylistPicker.jsx';
import { elementorPlaylistSettings } from '../../playlist/page-builder/canvasPlaylistWrite.js';
import {
    resolveCanvasMount,
    cleanupDetachedMounts,
    teardownMount,
    mutationsIncludeRemovals,
    isolateFromElementor,
} from './canvasMount.js';

const wp = window.wp || {};

// mount node -> { root, playlistId } so a bare re-render doesn't remount the editor.
const mounted = new Map();
const pickerMounts = new Map();

function readPlaylistId(scopeEl) {
    if (!scopeEl || typeof scopeEl.querySelector !== 'function') return '';
    const node = scopeEl.querySelector('[data-playlist-id]');
    const id = node && node.getAttribute('data-playlist-id');
    return id ? String(id) : '';
}

// A tag-source widget renders server-side (renderPlaylist wraps it with this marker); the
// canvas shows that render, no block editor or picker.
function isTagSource(scopeEl) {
    return !!(scopeEl && scopeEl.querySelector && scopeEl.querySelector('.fluent-player-page-builder[data-playlist-source="tags"]'));
}

function injectInteractiveStyles(doc) {
    if (!doc || doc.getElementById('fp-el-playlist-editor-styles')) return;
    const style = doc.createElement('style');
    style.id = 'fp-el-playlist-editor-styles';
    style.textContent = '.fp-el-tc-editor-mount,.fp-el-tc-editor-mount *,.fp-el-playlist-picker-mount,.fp-el-playlist-picker-mount *{pointer-events:auto !important;}';
    (doc.head || doc.documentElement).appendChild(style);
}

// Write the picker selection back to the widget model + trigger its server re-render.
// This runs in the preview iframe, so the editor model lives on window.parent.
function writeElementorPlaylist(scopeEl, source) {
    const host = scopeEl.closest('[data-id]');
    const elId = host && host.dataset.id;
    const top = window.parent;
    if (!elId || !top || !top.$e || !top.elementor) return;
    const container = top.elementor.getContainer(elId);
    if (container) {
        top.$e.run('document/elements/settings', { container, settings: elementorPlaylistSettings(source) });
    }
}

function mountPlaylistPicker(scopeEl) {
    if (!wp.element) return;
    // Hide the widget's server-rendered "select a playlist" placeholder while the picker shows.
    const serverContent = scopeEl.querySelector(':scope > .elementor-widget-container');
    if (serverContent) serverContent.style.display = 'none';

    let mount = scopeEl.querySelector(':scope > .fp-el-playlist-picker-mount');
    if (!mount) {
        mount = scopeEl.ownerDocument.createElement('div');
        // No `fp-el-host`: that's the dark sidebar-panel theme, wrong on the light canvas.
        mount.className = 'fp-el-playlist-picker-mount fluent-player-block-panel';
        scopeEl.appendChild(mount);
    }
    injectInteractiveStyles(mount.ownerDocument);
    // Elementor's mousedown blurs the canvas, closing the tag suggestion list before mouseup
    // — no click is dispatched and picking a tag does nothing. Not for the editor mount below.
    isolateFromElementor(mount);
    if (pickerMounts.has(mount)) return;

    const app = wp.element.createElement(CanvasPlaylistPicker, {
        onSelectPlaylist: (id) => writeElementorPlaylist(scopeEl, { sourceType: 'playlist', playlistId: id }),
        onSelectTags: (tags, query) => writeElementorPlaylist(scopeEl, { sourceType: 'tags', tags, query }),
    });
    let root = null;
    if (wp.element.createRoot) { root = wp.element.createRoot(mount); root.render(app); }
    else if (wp.element.render) { wp.element.render(app, mount); }
    pickerMounts.set(mount, { root });
}

function removePlaylistPicker(scopeEl) {
    const serverContent = scopeEl.querySelector(':scope > .elementor-widget-container');
    if (serverContent) serverContent.style.display = '';
    const mount = scopeEl.querySelector(':scope > .fp-el-playlist-picker-mount');
    if (!mount) return;
    const entry = pickerMounts.get(mount);
    try { if (entry && entry.root && entry.root.unmount) entry.root.unmount(); } catch (e) { /* gone */ }
    pickerMounts.delete(mount);
    mount.remove();
}

let removalObserver = null;
let sweepScheduled = false;
function ensureRemovalObserver(doc) {
    if (removalObserver || !doc || typeof MutationObserver === 'undefined') return;
    removalObserver = new MutationObserver((records) => {
        if (!mutationsIncludeRemovals(records) || sweepScheduled) return;
        sweepScheduled = true;
        const raf = doc.defaultView && doc.defaultView.requestAnimationFrame;
        const run = () => { sweepScheduled = false; cleanupDetachedMounts(mounted, doc); };
        if (raf) raf(run); else run();
    });
    removalObserver.observe(doc.body || doc.documentElement, { childList: true, subtree: true });
}

function mountEditor(scopeEl) {
    if (!wp.element || !scopeEl) return;

    const playlistId = readPlaylistId(scopeEl);

    // Saved playlist → hide the front-end render and mount the authoring block editor.
    if (playlistId) {
        removePlaylistPicker(scopeEl);
        scopeEl.querySelectorAll('.fluent-playlist-container, .fp-media-block').forEach((n) => { n.style.display = 'none'; });

        const mount = resolveCanvasMount(scopeEl);
        if (!mount) return;

        injectInteractiveStyles(mount.ownerDocument);
        ensureRemovalObserver(mount.ownerDocument);

        const prev = mounted.get(mount);
        if (prev && prev.playlistId === playlistId) return; // unchanged → keep the live editor

        const widgetId = (scopeEl.getAttribute && scopeEl.getAttribute('data-id')) || '';
        const wpc = wp.components || {};
        const StyleProvider = wpc.StyleProvider || wpc.__experimentalStyleProvider;
        const app = wp.element.createElement(PlaylistEditor, { playlistId, widgetId, key: playlistId });
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
        mounted.set(mount, { root, playlistId });
        return;
    }

    // No saved playlist → tear down any editor left from a previous selection.
    teardownMount(scopeEl, mounted);

    // Tag source → the server already rendered the tag playlist; show it (no picker).
    if (isTagSource(scopeEl)) {
        removePlaylistPicker(scopeEl);
        return;
    }

    // Truly empty → the in-canvas picker owns selection (no sidebar control).
    mountPlaylistPicker(scopeEl);
}

function onElementReady($scope) {
    const el = ($scope && $scope[0]) || $scope;
    mountEditor(el);
}

function bind() {
    const ef = window.elementorFrontend;
    if (!ef || !ef.hooks) return false;
    ef.hooks.addAction('frontend/element_ready/fluent_player_playlist.default', onElementReady);
    return true;
}

if (!bind()) {
    window.addEventListener('elementor/frontend/init', bind);
    if (window.jQuery) window.jQuery(window).on('elementor/frontend/init', bind);
}
