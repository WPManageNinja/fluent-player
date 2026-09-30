import FluentPlayer from './FluentPlayer';
import './BrowserStorage';
import { delegateMediaUnlockForms } from './utils/unlock';
import { computeBrandingVars } from './utils/brandingVars.js';
import { readInlineConfig, observeInjectedPlayers } from './utils/inlineConfig.js';

// Live branding preview: a page-builder settings panel emits `fluentPlayer/settingsPreview`
// when a colour changes. Apply the vars inline on every element carrying that media id (inline
// beats the server-printed `[data-media-id]{…}` <style>), so the change is immediate. Runs at
// the document level — no FluentPlayer instance required (the editor preview may not create one).
function applyLivePreviewBranding(detail) {
    if (!detail || !detail.settings) return;
    const target = String(detail.mediaId);
    const vars = computeBrandingVars(detail.settings, detail.defaultSettings || {});
    document.querySelectorAll('[data-media-id]').forEach((el) => {
        if (String(el.getAttribute('data-media-id')) !== target) return;
        Object.keys(vars).forEach((key) => el.style.setProperty(key, vars[key]));
    });
}

// Track initialized players — Map<containerEl, { instance, varName }>.
// Keyed by the element, not by its id: a page-builder canvas renders each element in
// its own server request, so the PHP instance counter restarts and two placements of
// one media both serialize as `fluent_player_<id>_1`. Keying by that string made the
// second container look already-initialized and left it unhydrated.
const playerInstances = new Map();

// A throwing destroy (e.g. already-disposed Vidstack element) must never abort
// initialization of the remaining/new players.
function destroyInstance(entry) {
    if (entry?.instance && typeof entry.instance.destroy === 'function') {
        try {
            entry.instance.destroy();
        } catch (error) {
            console.error('FluentPlayer: instance destroy failed:', error);
        }
    }
}

/**
 * Destroy and remove instances whose DOM containers have been removed from the
 * document (e.g. FluentCommunity SPA navigation between feed posts or lessons).
 * Also cleans up the window[varName] global that was set during init.
 */
function cleanupOrphanedInstances() {
    for (const [container, entry] of playerInstances) {
        if (!document.body.contains(container)) {
            destroyInstance(entry);
            playerInstances.delete(container);

            // Only drop the global once no surviving container still shares that name —
            // duplicate placements of one media reuse the same varName.
            const stillUsed = [...playerInstances.values()].some((e) => e.varName === entry.varName);
            if (entry.varName && !stillUsed && window[entry.varName]) {
                try { delete window[entry.varName]; } catch (_) { /* non-configurable */ }
            }
        }
    }
}

async function initFluentPlayers(force = false) {
    // Purge instances whose containers are no longer in the DOM
    cleanupOrphanedInstances();

    // Initialize single players
    for (const container of document.querySelectorAll('.fluent-player')) {
        if (playerInstances.has(container) && !force) {
            continue;
        }

        const varName = container.dataset.var_name;

        let playerData = window[varName];

        if (playerData && (playerData.nodeType || !playerData.media)) {
            playerData = null;
        }

        // Canvas-injected markup carries its config inline: neither the enqueued
        // localization nor an executable <script> survives an innerHTML insertion.
        if (!playerData) {
            playerData = readInlineConfig(varName, container.ownerDocument);
        }

        // If still no data, try to fetch via AJAX for fluent community portal
        if (!playerData) {
            playerData = await fetchMediaData(container);
        }

        if (!playerData) continue;
        window[varName] = playerData;

        // Apply this player's branding inline from its config so it beats any STALE page-level
        // branding <style> — e.g. a page-builder canvas re-render swaps in fresh markup but the
        // enqueued footer CSS still holds the old colours, and inline vars override a selector.
        const cfgSettings = playerData && playerData.media && playerData.media.settings;
        if (cfgSettings) {
            const mid = (container.querySelector('[data-media-id]') || {}).getAttribute
                ? container.querySelector('[data-media-id]').getAttribute('data-media-id')
                : (playerData.media && playerData.media.ID);
            if (mid) {
                applyLivePreviewBranding({ mediaId: String(mid), settings: cfgSettings, defaultSettings: playerData.default_settings });
            }
        }

        // Destroy previous instance before creating a new one
        if (playerInstances.has(container)) {
            destroyInstance(playerInstances.get(container));
        }

        playerInstances.set(container, { instance: new FluentPlayer(container, playerData), varName });
    }
}

async function initFluentPlayer(event) {
    const container = event.detail.container;
    if (!container) return;

    let playerData = event.detail.playerData;
    const varName = container.dataset.var_name;
    if (!playerData) {
        if (!varName) return;
        playerData = window[varName];
        // window[varName] resolves to the id-named DOM node when no config was
        // localized, so reject anything that isn't a real config object.
        if (playerData && (playerData.nodeType || !playerData.media)) {
            playerData = readInlineConfig(varName, container.ownerDocument);
        }
    }
    if (!playerData) return;

    // Destroy previous instance before creating a new one
    if (playerInstances.has(container)) {
        destroyInstance(playerInstances.get(container));
    }

    playerInstances.set(container, { instance: new FluentPlayer(container, playerData), varName });
}

async function fetchMediaData(container) {
    try {
        // Extract media ID from container (prefer data-media-id which holds the real numeric ID)
        const mediaIdEl = container.querySelector('[data-media-id]');
        const mediaId = mediaIdEl?.dataset.mediaId || container.dataset.mediaId;

        if (!mediaId) {
            console.warn('FluentPlayer: No media ID found for container', container);
            return null;
        }

        // Private media require the render-issued access key to be fetchable.
        const accessKey = mediaIdEl?.dataset.accessKey || container.dataset.accessKey || '';

        // Get AJAX configuration
        const config = window.fluent_player || window.fluentCommunityPortalVars?.fluent_player || {};
        const ajaxUrl = config.ajax_url || '/wp-admin/admin-ajax.php';
        const nonce = config.nonce || config.rest_nonce;

        // Fetch media data via AJAX
        const response = await fetch(ajaxUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'fluent_player_get_media_data',
                media_id: mediaId,
                nonce: nonce,
                access_key: accessKey,
                context: config.context || 'frontend'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.error) {
            console.error('FluentPlayer: Failed to fetch media data:', result.error);
            return null;
        }

        if (result.media) {
            return result;
        } else {
            console.error('FluentPlayer: Invalid response format:', result);
            return null;
        }

    } catch (error) {
        console.error('FluentPlayer: Error fetching media data:', error);
        return null;
    }
}

// The versioned enqueue URL (fluent-player.js?ver=x) and the bare URL that
// Vite-generated chunks import (./fluent-player.js) are different modules to
// the browser, so this entry can evaluate twice on one page. A second
// bootstrap would create a duplicate player per container and every tracker
// (analytics, milestones, layers) would report each event twice.
if (!window.__fluentPlayerBootstrapped) {
    window.__fluentPlayerBootstrapped = true;

    delegateMediaUnlockForms();

    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initFluentPlayers());
    } else {
        initFluentPlayers();
    }

    document.addEventListener('FComMediaReady', function(_) {
        initFluentPlayers(true);
    });

    // Players injected after load; initFluentPlayers() skips containers it already owns.
    observeInjectedPlayers(() => initFluentPlayers());
    document.addEventListener('InitSingleFluentPlayer', initFluentPlayer);
    document.addEventListener('fluentPlayer/settingsPreview', (e) => applyLivePreviewBranding(e.detail));

    // Export for manual initialization
    window.FluentPlayer = FluentPlayer;
}
