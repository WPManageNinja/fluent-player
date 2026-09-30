/**
 * Compute the branding CSS custom properties for a media's settings — the same vars the
 * server prints in the per-media <style> (--media-brand, --fp-control-bar-bg, --media-play-*).
 * Shared so the runtime can apply them LIVE (inline, beating the server stylesheet) for an
 * immediate preview when the page-builder settings panel changes a colour.
 *
 * Only keys with a value are returned, so applying the map never blanks a var that isn't set.
 *
 * @param {object|null} settings          the media's settings
 * @param {object}      [defaultSettings] global defaults (used when custom branding is off)
 * @returns {Object<string,string>}
 */
// Brand fallback + colour validation mirror Helper::DEFAULT_BRAND_COLOR / safeCssColor so
// the live preview matches the server render — no colour flip when the save lands.
const DEFAULT_BRAND_COLOR = '#DD1F13';

const COLOR_PATTERNS = [
    /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
    /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/i,
    /^hsla?\(\s*\d{1,3}(?:\.\d+)?\s*,\s*\d{1,3}(?:\.\d+)?%\s*,\s*\d{1,3}(?:\.\d+)?%\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/i,
    /^var\(\s*--[a-z0-9-]+\s*\)$/i,
];

// Return the value only if it's a safe CSS colour (hex / rgb(a) / hsl(a) / fallback-free
// var() / bare keyword), else '' — mirrors Helper::safeCssColor.
export function safeCssColor(value) {
    if (typeof value !== 'string') return '';
    const colour = value.trim();
    if (!colour) return '';
    if (COLOR_PATTERNS.some((re) => re.test(colour))) return colour;
    if (/^[a-z]+$/i.test(colour)) return colour;
    return '';
}

export function computeBrandingVars(settings, defaultSettings = {}) {
    if (!settings) return {};

    const useCustom = !!settings.useCustomBranding;
    const pick = (customKey, defaultKey, customFallback = '') => {
        const raw = useCustom
            ? (settings[customKey] || customFallback)
            : (defaultSettings[defaultKey] || '');
        return safeCssColor(raw);
    };

    const brand = pick('brandingColor', 'brandColor', DEFAULT_BRAND_COLOR);
    const controlBar = pick('controlBarColor', 'controlBarColor');
    const playColor = pick('playButtonColor', 'playButtonColor');
    const playBg = pick('playButtonBgColor', 'playButtonBgColor');

    const vars = {};
    if (brand) {
        vars['--media-brand'] = brand;
        vars['--media-focus-ring'] =
            `0 0 0 2px color-mix(in srgb, ${brand} 72%, white), 0 0 0 4px color-mix(in srgb, ${brand} 32%, transparent)`;
    }
    if (controlBar) vars['--fp-control-bar-bg'] = controlBar;
    if (playColor) vars['--media-play-color'] = playColor;
    if (playBg) vars['--media-play-bg'] = playBg;

    return vars;
}
