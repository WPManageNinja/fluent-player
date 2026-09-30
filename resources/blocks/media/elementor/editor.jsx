/**
 * Elementor editor bridge — mounts the shared MediaSettingsApp into the Fluent
 * Player widget's panel so its settings edit the selected media exactly like the
 * block. Uses wp.element globals (provided as script deps); Elementor's editor
 * hook fires when our widget's panel opens.
 */
import MediaSettingsApp from './MediaSettingsApp.jsx';
import {
    pickerOptionLabel,
    mapPickerResults,
    playlistSearchConfig,
    jsonOrThrow,
    fallbackOptionLabel,
    isAbortError,
} from './pickerSearch.js';

const { createRoot, render, createElement } = wp.element;

const roots = new WeakMap();

function restConfig() {
    const rest = (window.fluentPlayerBlockVars && window.fluentPlayerBlockVars.rest) || {};
    return { url: rest.url || '', nonce: rest.nonce || '' };
}

function restHeaders(nonce) {
    return nonce ? { 'X-WP-Nonce': nonce } : {};
}

// Turn a widget's native SELECT2 picker (media_id / playlist_id) into a server-searched,
// infinite-scroll control. The control ships NO static options (see the widgets), so this:
//   1. preloads the saved value's label (one by-id lookup) so the panel shows it,
//   2. re-inits Select2 with an AJAX transport that searches ALL rows and pages on scroll.
// The same <select> is reused, so Elementor's change binding still saves the setting.
// `config` (from pickerSearch.js) abstracts the endpoint — media (/media/search, flat
// array) and playlist (/playlist/, paginator) drive the identical UI.
function enhancePicker(panel, model, settingKey, config) {
    const $ = window.jQuery;
    if (!$ || !$.fn || !$.fn.select2) return;

    const root = (panel && panel.$el && panel.$el[0]) || document;
    const select = root.querySelector(`select[data-setting="${settingKey}"]`);
    if (!select || select._fpAjaxBound) return;

    const { nonce } = restConfig();
    const $select = $(select);
    const settings = model && model.get && model.get('settings');
    const savedId = parseInt((settings && settings.get && settings.get(settingKey)) || 0, 10);

    const initSelect2 = () => {
        try { $select.select2('destroy'); } catch (e) { /* not yet initialised */ }
        $select.select2({
            width: '100%',
            dropdownParent: $select.parent(),
            placeholder: select.getAttribute('data-placeholder') || '',
            ajax: {
                delay: 250,
                transport(params, success, failure) {
                    const q = (params.data && params.data.term) || '';
                    const page = (params.data && params.data.page) || 1;
                    // Abort a superseded request when Select2 starts a newer one, so a slow
                    // earlier response can't resolve last and overwrite fresher results.
                    const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
                    fetch(config.buildPageUrl({ q, page }), {
                        headers: restHeaders(nonce),
                        credentials: 'include',
                        signal: controller ? controller.signal : undefined,
                    })
                        .then(jsonOrThrow)
                        .then((json) => {
                            const { items, hasMore } = config.parse(json);
                            success({ results: mapPickerResults(items, config.singular), pagination: { more: hasMore } });
                        })
                        .catch((err) => {
                            // Swallow an aborted (superseded) request; route real HTTP/network
                            // errors through Select2's failure callback so the dropdown shows a
                            // problem, not a misleading empty "no results" list.
                            if (isAbortError(err)) return;
                            failure(err);
                        });
                    return { abort() { if (controller) controller.abort(); } };
                },
            },
        });
    };

    select._fpAjaxBound = true;

    // Ensure the saved value has a matching <option> (with its real label) before init,
    // otherwise Select2 renders the bare id. Skip the lookup if the option already exists.
    if (savedId && !select.querySelector(`option[value="${savedId}"]`)) {
        const preserveSavedOption = () => {
            // The by-id lookup failed (HTTP/network). Keep the saved id selected with a
            // fallback label so the widget doesn't appear to have lost its choice.
            if (!select.querySelector(`option[value="${savedId}"]`)) {
                const opt = document.createElement('option');
                opt.value = String(savedId);
                opt.textContent = fallbackOptionLabel(savedId, config.singular);
                opt.selected = true;
                select.appendChild(opt);
            }
            initSelect2();
        };

        fetch(config.buildByIdUrl(savedId), {
            headers: restHeaders(nonce),
            credentials: 'include',
        })
            .then(jsonOrThrow)
            .then((json) => {
                const item = config.parseById(json);
                if (item) {
                    const opt = document.createElement('option');
                    opt.value = String(item.ID != null ? item.ID : item.id);
                    opt.textContent = pickerOptionLabel(item, config.singular);
                    opt.selected = true;
                    select.appendChild(opt);
                    initSelect2();
                } else {
                    preserveSavedOption();
                }
            })
            .catch(preserveSavedOption);
    } else {
        initSelect2();
    }
}

