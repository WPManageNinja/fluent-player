import SkipButton from '../common/SkipButton.jsx';

const CTAPreview = ({ layer }) => {
    if (!layer) return null;

    return (
        <div
            className="fluent-player-layer-cta-text-content"
            style={{ backgroundColor: layer.bg_color || '' }}
        >
            <div className="cta-text-wrapper">
                {layer.content && (
                    <div
                        className="cta-text-content"
                        dangerouslySetInnerHTML={{ __html: layer.content }}
                    />
                )}
            </div>
            {(layer.allow_skip || layer.completion_type === 'skip_only') && <SkipButton />}
        </div>
    );
};

export default CTAPreview;
