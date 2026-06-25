/**
 * Accessible-name resolution for CustomToggle's checkbox.
 *
 * The visible label is not programmatically associated with the input
 * (no htmlFor — label clicks are handled manually so clickableLabel can opt
 * out), so without an aria-label assistive tech announces an unnamed
 * checkbox. Every caller passes a plain string label; fall back to it when
 * no explicit ariaLabel is given. JSX-node labels cannot name an input, so
 * they resolve to undefined.
 *
 * Plain .js (not part of the .jsx component) so the Vitest suite can import
 * it without a JSX transform.
 */
export const resolveToggleAriaLabel = (ariaLabel, label) => {
	if (typeof ariaLabel === 'string' && ariaLabel !== '') {
		return ariaLabel;
	}

	return typeof label === 'string' && label !== '' ? label : undefined;
};
