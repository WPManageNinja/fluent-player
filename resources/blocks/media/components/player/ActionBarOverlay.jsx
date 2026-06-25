const {useState, useEffect} = wp.element;

const ActionBarOverlay = ({settings}) => {
    const [subscriberCount, setSubscriberCount] = useState(settings?.subscriber_count || '');
    const [loading, setLoading] = useState(false);

    const showYoutubeButton = settings?.button_type === 'youtube' && settings?.youtube_channel;

    useEffect(() => {
        setSubscriberCount(settings?.subscriber_count || '');
    }, [settings?.youtube_channel, settings?.button_count, settings?.subscriber_count]);

    const handleClick = (e) => {
        e.preventDefault();
    };

    if (!settings?.enabled) return null;

    const positionClass = settings?.position || 'bottom';
    const actionBarClass = `action-bar-overlay action-bar-position-${positionClass} fluent-player-action-bar ${positionClass}`;

    return (
        <div
            className={actionBarClass}
            style={{
                backgroundColor: settings?.background_color || 'rgba(0,0,0,0.8)',
                color: settings?.text_color || '#ffffff',
                '--background-color': settings?.background_color || 'rgba(0,0,0,0.8)',
                '--button-color': settings?.button_color || '#4e9cf6',
                '--button-text-color': settings?.button_text_color || '#ffffff',
                '--button-radius': `${settings?.button_radius || 4}px`
            }}
        >
            <div className="action-bar-content">
                <div style={{fontSize: `${settings?.text_size}px`}} className="action-bar-text">{settings?.text}</div>

                {showYoutubeButton && (
                    <div className="action-bar-button-container">
                        <button className="action-bar-youtube-button" onClick={handleClick}>
                        <span className="youtube-icon">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
                                    fill="currentColor"/>
                            </svg>
                        </span>
                            <span className="youtube-text">YouTube</span>
                            {settings.button_count && (
                                <span className="subscriber-count">
                                {loading ? '...' : subscriberCount}
                            </span>
                            )}
                        </button>
                    </div>
                )}

                {settings?.button_type === 'custom' && settings?.button_text && (
                    <button
                        className="action-bar-custom-button action-bar-button"
                        onClick={handleClick}
                    >
                        {settings.button_text}
                    </button>
                )}
            </div>
            {settings?.enabled && settings?.show_close && (
                <button
                    style={{
                        backgroundColor: settings?.close_button_color || '#4e9cf6',
                        color: settings?.close_button_text_color || '#ffffff'
                    }}
                    className="action-bar-close"
                    onClick={handleClick}
                >
                    <span className="action-bar-close-icon">
                        <svg width="20" height="20" viewBox="0 -2 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="3"></path>
                        </svg>
                    </span>
                </button>
            )}
        </div>
    );
};

export default ActionBarOverlay;