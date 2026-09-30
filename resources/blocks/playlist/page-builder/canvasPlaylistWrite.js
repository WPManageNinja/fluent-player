/**
 * Pure builders that map a picker selection to each page builder's stored attributes.
 * Kept wp-free so the attribute shapes are unit-testable; the DOM writeback (Divi store /
 * Elementor $e.run) lives in the builder bridges and calls these.
 *
 * source shape: { sourceType: 'playlist'|'tags', playlistId, tags: string[], query }
 */

const DEFAULT_QUERY = { limit: 20, orderby: 'date', order: 'DESC' };

function normalizeQuery(query = {}) {
    // Match the server (AbstractPageBuilder::buildPlaylistTagAttrs): a MISSING limit
    // defaults to 20, but a provided 0 floors to 1 — so don't conflate 0 with unset.
    const rawLimit = parseInt(query.limit, 10);
    const limit = Math.max(1, Math.min(100, Number.isNaN(rawLimit) ? DEFAULT_QUERY.limit : rawLimit));
    const orderby = String(query.orderby || DEFAULT_QUERY.orderby);
    const order = String(query.order || DEFAULT_QUERY.order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    return { limit, orderby, order };
}

function normalizeTags(tags) {
    return (Array.isArray(tags) ? tags : [])
        .map((t) => String(t).trim())
        .filter(Boolean);
}

/**
 * Elementor widget settings for `$e.run('document/elements/settings', { settings })`.
 * @returns {Object}
 */
export function elementorPlaylistSettings(source = {}) {
    if (source.sourceType === 'tags') {
        const q = normalizeQuery(source.query);
        return {
            fp_source_type: 'tags',
            fp_tags: normalizeTags(source.tags).join(','),
            fp_query_limit: q.limit,
            fp_query_orderby: q.orderby,
            fp_query_order: q.order,
            playlist_id: '',
        };
    }
    return {
        fp_source_type: 'playlist',
        fp_tags: '',
        playlist_id: String(source.playlistId || ''),
    };
}

/**
 * Divi editModuleAttribute payloads (attrName + desktop value). Divi stores each attr
 * separately, so this returns the list to dispatch.
 * @returns {Array<{attrName: string, value: string}>}
 */
export function diviPlaylistAttrs(source = {}) {
    if (source.sourceType === 'tags') {
        const q = normalizeQuery(source.query);
        return [
            { attrName: 'content.sourceType', value: 'tags' },
            { attrName: 'content.tags', value: normalizeTags(source.tags).join(',') },
            { attrName: 'content.query', value: JSON.stringify(q) },
        ];
    }
    return [
        { attrName: 'content.sourceType', value: 'playlist' },
        { attrName: 'content.innerContent', value: String(source.playlistId || '') },
        { attrName: 'content.tags', value: '' },
    ];
}
