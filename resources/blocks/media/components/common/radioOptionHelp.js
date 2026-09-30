/**
 * Whether a CustomRadioGroup option should expose its description via an info
 * icon + tooltip. Only options carrying a non-empty string description qualify
 * (Load Strategy does; Visibility / Animation pass none and stay icon-free).
 *
 * Pure seam — unit-tested in dev/test/js/blocks/radioOptionHelp.test.js. The
 * DOM wiring is proven by dev/e2e/admin/load-strategy-tooltip.spec.js.
 */
export const hasOptionHelp = (option) =>
    !!option &&
    typeof option.description === 'string' &&
    option.description.trim().length > 0;
