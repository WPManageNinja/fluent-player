// Shared pure helpers for the Divi 5 Visual Builder module components. The media and
// playlist modules are structurally identical — they read a scalar id from the same
// attribute path, resolve it from the same store, inject options into the same field,
// and fetch a server-rendered preview from a parallel endpoint. This module holds that
// single source of truth; media/divi/helpers.js and playlist/divi/helpers.js are thin,
// named wrappers so a fix (e.g. to the deprecated-selector fallback) lands in both.

// Divi can pass an unresolved (object) responsive value before it settles to the scalar
// id; only accept a scalar so we never build a request with "[object Object]".
export function coerceScalarId(value) {
    return (typeof value === 'string' || typeof value === 'number') ? String(value) : '';
}

// The selected id is stored on the module's content.innerContent attribute (the native
// Divi content field the settings sidebar writes to).
export function readModuleId(attrs) {
    const value = attrs
        && attrs.content
        && attrs.content.innerContent
        && attrs.content.innerContent.desktop
        && attrs.content.innerContent.desktop.value;
    return coerceScalarId(value);
}

// The store holds the resolved attribute value, unlike the edit component's attrs prop
// which Divi can hand over unresolved on the first render.
export function pickModuleId(module) {
    const attrs = module && ((module.props && module.props.attrs) || module.attrs);
    return readModuleId(attrs);
}

// Resolve a module's id from Divi's edit-post store by fetching ONLY that module (not the
// whole tree), so N instances don't each scan all M modules on every store update.
// Prefers the stable selector; falls back to Divi's deprecated alias for older builds.
export function resolveModuleIdFromStore(select, moduleId) {
    try {
        const ep = typeof select === 'function' ? select('divi/edit-post') : null;
        const getModules = ep && (ep.getModulesByIds || ep.__DEPRECATED__getModulesByIds);
        if (!getModules) {
            return '';
        }
        const mods = getModules.call(ep, [moduleId]);
        const list = mods ? (Array.isArray(mods) ? mods : Object.values(mods)) : [];
        return pickModuleId(list.find((m) => m && m.id === moduleId) || list[0]);
    } catch (e) {
        return '';
    }
}

// REST URL for the on-canvas server-rendered preview: /fluent-player/v2/<endpoint>?<param>=<id>.
export function buildModulePreviewUrl(root, id, endpoint, param) {
    const base = (root || '/wp-json/').replace(/\/$/, '');
    return `${base}/fluent-player/v2/${endpoint}?${param}=${encodeURIComponent(id)}`;
}

// Fetch the preview HTML; throws on a non-OK response so the caller can distinguish a real
// failure from an empty-but-successful render (and show an error instead of a blank canvas).
export async function fetchModulePreviewHtml(fetchImpl, settings, id, endpoint, param, errorLabel) {
    const res = await fetchImpl(buildModulePreviewUrl(settings.root, id, endpoint, param), {
        credentials: 'include',
        headers: settings.nonce ? { 'X-WP-Nonce': settings.nonce } : {},
    });
    if (!res.ok) {
        throw new Error(`${errorLabel} (${res.status})`);
    }
    const data = await res.json();
    return (data && data.html) || '';
}

// A deferred ES module (dev server) may run after the store-registered action fired; a
// classic production script runs before it — so register now vs. hook the action.
export function shouldRegisterImmediately(didActionFn, actionName) {
    return typeof didActionFn === 'function' && didActionFn(actionName) > 0;
}
