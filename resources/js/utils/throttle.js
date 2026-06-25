/**
 * Wall-clock throttle. Each call returns an independent throttled function with
 * its own timestamp, so wrapping several handlers never lets one starve another.
 * Leading-edge only: the suppressed final call is dropped, not deferred — don't
 * wrap a handler whose last invocation must always run.
 */
export function throttle(fn, ms) {
    let last = -Infinity;

    return function throttled(...args) {
        const now = Date.now();
        if (now - last < ms) {
            return undefined;
        }
        last = now;
        return fn.apply(this, args);
    };
}
