export const DEFAULT_PLAY_BUTTON_BG = '#FFFFFFD9';

export const colorHasAlpha = (color) => {
    if (!color) return false;
    const c = color.trim().toLowerCase();
    if (c === 'transparent') return true;
    if (c.startsWith('#')) {
        if (c.length === 9) return c.slice(7) !== 'ff';
        if (c.length === 5) return c[4] !== 'f';
        return false;
    }
    const fn = c.match(/^(?:rgba?|hsla?)\(([^)]*)\)$/);
    if (!fn) return false;
    const inner = fn[1];
    let alpha = null;
    if (inner.includes('/')) {
        alpha = inner.split('/')[1];
    } else {
        const parts = inner.split(',');
        if (parts.length === 4) alpha = parts[3];
    }
    if (alpha === null) return false;
    const a = alpha.trim();
    const n = parseFloat(a);
    if (Number.isNaN(n)) return false;
    return n < (a.endsWith('%') ? 100 : 1);
};
