// Playlist-specific Divi VB helpers — thin wrappers over the shared module helpers so the
// media and playlist modules can't drift. See ../../media/divi/moduleHelpers.js for the logic.

import {
    coerceScalarId,
    readModuleId,
    pickModuleId,
    resolveModuleIdFromStore,
    buildModulePreviewUrl,
    fetchModulePreviewHtml,
    shouldRegisterImmediately,
} from '../../media/divi/moduleHelpers.js';

export { coerceScalarId, shouldRegisterImmediately };

export const readPlaylistId = readModuleId;
export const pickModulePlaylistId = pickModuleId;
export const resolveModulePlaylistIdFromStore = resolveModuleIdFromStore;

function readContentAttr(attrs, key) {
    return attrs && attrs.content && attrs.content[key] && attrs.content[key].desktop
        ? attrs.content[key].desktop.value
        : undefined;
}

// Resolve the tag-vs-playlist source the canvas should render, from the module attrs.
// Tag mode carries a comma-separated slug list + a query object (stored as JSON string).
export function readPlaylistSource(attrs) {
    const sourceType = String(readContentAttr(attrs, 'sourceType') || 'playlist');
    if (sourceType !== 'tags') {
        return { sourceType: 'playlist' };
    }
    const tags = String(readContentAttr(attrs, 'tags') || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    let query = readContentAttr(attrs, 'query') || {};
    if (typeof query === 'string') {
        try { query = JSON.parse(query); } catch (e) { query = {}; }
    }
    return { sourceType: 'tags', tags, query: (query && typeof query === 'object') ? query : {} };
}

export function buildPlaylistPreviewUrl(root, playlistId) {
    return buildModulePreviewUrl(root, playlistId, 'media/playlist-page-builder-preview', 'playlist_id');
}

export function fetchPlaylistPreviewHtml(fetchImpl, settings, playlistId) {
    return fetchModulePreviewHtml(fetchImpl, settings, playlistId, 'media/playlist-page-builder-preview', 'playlist_id', 'Playlist preview request failed');
}

// The REST body the playlist settings PUT sends — the same shape the block uses
// (PUT /playlist/{id} with { id, settings }). Pure so the serializing saver can be tested.
export function buildPlaylistSavePayload(playlistId, data) {
    return { id: playlistId, settings: JSON.stringify((data && data.settings) || {}) };
}
