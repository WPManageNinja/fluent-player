export default function translate(string) {
    const appVars = window.fluentFrameworkAdmin || {};
    const translations = appVars.trans || {};

    string = translations[string] || string;

    const args = Array.prototype.slice.call(arguments, 1);

    if (args.length === 0) {
        return string;
    }

    const regex = /%(\d+\$)?([sd])/g;

    let argIndex = 0;
    string = string.replace(regex, (match, number, type) => {
        if (number) {
            const index = parseInt(number, 10) - 1;
            return index >= 0 && index < args.length ? args[index] : match;
        } else {
            return argIndex < args.length ? args[argIndex++] : match;
        }
    });

    return string;
}
