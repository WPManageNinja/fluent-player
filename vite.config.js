import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import vue from '@vitejs/plugin-vue'
import liveReload from 'vite-plugin-live-reload'
import path from "path"
import AutoImport from 'unplugin-auto-import/vite'
import { vite as vidstack } from 'vidstack/plugins'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import replace from '@rollup/plugin-replace'

// mux-embed's timing/random helpers deref `global.default.performance` /
// `global.default.crypto`; when the interop'd global package resolves to an
// undefined `.default` at runtime the deref throws before mux's own Date.now()
// fallback runs. Null-safe every `<ident>.default.<member>` so it falls through.
const muxGlobalGuard = () => ({
    name: 'fluent-player-mux-global-guard',
    renderChunk(code) {
        const guarded = code.replace(
            /([A-Za-z_$][\w$]*)\.default\.(performance|crypto|timing)\b/g,
            '($1.default||{}).$2'
        );
        return guarded === code ? null : { code: guarded, map: null };
    },
});

// Define all possible inputs
const allInputs = {
    admin: {
        'admin': 'resources/admin/app.js',
        'admin-style': 'resources/scss/admin/admin.scss'
    },
    'fluent-player': {
        'fluent-player': 'resources/js/fluent-player.js',
        'fluent-player-css': 'resources/scss/public/fluent-player.scss',
    },
    'fluent-playlist': {
        'fluent-playlist': 'resources/js/fluent-playlist.js',
        'fluent-playlist-css': 'resources/scss/public/fluent-playlist.scss',
    },
    'gutenberg': {
        'fluent-player-block': 'resources/blocks/media/fluent-player-block.jsx',
        'fluent-player-block-css': 'resources/scss/fluent-player-block.scss',
    },
    'elementor': {
        'fluent-player-elementor-settings': 'resources/blocks/media/elementor/editor.jsx',
    },
    'elementor-canvas': {
        'fluent-player-elementor-canvas': 'resources/blocks/media/elementor/canvas.jsx',
    },
    'elementor-playlist-canvas': {
        'fluent-player-elementor-playlist-canvas': 'resources/blocks/media/elementor/playlistCanvas.jsx',
    },
    'divi-vb': {
        'fluent-player-divi-vb': 'resources/blocks/media/divi/index.jsx',
    },
    'divi-playlist': {
        'fluent-player-divi-playlist-vb': 'resources/blocks/playlist/divi/index.jsx',
    },
    'vidstack-loader': {
        'vidstack-loader': 'resources/blocks/media/vidstack-loader.js',
    },
    'gutenberg-playlist': {
        'fluent-player-playlist-block': 'resources/blocks/playlist/fluent-playlist-block.jsx',
        'fluent-player-playlist-block-css': 'resources/scss/fluent-player-playlist-block.scss',
    },
'timed-content': {
        'timed-content-frontend': 'resources/js/timed-content-frontend.js',
        'timed-content-frontend-css': 'resources/scss/public/timed-content.scss',
    },
    'media-toolbar': {
        'media-toolbar': 'resources/blocks/mediaToolbar.jsx',
    }
};

