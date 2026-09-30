import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assetsDir = path.join(__dirname, 'assets');
const outputManifestPath = path.join(assetsDir, 'manifest.json');

function mergeManifests() {
    // Seed from the existing combined manifest so a PARTIAL rebuild (e.g. `npm run
    // frontend`, which only emits a few per-mode manifests) updates just those entries
    // instead of clobbering every other mode's entries. Starting from {} was silently
    // dropping the page-builder / admin / gutenberg keys whenever a partial build ran
    // after a full one, which 404s those assets in production.
    let combinedManifest = {};
    if (fs.existsSync(outputManifestPath)) {
        try {
            combinedManifest = JSON.parse(fs.readFileSync(outputManifestPath, 'utf8'));
        } catch (e) {
            console.warn(`Could not parse existing manifest.json; starting fresh: ${e.message}`);
            combinedManifest = {};
        }
    }

    // One entry per Vite build mode. When you add a new Vite entry (vite.config.js),
    // add its `manifest.<mode>.json` here too — otherwise that mode's asset is dropped
    // from the combined manifest.json and 404s in production.
    const manifestFiles = ['manifest.fluent-player.json', 'manifest.fluent-playlist.json', 'manifest.fluent-player-modal.json', 'manifest.playlist.json', 'manifest.admin.json', 'manifest.gutenberg.json', 'manifest.elementor.json', 'manifest.elementor-canvas.json', 'manifest.elementor-playlist-canvas.json', 'manifest.divi-vb.json', 'manifest.divi-playlist.json', 'manifest.vidstack-loader.json', 'manifest.gutenberg-playlist.json', 'manifest.timed-content.json', 'manifest.media-toolbar.json'];

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
