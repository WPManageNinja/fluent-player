/**
 * Divi 5 Visual Builder component for the Fluent Player Playlist module. The canvas mounts the
 * same standalone block editor (PlaylistEditor) the Gutenberg block and Elementor widget use —
 * an authoring UI, not the front-end runtime. Settings are edited in the sidebar field.
 */

import metadata from '../../../../app/PageBuilders/Divi/fluent-player-playlist/module.json';
// Registers fluent-player/playlist in the VB app-window (Pro only registers it on the CPT screen).
import '../fluent-playlist-block.jsx';
import {
    shouldRegisterImmediately,
    resolveModulePlaylistIdFromStore,
    readPlaylistId,
    readPlaylistSource,
} from './helpers';
import PlaylistSettingsField from './PlaylistSettingsField.jsx';
import PlaylistEditor from '../../media/page-builder/PlaylistEditor.jsx';
import CanvasPlaylistPicker from '../page-builder/CanvasPlaylistPicker.jsx';
import { diviPlaylistAttrs } from '../page-builder/canvasPlaylistWrite.js';
import makePickerSearchField from '../../media/divi/PickerSearchField.jsx';
import { playlistSearchConfig } from '../../media/elementor/pickerSearch.js';

// Divi's own React instance — NOT window.React — so hooks work inside Divi's tree.
const React = (window.vendor && window.vendor.React) || window.React;
const { useRef, useEffect, useState } = React;
const wp = (window.vendor && window.vendor.wp) || window.wp || {};
const __ = (wp.i18n && wp.i18n.__) ? wp.i18n.__.bind(wp.i18n) : (s) => s;
const { addAction, didAction } = wp.hooks;
const { useSelect } = wp.data;
const { ModuleContainer } = window.divi.module;
const { registerModule } = window.divi.moduleLibrary;

// Prefer window.wp so the mounted editor shares the block's React instance.
function wpElement() {
    return (window.wp && window.wp.element) || (wp && wp.element) || null;
}
function wpComponents() {
    return (window.wp && window.wp.components) || (wp && wp.components) || {};
}

// The settings panels read window.fluentPlayerBlockVars; Divi localises it as builder data.
(function primeBlockVars() {
    const data = window.FluentPlayerDiviPlaylistVbData || {};
    if (data.blockVars && !window.fluentPlayerBlockVars) {
        window.fluentPlayerBlockVars = data.blockVars;
    }
})();

// Divi forces pointer-events:none on module-content descendants (its select overlay handles
// clicks); re-enable them on the mounted playlist block editor so it's actually interactive
// (Add Media, reorder, remove). Parallels the media module's timed-content editor style.
(function injectEditorPointerStyles() {
    try {
        if (document.getElementById('fp-divi-playlist-editor-styles')) return;
        const style = document.createElement('style');
        style.id = 'fp-divi-playlist-editor-styles';
        style.textContent = '.fluent-player-d5-playlist-canvas,.fluent-player-d5-playlist-canvas *,.fluent-player-d5-picker,.fluent-player-d5-picker *{pointer-events:auto !important;}';
        (document.head || document.documentElement).appendChild(style);
    } catch (e) { /* head unavailable; harmless */ }
})();

try {
    const { registerFieldComponent } = window.divi.fieldLibrary || {};
    if (registerFieldComponent) {
        registerFieldComponent({ name: 'fluent-player/playlist-settings', component: PlaylistSettingsField });
        registerFieldComponent({ name: 'fluent-player/playlist-search', component: makePickerSearchField(playlistSearchConfig) });
    }
} catch (e) { /* field host unavailable */ }

// Read the resolved playlist id from Divi's store — reliable, unlike the edit
// component's attrs prop which Divi can hand over unresolved on the first render.
function useModulePlaylistId(moduleId, attrs) {
    const storeId = useSelect((select) => resolveModulePlaylistIdFromStore(select, moduleId), [moduleId]);
    return storeId || readPlaylistId(attrs);
}

// Write the picker's selection back to the Divi module via Divi's data registry (NOT
// wp.data); the module reads the same store and re-renders reactively. diviPlaylistAttrs
// yields the attr list for a saved-playlist or a tag selection.
function writeDiviPlaylist(moduleId, source) {
    const dd = window.divi && window.divi.data;
    if (!dd || !dd.dispatch) return;
    const ep = dd.dispatch('divi/edit-post');
    diviPlaylistAttrs(source).forEach(({ attrName, value }) => {
        ep.editModuleAttribute({ id: moduleId, attrName, value: { desktop: { value } } });
    });
}

