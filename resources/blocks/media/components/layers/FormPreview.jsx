const {useState, useEffect} = wp.element;
const {apiFetch} = wp;
import SkipButton from '../common/SkipButton.jsx';

/**
 * Form Preview Component
 * Shows form layer preview with server-rendered forms
 */
const FormPreview = ({ layer, requestPath }) => {
    const [formHTML, setFormHTML] = useState('');
    const [formLoading, setFormLoading] = useState(false);

    // Fetch form preview when form layer settings change
    useEffect(() => {
        if (!layer.form_type || !layer.form_id) {
            setFormHTML('');
            return;
        }
        fetchFormPreview();
    }, [layer.form_type, layer.form_id]);

    const fetchFormPreview = async () => {
        setFormLoading(true);
        try {
            const response = await apiFetch({
                path: `${requestPath}/layer/form-preview?type=${layer.form_type}&form_id=${layer.form_id}`
            });
            setFormHTML(response.html || '');
        } catch (error) {
            setFormHTML('<div class="form-preview-error"><p>Failed to load form preview</p></div>');
        } finally {
            setFormLoading(false);
        }
    };

    const position = (layer.position && String(layer.position).replace(/^position-/, '')) || 'center';
    const positionClass = position === 'center' ? 'position-center' : `position-${position}`;

    return (
        <div
            className={`fluent-player-layer-form-content ${positionClass}`}
            style={layer.form_id ? {
                ...(layer.bg_color ? { backgroundColor: layer.bg_color } : {}),
                ...(layer.text_color ? { color: layer.text_color } : {}),
            } : undefined}
        >
            {layer.title && (
                <h3 className="fluent-player-layer-form-title" style={layer.text_color ? { color: layer.text_color } : undefined}>
                    {layer.title}
                </h3>
            )}
            
            <div
                className="fluent-player-layer-form-container"
                style={layer.form_id ? {
                    width: `${layer.width || 90}%`,
                    height: `${layer.height || 90}%`,
                    maxWidth: `${layer.width || 90}%`,
                    maxHeight: `${layer.height || 90}%`,
                } : undefined}
            >
                {formLoading ? (
                    <div className="form-loading">
                        <p>Loading form preview...</p>
                    </div>
                ) : formHTML ? (
                    <div 
                        className="server-rendered-form"
                        dangerouslySetInnerHTML={{ __html: formHTML }}
                    />
                ) : null}
            </div>

            {layer.allow_skip && <SkipButton />}
        </div>
    );
};

export default FormPreview;