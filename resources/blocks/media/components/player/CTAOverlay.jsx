const CTAOverlay = ({ settings, visible = true }) => {
    const shouldShow = visible &&
                      settings &&
                      settings.enabled;

    if (!shouldShow) return null;

    const handleSkip = (e) => {
        e.preventDefault();
    };

    const overlayStyle = {
        '--cta-bg-color': settings.bg_color || '#0E121B',
        '--cta-text-color': settings.text_color || '#ffffff'
    };

    return (
        <div className="cta-overlay" style={overlayStyle}>
            <div className="cta-container">
                {(settings.completion_type === 'skip_only' || settings.allow_skip !== false) && (
                    <button
                        className="cta-skip"
                        onClick={handleSkip}
                    >
                        <span className="cta-skip-text">Skip <span className="cta-skip-icon">→</span></span>
                    </button>
                )}

                {settings.content && (
                    <div
                        className="cta-text-content"
                        dangerouslySetInnerHTML={{ __html: settings.content }}
                    />
                )}
            </div>
        </div>
    );
};

export default CTAOverlay;