function mountInto(container, mediaId, onSaved) {
    const element = createElement(MediaSettingsApp, { mediaId, onSaved });
    if (createRoot) {
        let root = roots.get(container);
        if (!root) { root = createRoot(container); roots.set(container, root); }
        root.render(element);
    } else {
        render(element, container);
    }
}

// Find the live preview view for a widget model (by element id), so we can ask
// Elementor to re-render just that widget from the server.
function findWidgetView(model) {
    try {
        if (!window.elementor || !window.elementor.getPreviewView) return null;
        const id = model && model.get && model.get('id');
        if (!id) return null;
        let found = null;
        const walk = (view) => {
            if (!view || found) return;
            if (view.model && view.model.get && view.model.get('id') === id) { found = view; return; }
            if (view.children && view.children.each) view.children.each(walk);
        };
        walk(window.elementor.getPreviewView());
        return found;
    } catch (e) { return null; }
}

// innerHTML won't run injected <script>s; re-create them in the IFRAME's document so the
// inline config executes in the window where the runtime lives.
function reexecuteScripts(root) {
    const doc = root.ownerDocument || document;
    root.querySelectorAll('script').forEach((old) => {
        const fresh = doc.createElement('script');
        for (const attr of old.attributes) fresh.setAttribute(attr.name, attr.value);
        fresh.textContent = old.textContent;
        old.replaceWith(fresh);
    });
}

// Self-contained preview (same route Divi uses): inlines the window[varName] config,
// which Elementor's renderRemoteServer() omits — so the runtime can re-hydrate after the swap.
function fetchSelfContainedPreview(mediaId) {
    const { url, nonce } = restConfig();
    const base = (url || '').replace(/\/$/, '');
    // Query-aware join: on plain permalinks rest.url is `…/?rest_route=/fluent-player/v2`,
    // so a bare `?media_id=` would be a second `?` and the param would be dropped.
    const sep = base.includes('?') ? '&' : '?';
    return fetch(`${base}/media/page-builder-preview${sep}media_id=${encodeURIComponent(mediaId)}`, {
        credentials: 'include',
        headers: restHeaders(nonce),
    }).then(jsonOrThrow).then((data) => (data && data.html) || '');
}

// The panel edits the MEDIA, not Elementor attrs, so Elementor never re-renders on its
// own. After each save, refresh this widget from the self-contained preview and re-hydrate
// the runtime in the iframe, so chapters/caption menus/title text reflect the change like
// Divi. renderRemoteServer() wouldn't inline the config, leaving those stale. Coalesced.
function makePreviewRefresher(model, readId) {
    let timer = null;
    return () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            const mediaId = readId ? readId() : 0;
            if (!mediaId) return;
            const view = findWidgetView(model);
            const el = view && view.el;
            if (!el) return;
            const container = el.querySelector('.elementor-widget-container') || el;
            fetchSelfContainedPreview(mediaId)
                .then((html) => {
                    container.innerHTML = html || '';
                    reexecuteScripts(container);
                    const doc = el.ownerDocument || document;
                    doc.dispatchEvent(new Event('FComMediaReady'));
                })
                .catch(() => { /* preview refresh is best-effort */ });
        }, 250);
    };
}

