import SkipButton from '../common/SkipButton.jsx';

/**
 * Return the same color at 50% opacity (for ad bar track).
 */
function adBarColorAt50Opacity(color) {
    if (!color || typeof color !== 'string') return undefined;
    const hex = color.trim().match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/);
    if (hex) {
        let r, g, b;
        const raw = hex[1];
        if (raw.length === 3) {
            r = parseInt(raw[0] + raw[0], 16);
            g = parseInt(raw[1] + raw[1], 16);
            b = parseInt(raw[2] + raw[2], 16);
        } else {
            r = parseInt(raw.slice(0, 2), 16);
            g = parseInt(raw.slice(2, 4), 16);
            b = parseInt(raw.slice(4, 6), 16);
        }
        return `rgba(${r},${g},${b},0.5)`;
    }
    const rgba = color.trim().match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/);
    if (rgba) {
        return `rgba(${rgba[1]},${rgba[2]},${rgba[3]},0.5)`;
    }
    return undefined;
}

/**
 * Ad Preview Component
 * Shows Ad layer preview
 */
const AdPreview = ({ layer }) => {
    if (!layer) return null;

    const mediaUrl = layer.media_url || layer.video_url;
    const mediaType = layer.media_type || 'video';
    const fillBarColor = layer.fill_bar_color || undefined;
    const trackBarColor = fillBarColor ? adBarColorAt50Opacity(fillBarColor) : undefined;

    return (
        <div className="fluent-player-layer-ad-content" data-media-type={mediaType}>
            <div>
                {mediaType === 'image' ? (
                    <img src={mediaUrl} alt="" />
                ) : (
                    <video src={mediaUrl} />
                )}
                <div
                    className="fluent-player-layer-ad-time-remaining-bar"
                    style={trackBarColor ? { backgroundColor: trackBarColor } : undefined}
                >
                    <div
                        className="fluent-player-layer-ad-time-remaining-bar-fill"
                        style={fillBarColor ? { backgroundColor: fillBarColor, width: '70%' } : undefined}
                    />
                </div>
            </div>
            {layer.allow_skip && <SkipButton />}
        </div>
    );
};

export default AdPreview;