/**
 * MediaUploadCheck that works inside a page-builder window. WP's version hides its children
 * unless canUser('create','media') is truthy, but that selector is unreliable in a builder,
 * so the upload UI never appears. In a builder (window.fluentPlayerInPageBuilder) render the
 * children directly — the media REST endpoint still enforces the real capability server-side,
 * so this only affects whether the button SHOWS. Elsewhere, delegate to the real component.
 */
const { MediaUploadCheck } = wp.blockEditor || wp.editor || {};

export default function BuilderMediaUploadCheck({ children, ...props }) {
    if (typeof window !== 'undefined' && window.fluentPlayerInPageBuilder) {
        return children || null;
    }
    if (MediaUploadCheck) {
        return <MediaUploadCheck {...props}>{children}</MediaUploadCheck>;
    }
    return children || null;
}
