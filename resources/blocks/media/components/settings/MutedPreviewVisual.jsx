const {__} = wp.i18n;
import './MutedPreviewStyles.scss';

/**
 * Click-catcher over the config modal's live preview — the editor mirror of the
 * server-rendered `.fp-muted-preview-overlay`.
 *
 * @param {Object}   props
 * @param {boolean}  props.showIcon Render the play icon (false = bare surface).
 * @param {Function} props.onClick  Convert handler.
 */
const MutedPreviewVisual = ({showIcon = true, onClick}) => {
    return (
        <div
            className={`fp-muted-preview-visual${onClick ? ' is-interactive' : ''}${!showIcon ? ' is-bare' : ''}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            aria-label={onClick ? __('Play with sound', 'fluent-player') : undefined}
            onKeyDown={onClick ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick(e);
                }
            } : undefined}
        >
            {showIcon && (
                <span className="fp-muted-preview-visual-play" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 5.14v13.72c0 .8.87 1.3 1.56.88l11-6.86a1.04 1.04 0 0 0 0-1.76l-11-6.86A1.04 1.04 0 0 0 8 5.14Z" fill="currentColor"/>
                    </svg>
                </span>
            )}
        </div>
    );
};

export default MutedPreviewVisual;
