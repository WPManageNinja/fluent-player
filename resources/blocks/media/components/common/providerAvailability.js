/**
 * Capability gating for Pro video providers in the block picker.
 *
 * `hasPro` alone is not enough for newer providers (e.g. Gumlet): during the
 * free-first merge window an updated free plugin can run against an older Pro
 * that has no matching REST routes. Pro advertises the providers it actually
 * supports via `window.fluentPlayerBlockVars.pro_providers`; the picker gates
 * on that so it never surfaces actions the backend can't serve.
 *
 * Pure functions (no globals) so they are unit-testable.
 */

/**
 * @param {string} provider
 * @param {boolean} hasPro
 * @param {string[]} proProviders  Providers advertised by the running Pro build.
 * @returns {boolean} true only when Pro is active AND advertises the provider.
 */
export function isProProviderUsable(provider, hasPro, proProviders = []) {
    return !!hasPro && Array.isArray(proProviders) && proProviders.includes(provider);
}

/**
 * Whether to render the picker button at all. Show it when Pro is absent (as an
 * upsell) or when the active Pro build supports the provider — but hide it when
 * Pro is active yet does not advertise the provider (older Pro, missing routes).
 *
 * @param {string} provider
 * @param {boolean} hasPro
 * @param {string[]} proProviders
 * @returns {boolean}
 */
export function shouldOfferProProvider(provider, hasPro, proProviders = []) {
    return !hasPro || isProProviderUsable(provider, hasPro, proProviders);
}
