// Server-side, paged search for the block-editor MediaSelectDropdown. apiFetch is injected so
// these stay unit-testable.

export const SEARCH_MIN_CHARS = 3;
export const SEARCH_PAGE_SIZE = 30;

// Fetch on an empty query (recent list) or once >= minChars — never for a 1-2 char fragment.
export function shouldServerSearch(query, minChars = SEARCH_MIN_CHARS) {
    const q = String(query == null ? '' : query).trim();
    return q === '' || q.length >= minChars;
}

// Append a page, de-duplicated by value so "Load more" can't add an item twice.
export function mergeItemsById(prev, next) {
    const seen = new Set((prev || []).map((i) => String(i.value)));
    const merged = [...(prev || [])];
    (next || []).forEach((i) => {
        const key = String(i.value);
        if (!seen.has(key)) { seen.add(key); merged.push(i); }
    });
    return merged;
}

// Translatable when wp.i18n is present (browser); plain fallback under unit tests. The literal
// __() calls stay intact so the i18n scanner still extracts the strings.
function i18n() {
    return (typeof wp !== 'undefined' && wp.i18n && wp.i18n.sprintf) ? wp.i18n : null;
}

export function mapMediaRow(row) {
    const id = row && (row.ID != null ? row.ID : row.id);
    const t = i18n();
    return {
        value: id,
        title: (row && row.post_title) ? row.post_title
            : (t ? t.sprintf(t.__('Media #%d', 'fluent-player'), id) : `Media #${id}`),
        status: (row && row.post_status) || '',
    };
}

export function mapPlaylistRow(row) {
    const id = row && (row.ID != null ? row.ID : row.id);
    const t = i18n();
    return {
        value: id,
        title: (row && row.post_title) ? row.post_title
            : (t ? t.sprintf(t.__('Playlist #%d', 'fluent-player'), id) : `Playlist #${id}`),
        posterSrc: (row && row.poster_src) || '',
        status: (row && row.post_status) || '',
    };
}

// Bounded page loaders → { items, hasMore }. Media: flat array + offset paging; playlist:
// WPFluent paginator + page paging.
export function mediaLoadPage(apiFetch, { query = '', page = 1, pageSize = SEARCH_PAGE_SIZE } = {}) {
    const offset = (Math.max(1, page) - 1) * pageSize;
    return apiFetch({ path: `/fluent-player/v2/media/search?q=${encodeURIComponent(query)}&limit=${pageSize}&offset=${offset}` })
        .then((res) => {
            const arr = Array.isArray(res) ? res : [];
            return { items: arr.map(mapMediaRow), hasMore: arr.length >= pageSize };
        });
}

export function playlistLoadPage(apiFetch, { query = '', page = 1, pageSize = SEARCH_PAGE_SIZE } = {}) {
    return apiFetch({ path: `/fluent-player/v2/playlist/?query=${encodeURIComponent(query)}&per_page=${pageSize}&page=${Math.max(1, page)}&orderby=ID&order=DESC` })
        .then((res) => {
            const arr = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
            const hasMore = !!(res && res.current_page && res.last_page && res.current_page < res.last_page);
            return { items: arr.map(mapPlaylistRow), hasMore };
        });
}
