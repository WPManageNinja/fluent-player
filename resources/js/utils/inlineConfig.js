/**
 * Hydration helpers for players injected into the DOM after load.
 *
 * A builder canvas (Breakdance) renders an element over AJAX and inserts the returned
 * HTML with innerHTML, so the wp_localize_script config is discarded and a <script> in
 * that HTML lands in the DOM without ever executing. Hence config as inert
 * application/json, plus a re-scan on insertion.
 */

/**
 * @param {string} varName Instance var name (the container's data-var_name).
 * @returns {object|null} Parsed config, or null when absent/malformed.
 */
export function readInlineConfig(varName, doc) {
    if (!varName) {
        return null;
    }

    const root = doc || document;

    for (const block of root.querySelectorAll('script.fp-inline-config')) {
        if (block.getAttribute('data-var-name') !== varName) {
            continue;
        }

        try {
            const parsed = JSON.parse(block.textContent);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (error) {
            // A mangled block must not abort the other players on the page.
            return null;
        }
    }

    return null;
}

/** @returns {Function} Disconnects the observer. */
export function observeInjectedPlayers(onInjected, target) {
    const root = target || document.body;

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) {
                    continue;
                }

                const isPlayer = node.classList && node.classList.contains('fluent-player');
                const containsPlayer = node.querySelector && node.querySelector('.fluent-player');

                if (isPlayer || containsPlayer) {
                    onInjected();
                    return;
                }
            }
        }
    });

    observer.observe(root, { childList: true, subtree: true });

    return () => observer.disconnect();
}
