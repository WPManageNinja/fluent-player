import FluentPlayer from './FluentPlayer';
import './BrowserStorage';

// Track initialized players — Map<playerId, { instance, container, varName }>
const playerInstances = new Map();

/**
 * Destroy and remove instances whose DOM containers have been removed from the
 * document (e.g. FluentCommunity SPA navigation between feed posts or lessons).
 * Also cleans up the window[varName] global that was set during init.
 */
function cleanupOrphanedInstances() {
    for (const [playerId, entry] of playerInstances) {
        if (!document.body.contains(entry.container)) {
            if (entry.instance && typeof entry.instance.destroy === 'function') {
                entry.instance.destroy();
            }
            // Remove the window global that was cached during init
            if (entry.varName && window[entry.varName]) {
                try { delete window[entry.varName]; } catch (_) { /* non-configurable */ }
            }
            playerInstances.delete(playerId);
        }
    }
}

async function initFluentPlayers(force = false) {
    // Purge instances whose containers are no longer in the DOM
    cleanupOrphanedInstances();

    // Initialize single players
    for (const container of document.querySelectorAll('.fluent-player')) {
        const playerId = container.id;
        if (playerId && playerInstances.has(playerId) && !force) {
            continue;
        }

        const varName = container.dataset.var_name;

        let playerData = window[varName];

        if (playerData && (playerData.nodeType || !playerData.media)) {
            playerData = null;
        }

        // If still no data, try to fetch via AJAX for fluent community portal
        if (!playerData) {
            playerData = await fetchMediaData(container);
        }

        if (!playerData) continue;
        window[varName] = playerData;

        // Destroy previous instance before creating a new one
        if (playerId && playerInstances.has(playerId)) {
            const oldEntry = playerInstances.get(playerId);
            if (oldEntry.instance && typeof oldEntry.instance.destroy === 'function') {
                oldEntry.instance.destroy();
            }
        }

        const instance = new FluentPlayer(container, playerData);

        if (playerId) {
            playerInstances.set(playerId, { instance, container, varName });
        }
    }
}

async function initFluentPlayer(event) {
    const container = event.detail.container;
    if (!container) return;

    const playerId = container.id;

    let playerData = event.detail.playerData;
    const varName = container.dataset.var_name;
    if (!playerData) {
        if (!varName) return;
        playerData = window[varName];
    }
    if (!playerData) return;

    // Destroy previous instance before creating a new one
    if (playerId && playerInstances.has(playerId)) {
        const oldEntry = playerInstances.get(playerId);
        if (oldEntry.instance && typeof oldEntry.instance.destroy === 'function') {
            oldEntry.instance.destroy();
        }
    }

    const instance = new FluentPlayer(container, playerData);

    if (playerId) {
        playerInstances.set(playerId, { instance, container, varName });
    }
}

async function fetchMediaData(container) {
    try {
        // Extract media ID from container (prefer data-media-id which holds the real numeric ID)
        const mediaId = container.querySelector('[data-media-id]')?.dataset.mediaId ||
                       container.dataset.mediaId;

        if (!mediaId) {
            console.warn('FluentPlayer: No media ID found for container', container);
            return null;
        }

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

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFluentPlayers);
} else {
    initFluentPlayers();
}

document.addEventListener('FComMediaReady', function(_) {
    initFluentPlayers(true);
});
document.addEventListener('InitSingleFluentPlayer', initFluentPlayer);

// Export for manual initialization
window.FluentPlayer = FluentPlayer;
