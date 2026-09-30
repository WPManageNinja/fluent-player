/**
 * Make wp.blockEditor.MediaUpload + the WP media library work inside a page-builder window
 * (Elementor / Divi / Bricks). Called on the settings app's MOUNT (not import) so it runs
 * after the builder scripts have settled; idempotent.
 */
// Flags that we're in a builder window; BuilderMediaUploadCheck reads it to render the
// upload UI directly (the canUser gate is unreliable here). Set at import, before any render.
if (typeof window !== 'undefined') {
    window.fluentPlayerInPageBuilder = true;
}

export function ensureMediaUploadReady() {
    const wp = window.wp || {};

    // Register the MediaUpload Slot fill. wp.blockEditor.MediaUpload is only a Slot;
    // @wordpress/media-utils' fill via the `editor.MediaUpload` filter doesn't take in a
    // builder window, so fill it ourselves.
    const registerMediaUploadFill = () => {
        if (wp.hooks && wp.hooks.addFilter && wp.mediaUtils && wp.mediaUtils.MediaUpload) {
            wp.hooks.addFilter(
                'editor.MediaUpload',
                'fluent-player/page-builder-media-upload',
                () => wp.mediaUtils.MediaUpload
            );
        }
    };

    // canUser('create','media') stays undefined in a builder (its resolver is never kicked),
    // hiding the upload button — pre-resolve it so MediaUploadCheck re-renders.
    if (wp.data && typeof wp.data.resolveSelect === 'function') {
        try {
            wp.data.resolveSelect('core').canUser('create', 'media');
        } catch (e) { /* store not ready yet */ }
    }

    // WP's media library (media-views) needs Underscore's API (_.contains…), but Bricks
    // bundles Lodash as window._, wiping Underscore — so opening the media frame would throw.
    // Only ENABLE the upload path (register the fill) once Underscore is confirmed present:
    // enabling it beforehand lets a click open the frame against Lodash and crash.
    const und = window._;
    if (und && typeof und.contains === 'function') {
        registerMediaUploadFill();
    } else if (!window.__fpUnderscoreRestoring) {
        // Reload WP's Underscore (already on the page) to restore window._ (Bricks keeps its
        // own bundled Lodash ref), and register the fill only after it loads.
        window.__fpUnderscoreRestoring = true;
        const existing = document.querySelector('script[src*="underscore"]');
        const src = existing ? existing.src : '/wp-includes/js/underscore.min.js';
        const script = document.createElement('script');
        script.src = src;
        script.onload = registerMediaUploadFill;
        (document.head || document.documentElement).appendChild(script);
    }
    // else: a restore is already in flight; its onload registers the fill globally (the
    // `editor.MediaUpload` filter is process-wide, so once registered it applies everywhere).
}