function PlaylistCanvas({ moduleId, attrs }) {
    const ref = useRef(null);
    const pickerRef = useRef(null);
    const pickerRootRef = useRef(null);
    const playlistId = useModulePlaylistId(moduleId, attrs);
    const source = readPlaylistSource(attrs);
    const isTagMode = source.sourceType === 'tags';
    const hasContent = !!playlistId || isTagMode;
    // Remount the tag preview when the tags/query change.
    const tagKey = isTagMode ? `${source.tags.join(',')}|${JSON.stringify(source.query)}` : '';
    const [refresh] = useState(0);

    // A settings save no longer remounts the editor: PlaylistSettingsApp pushes each change
    // live via `fluentPlayer/playlistLivePreview` (edit.jsx applies it in place), so it
    // reflects immediately with no save/remount flicker. Still remounts on a source change.

    // Mount PlaylistEditor (the authoring UI, not the front-end runtime) as its own wp.element
    // root — a saved playlist by id, or a tag-source preview. Each effect run owns its root and
    // disposes it in cleanup, so a switch, a sidebar-save refresh, a deselect, or an unmount
    // always tears the prior root down — no leaked root and no render into a detached node.
    useEffect(() => {
        const wpEl = wpElement();
        const mountNode = ref.current;
        if (!mountNode || !wpEl || !hasContent) return undefined;

        const wpc = wpComponents();
        // StyleProvider points Emotion at the mount's own document; otherwise the block
        // editor's styles land in the wrong document and controls render unstyled.
        const StyleProvider = wpc.StyleProvider || wpc.__experimentalStyleProvider;
        const app = wpEl.createElement(PlaylistEditor, isTagMode
            ? { sourceType: 'tags', tags: source.tags, query: source.query, widgetId: String(moduleId || '') }
            : { playlistId: String(playlistId), widgetId: String(moduleId || '') });
        const tree = StyleProvider
            ? wpEl.createElement(StyleProvider, { document: mountNode.ownerDocument }, app)
            : app;

        let root = null;
        if (wpEl.createRoot) {
            root = wpEl.createRoot(mountNode);
            root.render(tree);
        } else if (wpEl.render) {
            wpEl.render(tree, mountNode);
        }

        return () => {
            if (root) {
                try { root.unmount(); } catch (e) { /* noop */ }
            } else if (wpEl.unmountComponentAtNode) {
                try { wpEl.unmountComponentAtNode(mountNode); } catch (e) { /* noop */ }
            }
        };
    }, [playlistId, moduleId, refresh, isTagMode, tagKey]);

    // No playlist / tags yet — mount the in-canvas picker as its own wp.element root; on a
    // pick, write the selection back through Divi's store (which re-renders this module).
    useEffect(() => {
        const wpEl = wpElement();
        if (!pickerRef.current || !wpEl || hasContent) {
            if (pickerRootRef.current) { try { pickerRootRef.current.unmount(); } catch (e) { /* noop */ } pickerRootRef.current = null; }
            return undefined;
        }
        const wpc = wpComponents();
        const StyleProvider = wpc.StyleProvider || wpc.__experimentalStyleProvider;
        const app = wpEl.createElement(CanvasPlaylistPicker, {
            onSelectPlaylist: (id) => writeDiviPlaylist(moduleId, { sourceType: 'playlist', playlistId: id }),
            onSelectTags: (tags, query) => writeDiviPlaylist(moduleId, { sourceType: 'tags', tags, query }),
        });
        const tree = StyleProvider
            ? wpEl.createElement(StyleProvider, { document: pickerRef.current.ownerDocument }, app)
            : app;
        if (wpEl.createRoot) {
            if (!pickerRootRef.current) pickerRootRef.current = wpEl.createRoot(pickerRef.current);
            pickerRootRef.current.render(tree);
        } else if (wpEl.render) {
            wpEl.render(tree, pickerRef.current);
        }
        return undefined;
    }, [hasContent, moduleId]);

    return React.createElement(
        React.Fragment,
        null,
        hasContent
            ? React.createElement('div', {
                ref,
                className: 'fluent-player-d5-wrap fluent-player-d5-playlist-canvas',
            })
            : React.createElement('div', {
                ref: pickerRef,
                className: 'fluent-player-d5-picker fluent-player-block-panel',
                style: { pointerEvents: 'auto', position: 'relative', zIndex: 1 },
            })
    );
}

const fluentPlayerPlaylistModule = {
    metadata,
    placeholderContent: {},
    renderers: {
        edit: ({ attrs, id, name, elements }) => React.createElement(
            ModuleContainer,
            { attrs, elements, id, name, moduleClassName: 'fluent_player_playlist' },
            React.createElement(PlaylistCanvas, { moduleId: id, attrs })
        ),
    },
};

const REGISTER_STORE_ACTION = 'divi.moduleLibrary.registerModuleLibraryStore.after';

function registerFluentPlayerPlaylistModule() {
    registerModule(fluentPlayerPlaylistModule.metadata, fluentPlayerPlaylistModule);
}

if (shouldRegisterImmediately(didAction, REGISTER_STORE_ACTION)) {
    registerFluentPlayerPlaylistModule();
} else {
    addAction(REGISTER_STORE_ACTION, 'fluentPlayer.diviPlaylistModule', registerFluentPlayerPlaylistModule);
}
