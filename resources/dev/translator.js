import fs from 'fs';
import path from 'path';
import * as TranslationHelper from './TranslationHelper.js';


let resourcesDir = [
    path.join('resources/admin')
];
let phpFile = path.join('app/Services/Translations/admin-translations.php');

const excludeDirs = [];
const excludeFiles = [];
let translationRegex = /\$t\(\s*`([^`\\]*(?:\\.[^`\\]*)*)`\s*[,\)]|\$t\(\s*'([^'\\]*(?:\\.[^'\\]*)*)'\s*[,\)]|\$t\(\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*[,\)]|\{\{\s*\$t\(\s*`([^`\\]*(?:\\.[^`\\]*)*)`\s*[,\)]\s*\}\}|\{\{\s*\$t\(\s*'([^'\\]*(?:\\.[^'\\]*)*)'\s*[,\)]\s*\}\}|\{\{\s*\$t\(\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*[,\)]\s*\}\}/g;

const includeSource = typeof process.env.npm_config_debug !== 'undefined';
console.log(includeSource, 'includeSource');

let commentsArray = {};

const {translations, comments} = TranslationHelper.extractTranslations(resourcesDir, translationRegex, excludeDirs, excludeFiles);

commentsArray = comments;
TranslationHelper.updatePhpTranslations(translations, {}, phpFile, includeSource, comments, 'Admin Translations');

let frontendResourcesDir = [
    path.join('resources/js')
];
let frontendPhpFile = path.join('app/Services/Translations/frontend-translations.php');

const frontendTranslationRegex = /\$t\(\s*`([^`\\]*(?:\\.[^`\\]*)*)`\s*[,\)]|\$t\(\s*'([^'\\]*(?:\\.[^'\\]*)*)'\s*[,\)]|\$t\(\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*[,\)]|\$\{\$t\(`([^`\\]*(?:\\.[^`\\]*)*)`\)\}|\$\{\$t\('([^'\\]*(?:\\.[^'\\]*)*)'\)\}|\$\{\$t\("([^"\\]*(?:\\.[^"\\]*)*)"\)\}/g;

const {translations: frontendTranslations, comments: frontendComments} = TranslationHelper.extractTranslations(frontendResourcesDir, frontendTranslationRegex, excludeDirs, excludeFiles);

TranslationHelper.updatePhpTranslations(frontendTranslations, {}, frontendPhpFile, includeSource, frontendComments, 'Frontend Translations');
