/**
 * Register a no-op `core/editor` store when it's absent. BlockEditorProvider's internal
 * KeyboardShortcutsRegister calls `select('core/editor').isSavingPost()`; a page-builder
 * canvas has no post editor, so that throws and blanks the whole editor tree. The stub
 * satisfies it without side effects — nothing in the canvas needs the real store.
 */
export function ensureCoreEditorStore(wp) {
    if (!wp || !wp.data || !wp.data.registerStore) return;
    try {
        if (wp.data.select && wp.data.select('core/editor')) return;
    } catch (e) { /* not registered → register the stub below */ }

    const no = () => false;
    const nul = () => null;
    const obj = () => ({});
    const arr = () => [];

    try {
        wp.data.registerStore('core/editor', {
            reducer: (state = {}) => state,
            actions: {},
            selectors: {
                isSavingPost: no,
                isAutosavingPost: no,
                isSavingNonPostEntityChanges: no,
                isPostSavingLocked: no,
                isPostAutosavingLocked: no,
                isEditedPostDirty: no,
                isEditedPostNew: no,
                isEditedPostSaveable: no,
                isEditedPostAutosaveable: no,
                isEditedPostEmpty: no,
                isCurrentPostPublished: no,
                isPublishingPost: no,
                isCleanNewPost: no,
                didPostSaveRequestSucceed: no,
                didPostSaveRequestFail: no,
                hasChangedContent: no,
                getCurrentPost: obj,
                getCurrentPostId: nul,
                getCurrentPostType: () => '',
                getPostEdits: obj,
                getEditedPostAttribute: nul,
                getEditorSettings: obj,
                getEditorBlocks: arr,
                getEditedPostContent: () => '',
            },
        });
    } catch (e) { /* raced with a real registration */ }
}
