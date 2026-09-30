/**
 * Normalize a stored integration setting value to a real boolean.
 *
 * Checkbox/switch values round-trip through the REST layer as mixed types: a
 * boolean `true` on the way out, but often the strings 'true' / 'yes' / '1'
 * after sanitization on the way back. el-switch compares its model against the
 * boolean active-value, so a string like 'true' renders as OFF unless coerced.
 * Mirrors PHP's FILTER_VALIDATE_BOOLEAN truthy set.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function normalizeSettingBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
        return ['true', 'yes', '1', 'on'].includes(value.trim().toLowerCase());
    }
    return false;
}

export default normalizeSettingBoolean;
