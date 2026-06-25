const { __ } = wp.i18n;
const { TextControl, SelectControl } = wp.components;
import TagInput from '../../../common/components/TagInput.jsx';
import useTags from '../../../hooks/useTags.js';

const TagQuerySettings = ({
    tags = [],
    query = {},
    onTagsChange = () => {},
    onQueryChange = () => {}
}) => {
    const { availableTags } = useTags({ enabled: true });

    return (
        <>
            <TagInput
                value={tags}
                availableTags={availableTags}
                onChange={onTagsChange}
            />
            <div className="fluent-player-form-row">
                <TextControl
                    label={__('Items Limit', 'fluent-player')}
                    type="number"
                    min={1}
                    max={100}
                    value={query.limit ?? 20}
                    onChange={(value) => onQueryChange('limit', parseInt(value || 20, 10) || 20)}
                />
            </div>
            <div className="fluent-player-form-row">
                <SelectControl
                    label={__('Order By', 'fluent-player')}
                    value={query.orderby || 'date'}
                    options={[
                        { label: __('Date', 'fluent-player'), value: 'date' },
                        { label: __('Title', 'fluent-player'), value: 'title' },
                        { label: __('Modified', 'fluent-player'), value: 'modified' },
                        { label: __('Random', 'fluent-player'), value: 'rand' }
                    ]}
                    onChange={(value) => onQueryChange('orderby', value)}
                />
            </div>
            <div className="fluent-player-form-row">
                <SelectControl
                    label={__('Order', 'fluent-player')}
                    value={query.order || 'DESC'}
                    options={[
                        { label: __('Descending', 'fluent-player'), value: 'DESC' },
                        { label: __('Ascending', 'fluent-player'), value: 'ASC' }
                    ]}
                    onChange={(value) => onQueryChange('order', value)}
                />
            </div>
        </>
    );
};

export default TagQuerySettings;
