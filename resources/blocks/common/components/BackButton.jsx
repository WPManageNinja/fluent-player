const { Button } = wp.components;
const { createElement: el } = wp.element;

/**
 * Left-chevron + "Back" control that replaces the editor's close/site-icon.
 *
 * Rendered as a real link (Button with href → <a>) so the editor's native
 * unsaved-changes beforeunload prompt fires on navigation, and so wp.components
 * supplies accessible focus styling. Destination/label come from the resolved
 * localized config (see ../editorBackButton.js).
 */
const ChevronLeftIcon = el(
    'svg',
    { width: 20, height: 20, viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    el('path', {
        d: 'M15 18l-6-6 6-6',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
    })
);

const BackButton = ({ url, label, ariaLabel }) => {
    return (
        <Button
            className="fp-editor-back-button"
            href={url}
            variant="tertiary"
            aria-label={ariaLabel}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                height: '100%',
                padding: '0 8px',
                color: 'inherit',
                textDecoration: 'none',
            }}
        >
            <span className="fp-editor-back-button__icon" aria-hidden="true" style={{ display: 'inline-flex' }}>
                {ChevronLeftIcon}
            </span>
            <span className="fp-editor-back-button__label">{label}</span>
        </Button>
    );
};

export default BackButton;