export default defineConfig(({ mode, command }) => {
    const buildType = mode || 'admin'; // Default to admin if no mode specified

    if (!allInputs[buildType]) {
        console.warn(`Unknown build type: ${buildType}. Available types: ${Object.keys(allInputs).join(', ')}`);
        console.warn('Defaulting to admin build');
    }

    const inputs = allInputs[buildType] || allInputs.admin;
    const isProduction = command === 'build';

    // Determine manifest name based on build type
    const manifest = `manifest.${buildType}.json`;

    // Determine plugins based on build type
    const plugins = [];

    // Common plugins for all build types
    plugins.push(
        liveReload([
            // `${__dirname}/**/*\.php`,
        ]),
        viteStaticCopy({
            targets: [
                {src: 'resources/images', dest: ''},
                { src: 'resources/libs/ace', dest: '' },
                { src: 'resources/youtube-bridge.html', dest: '' },
            ]
        }),
        // Simple WordPress compliance: Remove external URLs
        replace({
            values: {
                // Replace Cast API references for WordPress compliance
                'GoogleCastProvider': 'DisabledCastProvider',
                'chrome.cast': '{ media: { TrackType: { TEXT: "text", AUDIO: "audio" } } }',
                'cast.framework': '{ CastContext: { getInstance: function() { return {}; } } }',
            },
            preventAssignment: true,
            include: ['**/*'],
        }),
        muxGlobalGuard()
    );

    // Vue-specific plugins for non-Gutenberg builds
    const isGutenbergBuild = buildType.startsWith('gutenberg') || buildType === 'elementor' || buildType === 'elementor-canvas' || buildType === 'elementor-playlist-canvas' || buildType === 'divi-vb' || buildType === 'divi-playlist';
    if (!isGutenbergBuild) {
        plugins.push(
            vue({
                template: {
                    compilerOptions: {
                        isCustomElement: (tag) => tag.startsWith('media-'),
                    },
                },
            }),
            vidstack(),
            AutoImport({
                resolvers: [ElementPlusResolver()],
            }),
            Components({
                resolvers: [ElementPlusResolver()],
                directives: false
            })
        );
    } else {
        plugins.push(
            vidstack(),
        );
    }

    return {
        base: './',
        plugins,
        css: {
            preprocessorOptions: {
                scss: {
                    quietDeps: true,
                    silenceDeprecations: ['legacy-js-api']
                }
            }
        },
        build: {
            manifest,
            outDir: 'assets',
            publicDir: 'assets',
            emptyOutDir: false,
            assetsDir: '.',
            minify: isProduction,
            sourcemap: !isProduction,
            chunkSizeWarningLimit: 3000,
            cssMinify: isProduction ? true : false,
            rollupOptions: {
                input: inputs,
                external: isGutenbergBuild ? ['underscore', 'react', 'react-dom', 'react/jsx-runtime'] : [],
                output: {
                    chunkFileNames: 'fp-[name].js',
                    entryFileNames: '[name].js',
                    // The divi-vb / elementor-canvas entries emit a generic CSS
                    // chunk name that would clobber other builds; give each a
                    // unique, build-scoped name.
                    assetFileNames: (assetInfo) => {
                        const isCss = (assetInfo.name || '').endsWith('.css');
                        if (isCss && buildType === 'divi-vb') return 'fluent-player-divi-vb.css';
                        if (isCss && buildType === 'divi-playlist') return 'fluent-player-divi-playlist-vb.css';
                        if (isCss && buildType === 'elementor-canvas') return 'fluent-player-elementor-canvas.css';
                        if (isCss && buildType === 'elementor-playlist-canvas') return 'fluent-player-elementor-playlist-canvas.css';
                        return '[name].[ext]';
                    },
                    manualChunks(id) {
                        // The admin SPA is route-code-split: let Rollup give each
                        // dynamic import (and its heavy deps, e.g. echarts) its own
                        // chunk so they load on demand instead of in the entry.
                        if (buildType === 'admin') {
                            return undefined;
                        }
                        // Frontend entries ship as a single file (WP enqueues one
                        // script); keep them collapsed, but still let the two
                        // explicitly lazy modules split.
                        if (id.includes('LayersManager') || id.includes('AnalyticsTracker')) {
                            return undefined;
                        }
                        return '';
                    }
                    // globals: buildType === 'gutenberg' ? { underscore: '_' } : {}
                }
            },
        },
        define: {
            'chrome.cast': '{ media: { TrackType: { TEXT: "text", AUDIO: "audio" } } }',
            'cast.framework': '{ CastContext: { getInstance: function() { return {}; } } }'
        },
        resolve: {
            alias: {
                'vue': 'vue/dist/vue.esm-bundler.js',
                '@': path.resolve(__dirname, 'resources/admin'),
                '@share': path.resolve(__dirname, 'resources/share'),
                '@components': path.resolve(__dirname, 'resources/admin/components'),
                '@icons': path.resolve(__dirname, 'resources/js/icons.js')
            },
        },
        server: {
            port: 8880,
            strictPort: true,
            cors: true,
            origin: '*',
            hmr: {
                port: 8880,
                host: 'localhost',
                protocol: 'ws',
                overlay: true,
            },
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
            }
        },
        esbuild: {
            loader: "jsx",
            jsxFactory: 'React.createElement',
            jsxFragment: 'React.Fragment',
            target: 'es2015',
        },
    };
});
