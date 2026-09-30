const { __ } = wp.i18n;
const { FormTokenField } = wp.components;

import { formTokenFieldHowToProps } from '../formTokenFieldHowTo.js';

const TagInput = ({
    value = [],
    availableTags = [],
    onChange = () => {},
    label = __('Tags', 'fluent-player'),
    isLoading = false
}) => {
    const currentTags = Array.isArray(value) ? value : [];
    const suggestions = (availableTags || []).filter((tag) => !currentTags.includes(tag));

    return (
        <div className="fp-form-token-field components-base-control">
            <div className="fp-form-token-field__field components-base-control__field">
                <label className="fp-form-token-field__label components-base-control__label">
                    {label}
                </label>
                <FormTokenField
                    __experimentalAutoSelectFirstMatch
                    __experimentalExpandOnFocus
                    {...formTokenFieldHowToProps()}
                    disabled={isLoading}
                    value={currentTags}
                    suggestions={suggestions}
                    placeholder={isLoading ? __('Loading tags…', 'fluent-player') : __('Add a tag...', 'fluent-player')}
                    onChange={(tokens) => {
                        const sanitized = tokens.map((t) => t.trim()).filter(Boolean);
                        onChange(sanitized);
                    }}
                />
            </div>
        </div>
    );
};

export default TagInput;
