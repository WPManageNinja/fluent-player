/**
 * LogoOverlay component for Fluent Player
 */
const { useState, useEffect } = wp.element;

const LogoOverlay = ({ mediaData, blockVars }) => {
    // Check if we have any logo data to display
    const useCustomBranding = mediaData?.useCustomBranding;

    // State for logo settings
    const [logoUrl, setLogoUrl] = useState('');
    const [logoLink, setLogoLink] = useState('');
    const [logoPosition, setLogoPosition] = useState('position-top-right');
    const [logoWidth, setLogoWidth] = useState(24);

    // Update logo settings when mediaData or blockVars change
    useEffect(() => {
        const defaultSettings = blockVars?.defaultSettings || {};

        if (useCustomBranding) {
            // Use custom branding from mediaData
            setLogoUrl(mediaData?.logo || '');
            setLogoLink(mediaData?.logoLink || '');
            setLogoPosition(mediaData?.logoPosition || 'position-top-right');
            setLogoWidth(mediaData?.logoWidth ?? 24);
        } else {
            // Use default settings from blockVars
            setLogoUrl(defaultSettings.logoUrl || '');
            setLogoLink(defaultSettings.logoLink || '');
            setLogoPosition(defaultSettings.logoPosition || 'position-top-right');
            setLogoWidth(defaultSettings.logoWidth ?? 24);
        }
    }, [useCustomBranding, mediaData?.logo, mediaData?.logoLink, mediaData?.logoWidth, mediaData?.logoPosition, blockVars]);

    // Ensure position has the 'position-' prefix
    useEffect(() => {
        if (logoPosition && !logoPosition.startsWith('position-')) {
            setLogoPosition('position-' + logoPosition);
        }
    }, [logoPosition]);

    // If no logo URL, don't render anything
    if (!logoUrl) return null;

    return (
        <div
            className={`fp-media-custom-overlay fp-media-logo-overlay ${logoPosition} active`}
            style={{ opacity: 1, display: 'block' }}
        >
            <div
                className="fp-media-custom-overlay-block fp-media-logo-block"
                style={{ backgroundColor: 'transparent' }}
            >
                <a
                    className="fp-media-custom-overlay-link fp-media-logo-link"
                    href={logoLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                        if (!logoLink) e.preventDefault();
                    }}
                >
                    <img
                        src={logoUrl}
                        alt="Player Logo"
                        className="fp-media-logo-image"
                        style={{ maxWidth: `${logoWidth}px` }}
                    />
                </a>
            </div>
        </div>
    );
};

export default LogoOverlay;
