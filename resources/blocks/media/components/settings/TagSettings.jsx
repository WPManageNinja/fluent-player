const { __ } = wp.i18n;
const { useState } = wp.element;
import useTags from '../../../hooks/useTags.js';
import TagInput from '../../../common/components/TagInput.jsx';
import { TagIconSVG, LockIconSVG } from '../common/Icons.jsx';
import ProModal from '../common/ProModal.jsx';

const TagSettings = ({ mediaData, setMediaData }) => {
    const { availableTags: allTags } = useTags({ enabled: !!window.fluentPlayerBlockVars?.hasPro });
    const [isProModalOpen, setIsProModalOpen] = useState(false);

    if (!window.fluentPlayerBlockVars?.hasPro) {
        return (
            <div className="components-base-control">
                <div
                    className="layer-card"
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                    aria-label={__('Tags — a Pro feature. Upgrade to enable.', 'fluent-player')}
                    onClick={() => setIsProModalOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setIsProModalOpen(true);
                        }
                    }}
                >
                    <div className="layer-info">
                        <div className="layer-title-row">
                            <div className="layer-type-info">
                                <span className="layer-icon"><TagIconSVG /></span>
                                <span className="layer-title">{__('Tags', 'fluent-player')}</span>
                            </div>
                            <LockIconSVG size={14} />
                        </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--fp-text-sub-600, #525866)' }}>
                        {__('Organize and filter your media library with tags.', 'fluent-player')}
                    </p>
                </div>
                {isProModalOpen && (
                    <ProModal
                        onClose={() => setIsProModalOpen(false)}
                        feature={__('Tags', 'fluent-player')}
                    />
                )}
            </div>
        );
    }

    const currentTags = mediaData.tags || [];

    return (
        <TagInput
            label={__('Tags', 'fluent-player')}
            value={currentTags}
            availableTags={allTags}
            onChange={(sanitized) => setMediaData({ ...mediaData, tags: sanitized })}
        />
    );
};

export default TagSettings;
