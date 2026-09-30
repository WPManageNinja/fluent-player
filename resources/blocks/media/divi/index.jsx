/**
 * Divi 5 Visual Builder component for the Fluent Player module. The player is
 * server-rendered, so the edit component fetches its HTML from REST, injects it,
 * re-runs the inline config script, and asks the runtime to hydrate.
 */

import metadata from '../../../../app/PageBuilders/Divi/fluent-player-media/module.json';
import {
    fetchPlayerPreviewHtml,
    shouldRegisterImmediately,
    resolveModuleMediaIdFromStore,
    readMediaId,
} from './helpers';
import SettingsField from './SettingsField.jsx';
import makePickerSearchField from './PickerSearchField.jsx';
import { mediaSearchConfig } from '../elementor/pickerSearch.js';
import TimedContentEditor from '../page-builder/TimedContentEditor.jsx';
import CanvasMediaPicker from '../page-builder/CanvasMediaPicker.jsx';

// Write the chosen media back to the Divi module + trigger its canvas re-render, via Divi's
// own data registry (window.divi.data, NOT wp.data). The module reads the same store, so this
// reactively re-renders it. mediaId lives at content.innerContent.desktop.value.
function writeDiviMedia(moduleId, mediaId) {
    const dd = window.divi && window.divi.data;
    if (!dd || !dd.dispatch) return;
    dd.dispatch('divi/edit-post').editModuleAttribute({
        id: moduleId,
        attrName: 'content.innerContent',
        value: { desktop: { value: String(mediaId) } },
    });
}

// Divi's own React instance — NOT window.React — so hooks work inside Divi's tree.
const React = (window.vendor && window.vendor.React) || window.React;
const { useRef, useEffect, useState } = React;
const wp = (window.vendor && window.vendor.wp) || window.wp || {};
const __ = (wp.i18n && wp.i18n.__) ? wp.i18n.__.bind(wp.i18n) : (s) => s;
const { addAction, didAction } = wp.hooks;
const { useSelect } = wp.data;
const { ModuleContainer } = window.divi.module;
const { registerModule } = window.divi.moduleLibrary;

// The shared settings app reads window.fluentPlayerBlockVars; Divi localises it as builder data.
(function primeBlockVars() {
    const data = window.FluentPlayerDiviVbData || {};
    if (data.blockVars && !window.fluentPlayerBlockVars) {
        window.fluentPlayerBlockVars = data.blockVars;
    }
})();

// Divi forces pointer-events:none on module-content descendants (its select overlay
// handles clicks); re-enable them on the editor subtree so it's clickable/editable.
(function injectEditorPointerStyles() {
    try {
        if (document.getElementById('fp-divi-tc-editor-styles')) return;
        const style = document.createElement('style');
        style.id = 'fp-divi-tc-editor-styles';
        style.textContent = [
            // Timed-content editor + the in-canvas media picker must be clickable (Divi forces
            // pointer-events:none on module-content descendants). The picker rule was previously
            // only supplied by the playlist bundle, so free-only Divi had dead picker buttons.
            '.fluent-player-d5-tc-editor,.fluent-player-d5-tc-editor *{pointer-events:auto !important;}',
            '.fluent-player-d5-picker,.fluent-player-d5-picker *{pointer-events:auto !important;}',
            // The player PREVIEW stays inert so a click selects the Divi module (opens its
            // settings) — otherwise Vidstack's controls (pointer-events:auto) swallow the click.
            '.fluent-player-d5-canvas,.fluent-player-d5-canvas *{pointer-events:none !important;}',
        ].join('');
        (document.head || document.documentElement).appendChild(style);
    } catch (e) { /* head unavailable; the container inline style still helps */ }
})();

try {
    const { registerFieldComponent } = window.divi.fieldLibrary || {};
    if (registerFieldComponent) {
        registerFieldComponent({ name: 'fluent-player/settings', component: SettingsField });
        registerFieldComponent({ name: 'fluent-player/media-search', component: makePickerSearchField(mediaSearchConfig) });
    }
} catch (e) { /* field host unavailable */ }

