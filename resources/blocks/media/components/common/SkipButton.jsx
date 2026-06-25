/**
 * Skip Button Component
 * Reusable skip button for layer overlays
 */
const SkipButton = ({ 
    text = 'Skip', 
    onClick, 
    className = '', 
    style = {} 
}) => {
    return (
        <button 
            className={`fluent-player-skip-button ${className}`}
            onClick={onClick}
            style={style}
        >
            {text} →
        </button>
    );
};

export default SkipButton;