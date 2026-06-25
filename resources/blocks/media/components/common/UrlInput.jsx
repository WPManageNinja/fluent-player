const { BaseControl } = wp.components;

const PREFIX = 'https://';

const UrlInput = ({ label, value, onChange, placeholder = 'www.example.com', help }) => {
    const displayValue = value && typeof value === 'string'
        ? value.replace(/^https?:\/\//i, '').trim()
        : '';

    const handleChange = (e) => {
        const inputVal = e.target.value.trim();
        onChange(inputVal ? PREFIX + inputVal : '');
    };

    return (
        <BaseControl label={label} help={help}>
            <div className="url-input-wrapper">
                <span className="url-input-prefix">{PREFIX}</span>
                <input
                    type="text"
                    className="url-input-input"
                    value={displayValue}
                    onChange={handleChange}
                    placeholder={placeholder}
                    autoComplete="url"
                />
            </div>
        </BaseControl>
    );
};

export default UrlInput;
