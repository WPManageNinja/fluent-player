/**
 * CustomOverlay component for Fluent Player.
 *
 * All overlays stay mounted; visibility is style-based. React cannot reliably
 * remove children inside the upgraded media-player custom element (Vidstack
 * re-slots its light DOM), so mount/unmount toggling leaves stale nodes.
 */
const CustomOverlay = ({ overlaySettings, currentTime = 0 }) => {
    if (!overlaySettings || !overlaySettings.length) return null;

    return (
        <>
            {overlaySettings.map((overlay, index) => {
                const start = overlay.displayTime || 0;
                const isVisible = currentTime >= start && currentTime <= start + (overlay.duration || 5);
                return (
                    <div
                        key={overlay.id || index}
                        className={`fp-media-custom-overlay ${overlay.position} active`}
                        style={isVisible ? undefined : { display: 'none' }}
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
                );
            })}
        </>
    );
};

export default CustomOverlay;
