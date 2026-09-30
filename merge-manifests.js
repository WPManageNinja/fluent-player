import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assetsDir = path.join(__dirname, 'assets');
const outputManifestPath = path.join(assetsDir, 'manifest.json');

function mergeManifests() {
    let combinedManifest = {};

    const manifestFiles = ['manifest.fluent-player.json', 'manifest.fluent-playlist.json', 'manifest.playlist.json', 'manifest.admin.json', 'manifest.gutenberg.json', 'manifest.vidstack-loader.json', 'manifest.gutenberg-playlist.json', 'manifest.timed-content.json', 'manifest.media-toolbar.json'];

    manifestFiles.forEach(file => {
        const manifestPath = path.join(assetsDir, file);
        if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const cssFiles = {};
            Object.entries(manifest).forEach(([key, value]) => {
                // Resolve css file name based on referenced import js
                if (key.endsWith('.scss')) {
                    const newValue = {...value};
                    const imports = Array.isArray(value.imports) ? value.imports : [];
                    const jsFileKey = imports[imports.length - 1];
                    if (jsFileKey && manifest[jsFileKey].css && cssFiles[jsFileKey]) {
                        newValue.file = cssFiles[jsFileKey];
                    }

                    // Remove only the generated JS shim file for CSS entries.
                    const filePath = path.join(assetsDir, value.file);
                    if (value.file && value.file.endsWith('.js') && fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`Removed file: ${filePath}`);
                    }
                    combinedManifest[key] = newValue;
                } else if (Array.isArray(value.css) && value.css.length) {
                    // For JS entries with CSS, store css file name and remove the CSS reference
                    const newValue = {...value};
                    cssFiles[key] = value.css[value.css.length - 1];
                    delete newValue.css;
                    combinedManifest[key] = newValue;
                } else {
                    combinedManifest[key] = value;
                }
            });
        }
    });

    fs.writeFileSync(outputManifestPath, JSON.stringify(combinedManifest, null, 2));
    console.log(`Combined manifest written to ${outputManifestPath}`);

    // Remove individual manifest files
    manifestFiles.forEach(file => {
        const filePath = path.join(assetsDir, file);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Removed file: ${filePath}`);
        }
    });
}

mergeManifests();