// Read the resolved media id from Divi's store — reliable, unlike the edit
// component's attrs prop which Divi can hand over unresolved on the first render.
// resolveModuleMediaIdFromStore fetches only this module (not the whole tree). Falls
// back to the edit component's attrs prop if the store selector is unavailable (e.g. a
// future Divi drops the deprecated selector), so the canvas still resolves the id.
function useModuleMediaId(moduleId, attrs) {
    const storeId = useSelect((select) => resolveModuleMediaIdFromStore(select, moduleId), [moduleId]);
    return storeId || readMediaId(attrs);
}

// innerHTML never executes injected <script> tags; clone them so the player's
// inline config runs before the runtime initialises.
function reexecuteScripts(root) {
    root.querySelectorAll('script').forEach((old) => {
        const fresh = document.createElement('script');
        for (const attr of old.attributes) fresh.setAttribute(attr.name, attr.value);
        fresh.textContent = old.textContent;
        old.replaceWith(fresh);
    });
}

// apiFetch's rootURL/nonce middleware is unreliable in Divi's app window, so
// request with the full REST root + nonce directly. Rejects on failure so the
// canvas can surface an error rather than silently blanking.
function fetchPlayerHtml(mediaId) {
    return fetchPlayerPreviewHtml(window.fetch.bind(window), window.wpApiSettings || {}, mediaId);
}

