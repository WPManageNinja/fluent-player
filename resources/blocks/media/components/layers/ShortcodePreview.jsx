const { useState, useEffect } = wp.element;
const { apiFetch } = wp;

import SkipButton from '../common/SkipButton.jsx';

/**
 * Shortcode Preview Component
 * Shows shortcode layer preview
 */
const ShortcodePreview = ({ layer, requestPath }) => {
    const [shortcodeContent, setShortcodeContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!layer) return null;

    // Fetch shortcode content when shortcode changes
    useEffect(() => {
        if (layer.shortcode && layer.shortcode.trim()) {
            setIsLoading(true);
            setError(null);
            
            const encodedShortcode = encodeURIComponent(layer.shortcode);
            
            apiFetch({
                path: `${requestPath}/layer/shortcode-preview?shortcode=${encodedShortcode}`,
                method: 'GET'
            })
            .then(response => {
                if (response.html) {
                    setShortcodeContent(response.html);
                } else {
                    setError(response.message || 'Failed to render shortcode');
                }
            })
            .catch(err => {
                setError('Error rendering shortcode: ' + err.message);
            })
            .finally(() => {
                setIsLoading(false);
            });
        } else {
            setShortcodeContent('');
        }
    }, [layer.shortcode]);

    return (
        <div 
            className="fluent-player-layer-shortcode-content"
            style={{
                ...(layer.bg_color ? { backgroundColor: layer.bg_color } : {})
            }}
        >
            <div 
                className="shortcode-layer-wrapper"
                style={{
                    width: `${layer.width || 80}%`,
                    maxWidth: `${layer.width || 80}%`
                }}
            >
                {layer.title && (
                    <h3 className="shortcode-layer-title">{layer.title}</h3>
                )}
                
                <div className="shortcode-content">
                    {isLoading && (
                        <div className="shortcode-loading">
                            <p><em>Rendering shortcode...</em></p>
                        </div>
                    )}
                    
                    {error && (
                        <div className="shortcode-error">
                            <p style={{color: '#ff6b6b'}}><strong>Error:</strong> {error}</p>
                            <p><em>Preview only - shortcode will work in actual player.</em></p>
                        </div>
                    )}
                    
                    {shortcodeContent && !isLoading && !error && (
                        <div 
                            className="shortcode-rendered-content"
                            dangerouslySetInnerHTML={{ __html: shortcodeContent }}
                        />
                    )}
                    
                    {!shortcodeContent && !isLoading && !error && layer.shortcode && (
                        <div className="shortcode-placeholder">
                            <p><strong>Shortcode:</strong> <code>{layer.shortcode}</code></p>
                            <p><em>Preview will show when shortcode is rendered</em></p>
                        </div>
                    )}
                </div>
            </div>
            <SkipButton />
        </div>
    );
};

export default ShortcodePreview;