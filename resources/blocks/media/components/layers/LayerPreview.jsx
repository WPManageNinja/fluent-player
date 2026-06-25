import HotspotPreview from './HotspotPreview.jsx';
import CTAPreview from './CTAPreview.jsx';
import EmailPreview from './EmailPreview.jsx';
import FormPreview from './FormPreview.jsx';
import AdPreview from './AdPreview.jsx';
import ShortcodePreview from './ShortcodePreview.jsx';

/**
 * Layer Preview Component
 * Shows real-time preview of layer overlays on the video player
 */
const LayerPreview = ({ layer, requestPath }) => {
    if (!layer || !layer.type) return null;

    // Don't show form layer template at all unless a form is selected
    if (layer.type === 'form' && !layer.form_id) {
        return null;
    }

    const renderLayerContent = () => {
        switch (layer.type) {
            case 'cta':
                if (layer.cta_type === 'email') {
                    return <EmailPreview layer={layer} />;
                }
                return <CTAPreview layer={layer} />;
            case 'form':
                return <FormPreview layer={layer} requestPath={requestPath} />;
            case 'hotspot':
                return <HotspotPreview layer={layer} />;
            case 'ad':
                return <AdPreview layer={layer} />;
            case 'shortcode':
                return <ShortcodePreview layer={layer} requestPath={requestPath} />;
            default:
                return <CTAPreview layer={layer} />;
        }
    };

    const getPositionStyles = () => {
        return {
            position: 'absolute',
            zIndex: 10,
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
        };
    };

    return (
        <div 
            className={`fluent-player-layer-template layer-active layer-${layer.type}`}
            style={getPositionStyles()}
        >
            {renderLayerContent()}
        </div>
    );
};

export default LayerPreview;