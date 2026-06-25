const { __ } = wp.i18n;
const { Button } = wp.components;
import TagInput from '../../common/components/TagInput.jsx';

const TagsPanel = ({
    tagsLoading = false,
    availableTags = [],
    tags = [],
    tagsError = '',
    onTagsChange = () => {},
    onRetry = () => {}
}) => {
    return (
        <div className="fluent-player-dynamic-tags-panel">
            {tagsLoading ? (
                <TagInput
                    value={tags}
                    availableTags={[]}
                    onChange={onTagsChange}
                    isLoading={true}
                />
            ) : (
                <>
                    <TagInput
                        value={tags}
                        availableTags={availableTags}
                        onChange={onTagsChange}
                    />
                    {tagsError ? (
                        <div className="fluent-player-dynamic-tags-empty">
                            <p>{tagsError}</p>
                            <Button
                                variant="secondary"
                                onClick={onRetry}
                            >
                                {__('Retry', 'fluent-player')}
                            </Button>
                        </div>
                    ) : availableTags.length === 0 ? (
                        <p className="fluent-player-dynamic-tags-empty">
                            {__('No tags found yet. You can still type tags manually.', 'fluent-player')}
                        </p>
                    ) : null}
                </>
            )}
        </div>
    );
};

export default TagsPanel;
