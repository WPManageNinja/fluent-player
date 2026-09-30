/**
 * WordPress 7.1 deprecated `__experimentalShowHowTo` on FormTokenField in favour of
 * `help`, but `help` does not exist before 7.1. Passing both suppresses the how-to
 * text everywhere at the cost of a console deprecation on 7.1+, so pick one.
 */
export function formTokenFieldHowToProps(wpVersion) {
    const version = wpVersion || window.fluentPlayerBlockVars?.wpVersion || '';
    const [major, minor] = String(version).split('.').map((part) => parseInt(part, 10) || 0);
    const supportsHelp = major > 7 || (major === 7 && minor >= 1);

    return supportsHelp ? { help: '' } : { __experimentalShowHowTo: false };
}
