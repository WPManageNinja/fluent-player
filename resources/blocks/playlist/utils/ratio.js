export const getDefaultAspectRatio = () => {
    return window.fluentPlayerBlockVars?.defaultSettings?.defaultAspectRatio || 'original';
};

export const resolveAspectRatioValue = (value) => {
    const candidate = !value || value === 'default' ? getDefaultAspectRatio() : value;
    if (!candidate || candidate === 'original') return null;
    return candidate;
};

export const normalizeAspectRatio = (value) => {
    if (!value) return '';
    return value.includes('/') ? value : value.replace(':', '/');
};

export const normalizeRatioForSelect = (value) => {
    if (!value) return 'default';
    if (value === 'default' || value === 'original') return value;
    return value.includes('/') ? value.replace('/', ':') : value;
};

export const toCssAspectRatio = (value) => {
    const normalized = normalizeAspectRatio(value);
    return normalized ? normalized.replace('/', ' / ') : '';
};

export const toPaddingBottom = (value) => {
    const normalized = normalizeAspectRatio(value);
    if (!normalized) return '';
    const parts = normalized.split('/');
    if (parts.length !== 2) return '';
    const width = parseFloat(parts[0]);
    const height = parseFloat(parts[1]);
    if (!width || !height) return '';
    return `${(height / width) * 100}%`;
};