function PlayerCanvas({ moduleId, attrs }) {
    const ref = useRef(null);
    const editorRef = useRef(null);
    const editorRootRef = useRef(null);
    const pickerRef = useRef(null);
    const pickerRootRef = useRef(null);
    const mediaId = useModuleMediaId(moduleId, attrs);
    const [refresh, setRefresh] = useState(0);
    const [previewError, setPreviewError] = useState(false);

    // Re-fetch the preview when this media's settings are saved from the sidebar.
    useEffect(() => {
        const onUpdated = (e) => {
            if (!mediaId || (e.detail && String(e.detail.mediaId) === String(mediaId))) {
                setRefresh((n) => n + 1);
            }
        };
        document.addEventListener('fluentPlayer/mediaUpdated', onUpdated);
        return () => document.removeEventListener('fluentPlayer/mediaUpdated', onUpdated);
    }, [mediaId]);

    useEffect(() => {
        let cancelled = false;
        if (!ref.current) return;
        if (!mediaId) { ref.current.innerHTML = ''; setPreviewError(false); return; }

        fetchPlayerHtml(mediaId)
            .then((html) => {
                if (cancelled || !ref.current) return;
                setPreviewError(false);
                ref.current.innerHTML = html || '';
                // The authoring editor below owns timed content in the builder, so
                // hide the player's frontend timed-content display to avoid showing
                // it twice — matching the block editor (player + authoring only).
                ref.current.querySelectorAll('.fp-timed-content-container').forEach((n) => { n.style.display = 'none'; });
                reexecuteScripts(ref.current);
                document.dispatchEvent(new Event('FComMediaReady'));
            })
            .catch(() => {
                // A failed/non-OK preview must not read as an empty module — clear the
                // stale markup and surface a retryable error instead of a blank canvas.
                if (cancelled || !ref.current) return;
                ref.current.innerHTML = '';
                setPreviewError(true);
            });
        return () => { cancelled = true; };
    }, [mediaId, refresh]);

    // No media yet — mount the canvas media picker as its own WP-React root (like the editor
    // below; it must NOT run in Divi's vendor-React tree). On pick, write back via Divi's store.
    useEffect(() => {
        const wpEl = (window.wp && window.wp.element) || (window.vendor && window.vendor.wp && window.vendor.wp.element);
        if (!pickerRef.current || !wpEl || mediaId) {
            if (pickerRootRef.current) { try { pickerRootRef.current.unmount(); } catch (e) { /* noop */ } pickerRootRef.current = null; }
            return;
        }
        const wpc = (window.wp && window.wp.components) || {};
        const StyleProvider = wpc.StyleProvider || wpc.__experimentalStyleProvider;
        const app = wpEl.createElement(CanvasMediaPicker, {
            onSelected: (id) => writeDiviMedia(moduleId, id),
            instructions: __('Select an existing media or add a new one from different sources', 'fluent-player'),
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
    }, [mediaId, moduleId]);

    // Mount the timed-content editor as its own WP-React root (the block editor
    // needs WordPress's React, not Divi's); StyleProvider keeps Emotion styles in-window.
    useEffect(() => {
        const wpEl = (window.wp && window.wp.element) || (window.vendor && window.vendor.wp && window.vendor.wp.element);
        if (!editorRef.current || !wpEl || !mediaId) {
            if (editorRootRef.current) { try { editorRootRef.current.unmount(); } catch (e) { /* noop */ } editorRootRef.current = null; }
            return;
        }
        const wpc = (window.wp && window.wp.components) || {};
        const StyleProvider = wpc.StyleProvider || wpc.__experimentalStyleProvider;
        const app = wpEl.createElement(TimedContentEditor, { mediaId: String(mediaId) });
        const tree = StyleProvider
            ? wpEl.createElement(StyleProvider, { document: editorRef.current.ownerDocument }, app)
            : app;
        if (wpEl.createRoot) {
            if (!editorRootRef.current) editorRootRef.current = wpEl.createRoot(editorRef.current);
            editorRootRef.current.render(tree);
        } else if (wpEl.render) {
            wpEl.render(tree, editorRef.current);
        }
    }, [mediaId]);

    return React.createElement(
        React.Fragment,
        null,
        React.createElement('div', {
            ref,
            className: 'fluent-player-d5-wrap fluent-player-d5-canvas',
        }),
        // No media → the canvas picker (a separate WP-React root) mounts here.
        !mediaId ? React.createElement('div', {
            ref: pickerRef,
            className: 'fluent-player-d5-picker fluent-player-block-panel',
            style: { pointerEvents: 'auto', position: 'relative', zIndex: 1 },
        }) : null,
        previewError ? React.createElement('div', {
            className: 'fluent-player-d5-preview-error',
            role: 'alert',
            style: { padding: 16, margin: '8px 0', textAlign: 'center', border: '1px solid #f0b7b7', borderRadius: 8, background: '#fcf0f1', color: '#b91c1c' },
        },
            React.createElement('div', null, __('Couldn’t load the player preview.', 'fluent-player')),
            React.createElement('button', {
                type: 'button',
                className: 'components-button is-secondary',
                style: { marginTop: 8 },
                onClick: () => setRefresh((n) => n + 1),
            }, __('Retry', 'fluent-player'))
        ) : null,
        // pointer-events re-enabled here (Divi disables them on module content) so the
        // editor is clickable; the player above stays inert and still selects the module.
        mediaId ? React.createElement('div', {
            ref: editorRef,
            className: 'fluent-player-d5-tc-editor',
            style: { pointerEvents: 'auto', position: 'relative', zIndex: 1 },
        }) : null
    );
}

const fluentPlayerModule = {
    metadata,
    placeholderContent: {},
    renderers: {
        edit: ({ attrs, id, name, elements }) => React.createElement(
            ModuleContainer,
            { attrs, elements, id, name, moduleClassName: 'fluent_player_media' },
            React.createElement(PlayerCanvas, { moduleId: id, attrs })
        ),
    },
};

const REGISTER_STORE_ACTION = 'divi.moduleLibrary.registerModuleLibraryStore.after';

function registerFluentPlayerModule() {
    registerModule(fluentPlayerModule.metadata, fluentPlayerModule);
}

// A classic production script runs before the store-registered action (hook it);
// a deferred ES module under the dev server may run after it fired (register now).
if (shouldRegisterImmediately(didAction, REGISTER_STORE_ACTION)) {
    registerFluentPlayerModule();
} else {
    addAction(REGISTER_STORE_ACTION, 'fluentPlayer.diviModule', registerFluentPlayerModule);
}
