const { createRoot } = wp.element;
const { useSelect } = wp.data;
import ToolbarApp from "./common/components/ToolbarApp.jsx";
import BackButton from "./common/components/BackButton.jsx";
import { resolveBackButton } from "./common/editorBackButton.js";

const SUPPORTED_POST_TYPES = ['fluent_player_media', 'fluent_playlist'];

const EditApp = () => {
    const currentPostType = useSelect((select) => {
        const editorStore = select("core/editor");
        return editorStore ? editorStore.getCurrentPostType() : null;
    }, []);

    if (!SUPPORTED_POST_TYPES.includes(currentPostType)) {
        return null;
    }

    return <ToolbarApp />;
};

/**
 * Replace the editor's top-left close/site-icon with a Back button that returns
 * to the Fluent Player admin app. The destination is localized per plugin
 * (free → #/, Pro → #/playlists) via window.fluentPlayerToolbar, so this stays
 * post-type-agnostic. Rendered as a real link so the editor's native
 * unsaved-changes prompt fires on navigation.
 *
 * @return {boolean} true once mounted (or nothing to do), false to retry.
 */
function mountBackButton() {
    const resolved = resolveBackButton(window.fluentPlayerToolbar);
    if (!resolved) {
        return true; // no destination localized on this screen — nothing to do
    }

    if (document.querySelector(".fluent-player-back-root")) {
        return true;
    }

    const native =
        document.querySelector(".editor-header__back-button") ||
        document.querySelector(".edit-post-fullscreen-mode-close");
    if (!native) {
        return false; // header not ready yet — retry
    }

    native.style.display = "none";
    native.setAttribute("aria-hidden", "true");
    native.setAttribute("tabindex", "-1");

    const rootDiv = document.createElement("div");
    rootDiv.classList.add("fluent-player-back-root");
    native.parentNode.insertBefore(rootDiv, native);

    createRoot(rootDiv).render(
        <BackButton url={resolved.url} label={resolved.label} ariaLabel={resolved.ariaLabel} />
    );
    return true;
}

(function (wp) {
    const rootDiv = document.createElement("div");
    rootDiv.classList.add("fluent-player-edit-root");

    const editorEl = document.getElementById("editor");
    if (!editorEl) {
        return;
    }

    const root = createRoot(rootDiv);
    root.render(<EditApp/>);

    let settingsMounted = false;
    let backMounted = false;

    const mountSettings = function () {
        if (rootDiv.isConnected) {
            settingsMounted = true;
            return;
        }
        const toolbarEl =
            editorEl.querySelector(".edit-post-header__settings") ||
            editorEl.querySelector(".editor-header__settings");
        if (toolbarEl instanceof HTMLElement) {
            toolbarEl.prepend(rootDiv);
            settingsMounted = true;
        }
    };

    const unsubscribe = wp.data.subscribe(function () {
        setTimeout(function () {
            if (!settingsMounted) {
                mountSettings();
            }
            if (!backMounted) {
                backMounted = mountBackButton();
            }
            if (settingsMounted && backMounted) {
                unsubscribe();
            }
        }, 1);
    });
})(wp);
