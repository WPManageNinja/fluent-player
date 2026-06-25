/**
 * Custom Icon Loader for Fluent Player
 *
 * Instead of importing all icons with 'vidstack/icons' (which includes 100+ icons),
 * this file creates a custom icon loader that only includes the specific icons used in the project.
 *
 * This significantly reduces bundle size while maintaining all required functionality.
 */

// Create a selective lazy loader with only the icons we actually use
const lazyPaths = {
    "play": () => import('media-icons/dist/icons/play.js'),
    "pause": () => import('media-icons/dist/icons/pause.js'),
    "mute": () => import('media-icons/dist/icons/mute.js'),
    "volume-low": () => import('media-icons/dist/icons/volume-low.js'),
    "volume-high": () => import('media-icons/dist/icons/volume-high.js'),
    "seek-backward-10": () => import('media-icons/dist/icons/seek-backward-10.js'),
    "seek-forward-10": () => import('media-icons/dist/icons/seek-forward-10.js'),
    "next": () => import('media-icons/dist/icons/next.js'),
    "previous": () => import('media-icons/dist/icons/previous.js'),
    "picture-in-picture": () => import('media-icons/dist/icons/picture-in-picture.js'),
    "picture-in-picture-exit": () => import('media-icons/dist/icons/picture-in-picture-exit.js'),
    "fullscreen": () => import('media-icons/dist/icons/fullscreen.js'),
    "fullscreen-exit": () => import('media-icons/dist/icons/fullscreen-exit.js'),
    "settings": () => import('media-icons/dist/icons/settings.js'),
    "accessibility": () => import('media-icons/dist/icons/accessibility.js'),
    "closed-captions": () => import('media-icons/dist/icons/closed-captions.js'),
    "closed-captions-on": () => import('media-icons/dist/icons/closed-captions-on.js'),
    "subtitles": () => import('media-icons/dist/icons/subtitles.js'),
    "odometer": () => import('media-icons/dist/icons/odometer.js'),
    "chapters": () => import('media-icons/dist/icons/chapters.js'),
    "chevron-right": () => import('media-icons/dist/icons/chevron-right.js'),
    "chevron-down": () => import('media-icons/dist/icons/chevron-down.js'),
    "chevron-left": () => import('media-icons/dist/icons/chevron-left.js'),
    "check": () => import('media-icons/dist/icons/check.js'),
    "search": () => import('media-icons/dist/icons/search.js'),
    "x-mark": () => import('media-icons/dist/icons/x-mark.js'),
    "playlist": () => import('media-icons/dist/icons/playlist.js'),
    "info": () => import('media-icons/dist/icons/playlist.js'),
};

// Helper functions from media-icons/element.js
function createTemplate(content) {
    const template = document.createElement("template");
    template.innerHTML = content;
    return template.content;
}

function cloneTemplateContent(content) {
    const fragment = content.cloneNode(true);
    return fragment.firstElementChild;
}

// SVG template for icons
const svgTemplate = createTemplate(
    `<svg width="100%" height="100%" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"></svg>`
);

// Custom MediaIcon element with selective icon loading
class MediaIconElement extends HTMLElement {
    constructor() {
        super();
        this._svg = this._createSVG();
        this._type = null;
    }

    static get observedAttributes() {
        return ["type"];
    }

    get type() {
        return this._type;
    }

    set type(type) {
        if (this._type === type) return;
        if (type) this.setAttribute("type", type);
        else this.removeAttribute("type");
        this._onTypeChange(type);
    }

    attributeChangedCallback(name, _, newValue) {
        if (name === "type") {
            const type = newValue ? newValue : null;
            if (this._type !== type) {
                this._onTypeChange(type);
            }
        }
    }

    connectedCallback() {
        this.classList.add("vds-icon");
        if (this._svg.parentNode !== this) {
            this.prepend(this._svg);
        }
    }

    _createSVG() {
        return cloneTemplateContent(svgTemplate);
    }

    _loadIcon() {
        const type = this._type;
        if (type && lazyPaths[type]) {
            lazyPaths[type]().then(({default: paths}) => {
                if (type === this._type) this._onPathsChange(paths);
            });
        } else {
            this._onPathsChange("");
        }
    }

    _onTypeChange(type) {
        this._type = type;
        this._loadIcon();
    }

    _onPathsChange(paths) {
        this._svg.innerHTML = paths;
    }
}

// Register the custom element if not already registered
if (!window.customElements.get('media-icon')) {
    window.customElements.define('media-icon', MediaIconElement);
}

/**
 * Note: Some icons used in PHP templates may not exist in media-icons package:
 * - check-circle (not available - will need custom SVG or fallback)
 * - circle (not available - will need custom SVG or fallback)
 * - clock (not available - will need custom SVG or fallback)
 * - email (not available - will need custom SVG or fallback)
 * - list (not available - will need custom SVG or fallback)
 * - lock (available as lock-closed and lock-open)
 * - text (not available - will need custom SVG or fallback)
 * - video-play (not available - can use 'play' as fallback)
 * - conversational (not available - will need custom SVG or fallback)
 * - on-demand (not available - will need custom SVG or fallback)
 * - current (not available - will need custom SVG or fallback)
 * - duration (not available - will need custom SVG or fallback)
 *
 * These icons appear to be used in custom overlays, layers, or admin UI.
 * They will fall back to default rendering or need custom SVG definitions.
 */

/**
 * To find all icon types used in the project, run:
 * grep -rh 'type="[^"]*"' app/Views app/Layouts resources/blocks resources/admin | grep -o 'type="[^"]*"' | sort -u
 *
 * If you add new icon types to your PHP templates or Vue/React components,
 * make sure to add them to the lazyPaths object above.
 */
