/**
 * CustomOverlay component for Fluent Player
 */
const { useState, useEffect } = wp.element;

const CustomOverlay = ({ overlaySettings, currentTime = 0 }) => {
    const [visibleOverlays, setVisibleOverlays] = useState([]);

    useEffect(() => {
        if (!overlaySettings || !overlaySettings.length) {
            setVisibleOverlays([]);
            return;
        }
        const visible = overlaySettings.filter(overlay =>
            currentTime >= (overlay.startTime * 60) &&
            currentTime <= (overlay.endTime * 60)
        );
        setVisibleOverlays(visible);
    }, [overlaySettings, currentTime]);

    if (!overlaySettings || !overlaySettings.length) return null;
    if (!visibleOverlays.length) return null;

    return (
        <>
            {visibleOverlays.map((overlay, index) => (
                <div 
                    key={index} 
                    className={`fp-media-custom-overlay ${overlay.position} active`}
                >
                    <div 
                        className="fp-media-custom-overlay-block"
                        style={{
                            ...(overlay.backgroundColor ? { backgroundColor: overlay.backgroundColor } : {}),
                            ...(overlay.textColor ? { color: overlay.textColor } : {})
                        }}
                    >
                        {(overlay.link && String(overlay.link).trim() !== '') ? (
                            <a 
                                className="fp-media-custom-overlay-link"
                                href={overlay.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                            >
                                {overlay.text}
                            </a>
                        ) : (
                            <span className="fp-media-custom-overlay-text">{overlay.text}</span>
                        )}
                    </div>
                </div>
            ))}
        </>
    );
};

export default CustomOverlay;