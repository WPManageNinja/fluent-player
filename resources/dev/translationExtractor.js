import fs from 'fs';
import path from 'path';

// Side-effect-free extraction helpers shared by the translator.js generator
// script and its unit tests. Importing this module never touches the filesystem
// or regenerates anything — that stays in translator.js's top-level run.

// Admin authors translatable strings two ways: $t('…') in Vue templates and
// __('…') in JS composables (imported from @/utils/translator/Translator), then
// rendered dynamically via $t(variable). Both resolve against the same runtime
// dictionary, so the extractor must recognise both. \b__ avoids matching foo__(.
// NOTE: these regexes carry the /g flag (stateful lastIndex) — clone with
// new RegExp(re.source, re.flags) before reusing outside a full exec loop.
export const translationRegex = /(?:\$t|\b__)\(\s*`([^`\\]*(?:\\.[^`\\]*)*)`\s*[,\)]|(?:\$t|\b__)\(\s*'([^'\\]*(?:\\.[^'\\]*)*)'\s*[,\)]|(?:\$t|\b__)\(\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*[,\)]|\{\{\s*(?:\$t|\b__)\(\s*`([^`\\]*(?:\\.[^`\\]*)*)`\s*[,\)]\s*\}\}|\{\{\s*(?:\$t|\b__)\(\s*'([^'\\]*(?:\\.[^'\\]*)*)'\s*[,\)]\s*\}\}|\{\{\s*(?:\$t|\b__)\(\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*[,\)]\s*\}\}/g;

export const frontendTranslationRegex = /(?:\$t|\b__)\(\s*`([^`\\]*(?:\\.[^`\\]*)*)`\s*[,\)]|(?:\$t|\b__)\(\s*'([^'\\]*(?:\\.[^'\\]*)*)'\s*[,\)]|(?:\$t|\b__)\(\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*[,\)]|\$\{(?:\$t|\b__)\(`([^`\\]*(?:\\.[^`\\]*)*)`\)\}|\$\{(?:\$t|\b__)\('([^'\\]*(?:\\.[^'\\]*)*)'\)\}|\$\{(?:\$t|\b__)\("([^"\\]*(?:\\.[^"\\]*)*)"\)\}/g;

// Some admin strings are authored as Vue prop `default` values (e.g. an icon's
// `title`, or ProUpgrade's copy) and rendered dynamically via $t(<prop>). A
// literal-scanning extractor cannot see these. To stay self-maintaining as new
// components are added, we collect the `default` string value of any prop that
// IS rendered through $t(<identifier>) in the same file. URLs and values with no
// letters (colors, sizes, enum tokens) are skipped. Pure function over the raw
// component source, so it is unit-testable without touching the filesystem.
export function collectTranslatablePropDefaults(content) {
    const isTranslatableText = v => /[A-Za-z]/.test(v) && !/^\s*https?:\/\//i.test(v);

    const dynamicProps = new Set(
        [...content.matchAll(/\$t\(\s*([A-Za-z_]\w*)\s*\)/g)].map(m => m[1])
    );
    const found = [];
    if (!dynamicProps.size) return found;

    // prop defined as an object literal: `title: { type: String, default: 'X' }`
    const propRegex = /(\w+)\s*:\s*\{[^{}]*?default\s*:\s*(['"])((?:(?!\2).)*)\2/gs;
    let match;
    while ((match = propRegex.exec(content)) !== null) {
        const propName = match[1];
        const value = match[3];
        if (dynamicProps.has(propName) && isTranslatableText(value)) {
            found.push(value);
        }
    }
    return found;
}

// Filesystem wrapper over collectTranslatablePropDefaults, used by the generator.
export function extractDynamicPropDefaults(dirs) {
    const out = {};

    function scan(directory) {
        fs.readdirSync(directory).forEach(file => {
            const fullPath = path.join(directory, file);
            if (fs.statSync(fullPath).isDirectory()) {
                scan(fullPath);
                return;
            }
            if (!fullPath.endsWith('.vue')) return;

            const content = fs.readFileSync(fullPath, 'utf8');
            for (const value of collectTranslatablePropDefaults(content)) {
                const location = `${path.relative(process.cwd(), fullPath)}:prop`;
                if (!out[value]) out[value] = new Set();
                out[value].add(location);
            }
        });
    }

    dirs.forEach(scan);
    return Object.fromEntries(
        Object.entries(out).map(([key, locations]) => [key, [...locations].join(', ')])
    );
}
