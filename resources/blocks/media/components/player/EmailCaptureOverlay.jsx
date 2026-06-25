const EmailCaptureOverlay = ({ settings, visible = true }) => {
    const shouldShow = visible && 
                      settings && 
                      settings.enabled;

    if (!shouldShow) return null;

    const borderRadius = settings.border_radius || 0;

    const containerStyles = {
        borderRadius: `${borderRadius}px`
    };

    const inputStyles = {
        borderRadius: window.innerWidth >= 576 ? 
            `${borderRadius}px 0 0 ${borderRadius}px` : 
            `${borderRadius}px`
    };

    const buttonStyles = {
        backgroundColor: settings.button_bg_color || '#4e9cf6',
        color: settings.button_color || '#ffffff',
        borderRadius: window.innerWidth >= 576 ? 
            `0 ${borderRadius}px ${borderRadius}px 0` : 
            `${borderRadius}px`
    };

    const handleClick = (e) => {
        e.preventDefault();
    };

    const handleSkip = (e) => {
        e.preventDefault();
    };

    return (
        <div className="email-capture-overlay">
            <div className="email-capture-container" style={containerStyles}>
                <h2 className="email-capture-headline">{settings.headline || 'Sign up to continue watching'}</h2>

                <div className="email-capture-form">
                    <input
                        type="email"
                        placeholder={settings.placeholder || 'Email Address'}
                        className="email-capture-input"
                        style={inputStyles}
                    />
                    <button
                        className="email-capture-button"
                        style={buttonStyles}
                        onClick={handleClick}
                    >
                        {settings.button_text || 'Subscribe'}
                    </button>
                </div>

                <p className="email-capture-bottom-text">{settings.bottom_text || 'We respect your privacy. Unsubscribe at any time.'}</p>

                {settings.allow_skip !== false && (
                    <button
                        className="email-capture-skip"
                        onClick={handleSkip}
                    >
                        <span className="email-capture-skip-text">Skip <span className="email-capture-skip-icon">→</span></span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default EmailCaptureOverlay;