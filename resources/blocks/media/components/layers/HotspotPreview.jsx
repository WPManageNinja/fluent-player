const {useState, useEffect, useRef} = wp.element;
import IconRenderer from '../common/IconRenderer.jsx';

const isValidColor = (v) => {
    if (v === undefined || v === null || v === '') return false;
    const s = String(v).trim();
    return s.length > 1 && /^#[0-9A-Fa-f]{3,8}$/.test(s);
};

/**
 * Hotspot Preview Component
 * Shows hotspot markers on the video player
 */
const HotspotPreview = ({ layer }) => {
    const containerRef = useRef(null);

    if (!layer || !layer.hotspots) return null;
    return (
        <div 
            ref={containerRef}
            className="fluent-player-hotspot-content"
            style={{ backgroundColor: layer.bg_color || 'transparent' }}
        >
            {layer.hotspots.map((hotspot, index) => (
                <div
                    key={hotspot.id || index}
                    className={`fluent-player-hotspot-marker ${hotspot.type === 'icon' ? 'icon-type' : ''}`}
                    style={{
                        left: `${hotspot.position_x}%`,
                        top: `${hotspot.position_y}%`,
                        width: `${hotspot.size}px`,
                        height: `${hotspot.size}px`,
                        backgroundColor: isValidColor(hotspot.background_color) ? hotspot.background_color : 'transparent'
                    }}
                >
                    {hotspot.type === 'icon' && hotspot.icon ? (
                        <IconRenderer 
                            iconName={hotspot.icon}
                            className="hotspot-icon"
                        />
                    ) : (
                        <div className="fluent-player-hotspot-dot" />
                    )}
                    
                    {hotspot.tooltip_text && (
                        <div className="fluent-player-hotspot-tooltip">
                            {hotspot.tooltip_text}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default HotspotPreview;