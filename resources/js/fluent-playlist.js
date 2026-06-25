import './BrowserStorage';
import FluentPlaylist from './FluentPlaylist';

// Track initialized playlists — Map<containerId, { instance, container }>
const playlistInstances = new Map();

/**
 * Destroy and remove instances whose DOM containers have been removed
 * (e.g. FluentCommunity SPA navigation between feed posts or lessons).
 */
function cleanupOrphanedInstances() {
    for (const [id, entry] of playlistInstances) {
        if (!document.body.contains(entry.container)) {
            if (entry.instance && typeof entry.instance.destroy === 'function') {
                entry.instance.destroy();
            }
            if (entry.varName && window[entry.varName]) {
                try { delete window[entry.varName]; } catch (_) { /* non-configurable */ }
            }
            playlistInstances.delete(id);
        }
    }
}

/**
 * Get playlist config — checked in priority order:
 * 1. window global (set by wp_localize_script on normal WP pages)
 * 2. data-fp-config attribute on the container (set by PHP render() for async contexts)
 * 3. <script type="application/json"> sibling element (legacy fallback)
 */
function getPlaylistConfig(container, varName) {
    const win = window[varName];
    if (win && win.medias && win.medias.length > 0) return win;

    // data-fp-config is always present (injected by BasePlaylistLayout::render())
    if (container.dataset.fpConfig) {
        try {
            const config = JSON.parse(container.dataset.fpConfig);
            window[varName] = config;
            return config;
        } catch (_) {}
    }

    // Legacy fallback: <script type="application/json" id="fp-playlist-config-{varName}">
    const configEl = document.getElementById('fp-playlist-config-' + varName);
    if (configEl) {
        try {
            const config = JSON.parse(configEl.textContent);
            window[varName] = config;
            return config;
        } catch (_) {}
    }

    return null;
}

function initFluentPlaylists() {
    // Purge instances whose containers are no longer in the DOM
    cleanupOrphanedInstances();

    // Initialize playlists
    document.querySelectorAll('.fluent-playlist').forEach(container => {
        const varName = container.dataset.var_name;
        if (!varName) return;

        const config = getPlaylistConfig(container, varName);
        if (!config) return;

        if (!container.dataset.flpRef && config?.playlist?.deep_link_ref) {
            container.dataset.flpRef = config.playlist.deep_link_ref;
        }

        const containerId = container.id || varName;

        // Skip if already initialized and still in the DOM
        if (playlistInstances.has(containerId)) {
            return;
        }

        const instance = new FluentPlaylist(container, config);
        playlistInstances.set(containerId, { instance, container, varName });
    });
    document.dispatchEvent(new CustomEvent('fluentPlaylistInitialized'));
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFluentPlaylists);
} else {
    initFluentPlaylists();
}

// Watch for playlists injected after load (e.g. FluentCommunity async lesson content)
const _fpObserver = new MutationObserver(function(mutations) {
    let hasNewPlaylist = false;
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;
            if (node.classList && node.classList.contains('fluent-playlist')) {
                hasNewPlaylist = true;
                break;
            }
            if (node.querySelector && node.querySelector('.fluent-playlist')) {
                hasNewPlaylist = true;
                break;
            }
        }
        if (hasNewPlaylist) break;
    }
    if (hasNewPlaylist) initFluentPlaylists();
});
_fpObserver.observe(document.body, { childList: true, subtree: true });

// Export for manual initialization
window.FluentPlaylist = FluentPlaylist;
window.initFluentPlaylists = initFluentPlaylists;
