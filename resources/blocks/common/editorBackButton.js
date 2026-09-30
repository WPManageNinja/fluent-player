/**
 * Editor "Back" button resolution.
 *
 * Replaces the block editor's top-left close/site-icon with a Back button that
 * returns to the Fluent Player admin app. The destination + labels are provided
 * by the localized `window.fluentPlayerToolbar` — each plugin localizes its own
 * full URL (free → admin.php?page=fluent-player#/, Pro → …#/playlists) so this
 * stays post-type-agnostic.
 *
 * Pure seam (plain .js, no JSX) so Vitest can import it directly; the DOM mount
 * + navigation are proven by dev/e2e/admin/editor-back-button.spec.js.
 *
 * @param {{backUrl?: string, backLabel?: string, backAriaLabel?: string}} [config]
 * @return {{url: string, label: string, ariaLabel: string}|null} null = do not render.
 */
export const resolveBackButton = (config) => {
    const url = config && typeof config.backUrl === 'string' ? config.backUrl : '';
    if (!url) {
        return null;
    }

    const label =
        typeof config.backLabel === 'string' && config.backLabel !== '' ? config.backLabel : 'Back';
    const ariaLabel =
        typeof config.backAriaLabel === 'string' && config.backAriaLabel !== ''
            ? config.backAriaLabel
            : label;

    return { url, label, ariaLabel };
};
