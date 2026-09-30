// Media-specific Divi VB helpers — thin wrappers over the shared module helpers so the
// media and playlist modules can't drift. See ./moduleHelpers.js for the logic.

import {
    coerceScalarId,
    readModuleId,
    pickModuleId,
    resolveModuleIdFromStore,
    buildModulePreviewUrl,
    fetchModulePreviewHtml,
    shouldRegisterImmediately,
} from './moduleHelpers.js';

export { coerceScalarId, shouldRegisterImmediately };

export const readMediaId = readModuleId;
export const pickModuleMediaId = pickModuleId;
export const resolveModuleMediaIdFromStore = resolveModuleIdFromStore;

export function buildPreviewUrl(root, mediaId) {
    return buildModulePreviewUrl(root, mediaId, 'media/page-builder-preview', 'media_id');
}

export function fetchPlayerPreviewHtml(fetchImpl, settings, mediaId) {
    return fetchModulePreviewHtml(fetchImpl, settings, mediaId, 'media/page-builder-preview', 'media_id', 'Preview request failed');
}