function handlePanelOpen(panel, model) {
    // Defer a tick so the RAW_HTML mount control is in the panel DOM.
    setTimeout(() => {
        const root = (panel && panel.$el && panel.$el[0]) || document;
        const container = root.querySelector('.fp-el-settings-mount');
        if (!container) return;

        // media_id lives on the element's nested `settings` model, so its changes
        // fire change:media_id THERE (not change:settings on the parent).
        const settings = model && model.get && model.get('settings');
        const readId = () => parseInt(
            (settings && settings.get && settings.get('media_id')) ||
            (model && model.getSetting && model.getSetting('media_id')) || 0,
            10
        );
        const refreshPreview = makePreviewRefresher(model, readId);
        mountInto(container, readId(), refreshPreview);

        // Switching Elementor's own Content ↔ Advanced tabs destroys and recreates the RAW_HTML
        // mount as a fresh EMPTY div, and panel/open_editor doesn't re-fire — so the settings app
        // vanished. Re-mount whenever a blank .fp-el-settings-mount (re)appears. One observer per
        // panel, refreshed for the current widget; the children-length guard makes typing in
        // controls (which churns the DOM but keeps the mount populated) a no-op.
        if (root._fpRemountObserver) root._fpRemountObserver.disconnect();
        const remountObserver = new MutationObserver(() => {
            const el = root.querySelector && root.querySelector('.fp-el-settings-mount');
            if (el && el.children.length === 0) mountInto(el, readId(), refreshPreview);
        });
        if (root.nodeType === 1) {
            remountObserver.observe(root, { childList: true, subtree: true });
            root._fpRemountObserver = remountObserver;
        }

        // Media is chosen in the canvas picker (canvas.jsx), not the sidebar — so there's no
        // media_id SELECT2 to enhance here. The settings app below still tracks the selection.

        // Re-render the app when the selected media changes. Bind once per settings
        // model (survives panel re-open); re-query the mount since it is recreated.
        if (settings && settings.on && !settings._fpElBound) {
            settings._fpElBound = true;
            settings.on('change:media_id', () => {
                const el = document.querySelector('.fp-el-settings-mount');
                if (el) mountInto(el, readId(), refreshPreview);
            });
        }
    }, 60);
}

// The playlist widget authors in the canvas (a block editor mounted in the preview
// iframe) and portals its settings into this panel's RAW_HTML mount. Stamp that mount
// with the open widget's element id so the iframe editor can target ONLY its own
// widget's panel — several playlist widgets on one canvas otherwise collide on the
// first mount. (No settings app is mounted here; the canvas editor owns rendering.)
function handlePlaylistPanelOpen(panel, model) {
    setTimeout(() => {
        const root = (panel && panel.$el && panel.$el[0]) || document;
        const mount = root.querySelector('.fp-el-playlist-settings-mount');
        const id = model && model.get && model.get('id');
        if (mount && id) mount.setAttribute('data-fp-widget-id', id);

        // Same server-searched, infinite-scroll picker as media — playlists live in Pro,
        // so this queries Pro's /playlist/ endpoint (empty without Pro, which is correct).
        enhancePicker(panel, model, 'playlist_id', playlistSearchConfig(restConfig().url));
    }, 60);
}

// The settings panel runs in this top window, but the player renders in the preview iframe —
// forward branding live-preview events across so a colour change previews immediately.
if (!window.__fpElPreviewForwarder) {
    window.__fpElPreviewForwarder = true;
    document.addEventListener('fluentPlayer/settingsPreview', (e) => {
        const iframe = document.getElementById('elementor-preview-iframe');
        const doc = iframe && iframe.contentDocument;
        if (doc) doc.dispatchEvent(new CustomEvent('fluentPlayer/settingsPreview', { detail: e.detail }));
    });
}

let bound = false;
function bindHook() {
    if (bound || !window.elementor || !window.elementor.hooks) return false;
    window.elementor.hooks.addAction('panel/open_editor/widget/fluent_player_media', handlePanelOpen);
    window.elementor.hooks.addAction('panel/open_editor/widget/fluent_player_playlist', handlePlaylistPanelOpen);
    bound = true;
    return true;
}

// The bundle may load before OR after Elementor's init fired. Bind immediately
// if Elementor is already ready; otherwise poll briefly + listen for init.
if (!bindHook()) {
    const poll = setInterval(() => { if (bindHook()) clearInterval(poll); }, 200);
    setTimeout(() => clearInterval(poll), 15000);
    window.addEventListener('elementor/init', bindHook);
    if (window.jQuery) window.jQuery(window).on('elementor/init', bindHook);
}
