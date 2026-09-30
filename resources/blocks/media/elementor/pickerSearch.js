// Generalized, config-driven server-side search for the Elementor SELECT2 pickers.
// One module drives BOTH the media picker and the playlist picker so the two never
// drift. Each config knows its endpoint's URL shape, response shape, and by-id preload:
//   - media    → /media/search  (flat array, offset/limit paging)          [free]
//   - playlist → /playlist/      (WPFluent paginator, page/per_page paging) [Pro]
// The DOM/Select2 wiring lives in editor.jsx; this stays pure/unit-testable.

// How many rows to request per page (also the infinite-scroll page size).
export const PICKER_PAGE_SIZE = 30;

const trimSlash = (s) => String(s || '').replace(/\/$/, '');

// Reject a non-2xx response BEFORE parsing so an HTTP error (expired nonce, auth failure,
// 500) surfaces as a rejection routed to the caller's failure path — not mis-read as an
// empty-but-successful result set (which silently reads as "no matching items").
export function jsonOrThrow(res) {
    if (!res || !res.ok) {
        throw new Error(`Picker request failed (${res ? res.status : 'network error'})`);
    }
    return res.json();
}

// Label for a saved selection whose by-id lookup failed: keep the id visible and selected
// rather than silently dropping the widget's existing choice.
export function fallbackOptionLabel(id, singularFallback = 'Item') {
    return `${singularFallback} #${id}`;
}

// True for a fetch aborted because a newer request superseded it. Callers swallow these so a
// stale (slower) response can never overwrite the results of a fresher query.
export function isAbortError(err) {
    return !!err && err.name === 'AbortError';
}

// "Title (#id)" — the shared picker label, so an item reads identically in the Elementor
// SELECT2 dropdown and the Divi async field.
export function pickerOptionLabel(item, singularFallback = 'Item') {
    const id = item && (item.ID != null ? item.ID : item.id);
    const title = (item && item.post_title) ? item.post_title : `${singularFallback} #${id}`;
    return `${title} (#${id})`;
}

// Map result rows into the Divi native-select `options` shape: { "<id>": { label, name } }.
// (Divi's divi/select renders a static options object; the async wrapper feeds it these.)
export function mapPickerOptionsToDivi(list, singularFallback) {
    const out = {};
    (Array.isArray(list) ? list : []).forEach((m) => {
        const id = String(m.ID != null ? m.ID : m.id);
        out[id] = { label: pickerOptionLabel(m, singularFallback), name: id };
    });
    return out;
}

// Map a list of {ID, post_title} rows into Select2 result objects. String ids so they
// compare equal to the <option> value / the stored Elementor setting.
export function mapPickerResults(list, singularFallback) {
    return (Array.isArray(list) ? list : []).map((m) => ({
        id: String(m.ID != null ? m.ID : m.id),
        text: pickerOptionLabel(m, singularFallback),
    }));
}

// A full page came back → there may be more (offset-based paging); a short page is last.
export function hasMoreFromCount(list, pageSize = PICKER_PAGE_SIZE) {
    return Array.isArray(list) && list.length >= pageSize;
}

// Media picker: /media/search?q=&limit=&offset= returns a FLAT array (free endpoint).
export function mediaSearchConfig(restUrl) {
    const base = trimSlash(restUrl);
    return {
        singular: 'Media',
        buildPageUrl({ q = '', page = 1, pageSize = PICKER_PAGE_SIZE } = {}) {
            const offset = (Math.max(1, page) - 1) * pageSize;
            return `${base}/media/search?q=${encodeURIComponent(q)}&limit=${pageSize}&offset=${offset}`;
        },
        buildByIdUrl(id) {
            return `${base}/media/search?medias=${encodeURIComponent(JSON.stringify([Number(id)]))}`;
        },
        parse(json, pageSize = PICKER_PAGE_SIZE) {
            const items = Array.isArray(json) ? json : [];
            return { items, hasMore: hasMoreFromCount(items, pageSize) };
        },
        parseById(json) {
            return (Array.isArray(json) && json[0]) ? json[0] : null;
        },
    };
}

// Playlist picker: /playlist/?query=&per_page=&page= returns a WPFluent PAGINATOR
// ({ data, current_page, last_page }); by-id preload uses /playlist/{id} (Pro endpoint).
export function playlistSearchConfig(restUrl) {
    const base = trimSlash(restUrl);
    return {
        singular: 'Playlist',
        buildPageUrl({ q = '', page = 1, pageSize = PICKER_PAGE_SIZE } = {}) {
            return `${base}/playlist/?query=${encodeURIComponent(q)}&per_page=${pageSize}&page=${Math.max(1, page)}&orderby=ID&order=DESC`;
        },
        buildByIdUrl(id) {
            return `${base}/playlist/${encodeURIComponent(id)}`;
        },
        parse(json) {
            const items = (json && Array.isArray(json.data)) ? json.data : (Array.isArray(json) ? json : []);
            const more = (json && json.current_page && json.last_page)
                ? json.current_page < json.last_page
                : false;
            return { items, hasMore: more };
        },
        parseById(json) {
            if (!json) return null;
            if (json.playlist && json.playlist.ID != null) return json.playlist;
            if (json.data && json.data.ID != null) return json.data;
            if (json.ID != null) return json;
            return null;
        },
    };
}
