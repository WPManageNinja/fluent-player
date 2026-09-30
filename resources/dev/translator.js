import path from 'path';
import * as TranslationHelper from './TranslationHelper.js';
import {
    translationRegex,
    frontendTranslationRegex,
    extractDynamicPropDefaults,
} from './translationExtractor.js';

const excludeDirs = [];
const excludeFiles = [];
const includeSource = typeof process.env.npm_config_debug !== 'undefined';
console.log(includeSource, 'includeSource');

// Admin: scanned $t/__ literals + dynamic Vue prop defaults (literals take
// precedence so their source locations/comments are preserved on merge).
let resourcesDir = [
    path.join('resources/admin')
];
let phpFile = path.join('app/Services/Translations/admin-translations.php');

const {translations, comments} = TranslationHelper.extractTranslations(resourcesDir, translationRegex, excludeDirs, excludeFiles);
const adminTranslations = {...extractDynamicPropDefaults(resourcesDir), ...translations};
TranslationHelper.updatePhpTranslations(adminTranslations, {}, phpFile, includeSource, comments, 'Admin Translations');

// Frontend player runtime.
let frontendResourcesDir = [
    path.join('resources/js')
];
let frontendPhpFile = path.join('app/Services/Translations/frontend-translations.php');

const {translations: frontendTranslations, comments: frontendComments} = TranslationHelper.extractTranslations(frontendResourcesDir, frontendTranslationRegex, excludeDirs, excludeFiles);
TranslationHelper.updatePhpTranslations(frontendTranslations, {}, frontendPhpFile, includeSource, frontendComments, 'Frontend Translations');
