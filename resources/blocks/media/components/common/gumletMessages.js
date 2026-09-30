/**
 * Choose a user-facing message when a Gumlet asset delete fails.
 *
 * Gumlet returns a generic `{"error":{"message":"Something went wrong."}}`
 * (HTTP 400) when you try to delete an asset that is still queued/processing —
 * it won't delete mid-transcode. For that case we show a clear explanation
 * instead of the opaque API text. Errored/ready assets surface the real reason
 * so failed uploads can still be removed.
 *
 * Pure function (no wp.* globals) so it is unit-testable. The caller supplies
 * localized strings so i18n stays in the component.
 *
 * @param {object} asset       Normalized asset ({ ready, error }).
 * @param {string} rawMessage  Raw API error message.
 * @param {object} strings     { processing, fallback } (localized).
 * @returns {string}
 */
export function gumletDeleteErrorMessage(asset, rawMessage, strings) {
    const isProcessing = !!asset && !asset.ready && !asset.error;
    if (isProcessing) {
        return strings.processing;
    }
    return rawMessage || strings.fallback;
}

export default gumletDeleteErrorMessage;
