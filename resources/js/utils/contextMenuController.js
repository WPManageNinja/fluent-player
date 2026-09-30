import $t from '../translator.js';

const DEFAULT_CONTEXT_MENU_CONFIG = {
    enabled: true,
    items: {
        copy_link: true,
        copy_link_at_time: true,
        loop: true,
        playback_speed: true,
        captions: true,
        pip: true
    }
};

const DEFAULT_SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const FP_LOGO_ICON = '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M28.8 0H3.2C1.43269 0 0 1.43269 0 3.2V28.8C0 30.5673 1.43269 32 3.2 32H28.8C30.5673 32 32 30.5673 32 28.8V3.2C32 1.43269 30.5673 0 28.8 0Z" fill="#DD1F13"/><path d="M19.2289 11.3156L11.9206 7.09616C10.5631 6.31241 8.86624 7.29209 8.86624 8.85959V13.7716C8.86624 15.3391 10.5631 16.3188 11.9206 15.535L19.2289 11.3156ZM22.7029 18.6774C24.7644 17.4872 24.7644 14.5115 22.7028 13.3213C22.488 13.1973 22.2234 13.1973 22.0086 13.3213L10.1126 20.1895C9.34137 20.6348 8.86624 21.4577 8.86624 22.3483C8.86624 24.2673 10.9436 25.4667 12.6054 24.5072L22.7029 18.6774Z" fill="white"/></svg>';

const ICONS = {
    link: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M18.364 15.536L16.95 14.12l1.414-1.414a5 5 0 0 0-7.071-7.071L9.878 7.05L8.464 5.636l1.414-1.414a7 7 0 0 1 9.9 9.9zm-2.829 2.828l-1.414 1.414a7 7 0 0 1-9.9-9.9l1.415-1.414L7.05 9.88l-1.414 1.414a5 5 0 0 0 7.07 7.071l1.415-1.414zm-.707-10.607l1.415 1.415l-7.072 7.07l-1.414-1.414z"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M6 4h15a1 1 0 0 1 1 1v7h-2V6H6v3L1 5l5-4zm12 16H3a1 1 0 0 1-1-1v-7h2v6h14v-3l5 4l-5 4z"/></svg>',
    speed: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M20 13c0 2.21-.895 4.21-2.343 5.657l1.414 1.414A9.97 9.97 0 0 0 22 13c0-5.523-4.477-10-10-10S2 7.477 2 13a9.97 9.97 0 0 0 2.929 7.071l1.414-1.414A8 8 0 1 1 20 13m-4.707-4.707l-4.5 4.5l1.414 1.414l4.5-4.5z"/></svg>',
    captions: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M21 3a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm-1 2H4v14h16zM9 8c1.104 0 2.105.448 2.829 1.173l-1.414 1.414a2 2 0 1 0 0 2.828l1.413 1.413A4.001 4.001 0 0 1 5 12c0-2.208 1.792-4 4-4m7 0c1.105 0 2.105.448 2.829 1.173l-1.414 1.414a2 2 0 1 0 0 2.828l1.413 1.413A4.001 4.001 0 0 1 12 12c0-2.208 1.792-4 4-4"/></svg>',
    pip: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M21 3a1 1 0 0 1 1 1v7h-2V5H4v14h6v2H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm0 10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1zm-1 2h-6v4h6zM6.707 6.293l2.25 2.25L11 6.5V12H5.5l2.043-2.043l-2.25-2.25z"/></svg>',
    back: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M7.828 11H20v2H7.828l5.364 5.364l-1.414 1.414L4 12l7.778-7.778l1.414 1.414z"/></svg>'
};

function toBoolean(value, fallback = false) {
    return typeof value === 'boolean' ? value : fallback;
}

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

async function copyText(text) {
    if (!text) {
        return false;
    }

    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (_) {
        // Fall back to the legacy copy path below.
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';

    document.body.appendChild(textarea);
    textarea.select();

    let copied = false;
    try {
        copied = document.execCommand('copy');
    } catch (_) {
        copied = false;
    }

    textarea.remove();

    return copied;
}

function createMenuButton(item) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fp-context-menu__item';
    button.setAttribute('role', item.role || 'menuitem');

    if (item.role === 'menuitemcheckbox') {
        button.setAttribute('aria-checked', item.checked ? 'true' : 'false');
    }

    if (item.icon) {
        const icon = document.createElement('span');
        icon.className = 'fp-context-menu__icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = item.icon;
        button.appendChild(icon);
    }

    const label = document.createElement('span');
    label.className = 'fp-context-menu__label';
    label.textContent = item.label;
    button.appendChild(label);

    if (item.checked) {
        const marker = document.createElement('span');
        marker.className = 'fp-context-menu__meta';
        marker.textContent = '✓';
        button.appendChild(marker);
    } else if (item.meta) {
        const meta = document.createElement('span');
        meta.className = 'fp-context-menu__meta';
        meta.textContent = item.meta;
        button.appendChild(meta);
    }

    return button;
}

function createBrandingFooter() {
    const footer = document.createElement('div');
    footer.className = 'fp-context-menu__footer';
    footer.setAttribute('role', 'presentation');

    const logo = document.createElement('span');
    logo.className = 'fp-context-menu__footer-logo';
    logo.setAttribute('aria-hidden', 'true');
    logo.innerHTML = FP_LOGO_ICON;

    const label = document.createElement('span');
    label.className = 'fp-context-menu__footer-label';
    label.textContent = $t('Powered by FluentPlayer');

    footer.appendChild(logo);
    footer.appendChild(label);

    return footer;
}

export function normalizeContextMenuConfig(config) {
    const items = config?.items || {};

    return {
        enabled: toBoolean(config?.enabled, DEFAULT_CONTEXT_MENU_CONFIG.enabled),
        items: {
            copy_link: toBoolean(items.copy_link, DEFAULT_CONTEXT_MENU_CONFIG.items.copy_link),
            copy_link_at_time: toBoolean(items.copy_link_at_time, DEFAULT_CONTEXT_MENU_CONFIG.items.copy_link_at_time),
            loop: toBoolean(items.loop, DEFAULT_CONTEXT_MENU_CONFIG.items.loop),
            playback_speed: toBoolean(items.playback_speed, DEFAULT_CONTEXT_MENU_CONFIG.items.playback_speed),
            captions: toBoolean(items.captions, DEFAULT_CONTEXT_MENU_CONFIG.items.captions),
            pip: toBoolean(items.pip, DEFAULT_CONTEXT_MENU_CONFIG.items.pip)
        }
    };
}

export default class ContextMenuController {
    constructor(adapter) {
        this.adapter = adapter;
        this.rootElement = adapter?.rootElement || null;
        this.menuElement = null;
        this.activeSurface = null;
        this.activePosition = null;
        this.currentView = 'root';

        this.handleContextMenu = this.handleContextMenu.bind(this);
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleWindowChange = this.handleWindowChange.bind(this);
    }

    init() {
        if (!this.rootElement) {
            return;
        }

        this.rootElement.addEventListener('contextmenu', this.handleContextMenu);
    }

    destroy() {
        if (this.rootElement) {
            this.rootElement.removeEventListener('contextmenu', this.handleContextMenu);
        }

        this.close();
    }

    handleContextMenu(event) {
        const surface = this.adapter?.getSurfaceFromTarget?.(event.target);
        if (!surface) {
            return;
        }

        const rootItems = this.getRootItems(surface);
        if (!rootItems.length) {
            return;
        }

        event.preventDefault();

        this.activeSurface = surface;
        this.activePosition = {
            x: event.clientX,
            y: event.clientY
        };
        this.currentView = 'root';

        this.render();
        this.bindGlobalListeners();
    }

    bindGlobalListeners() {
        document.addEventListener('pointerdown', this.handlePointerDown, true);
        document.addEventListener('keydown', this.handleKeyDown, true);
        window.addEventListener('resize', this.handleWindowChange, true);
        window.addEventListener('scroll', this.handleWindowChange, true);
    }

    unbindGlobalListeners() {
        document.removeEventListener('pointerdown', this.handlePointerDown, true);
        document.removeEventListener('keydown', this.handleKeyDown, true);
        window.removeEventListener('resize', this.handleWindowChange, true);
        window.removeEventListener('scroll', this.handleWindowChange, true);
    }

    handlePointerDown(event) {
        if (!this.menuElement) {
            return;
        }

        if (!this.menuElement.contains(event.target)) {
            this.close();
        }
    }

    handleKeyDown(event) {
        if (event.key !== 'Escape') {
            return;
        }

        event.preventDefault();
        this.close();
    }

    handleWindowChange() {
        this.close();
    }

    close() {
        this.unbindGlobalListeners();

        if (this.menuElement) {
            this.menuElement.remove();
            this.menuElement = null;
        }

        this.activeSurface = null;
        this.activePosition = null;
        this.currentView = 'root';
    }

    ensureMenuElement() {
        if (this.menuElement) {
            return this.menuElement;
        }

        const menu = document.createElement('div');
        menu.className = 'fp-context-menu';
        menu.setAttribute('role', 'menu');
        menu.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

        document.body.appendChild(menu);
        this.menuElement = menu;

        return menu;
    }

    render() {
        if (!this.activeSurface || !this.activePosition) {
            return;
        }

        const menu = this.ensureMenuElement();
        const items = this.getItemsForCurrentView();

        if (!items.length) {
            this.close();
            return;
        }

        menu.replaceChildren();

        if (this.currentView !== 'root') {
            const backButton = createMenuButton({
                label: $t('Back'),
                icon: ICONS.back
            });
            backButton.classList.add('fp-context-menu__item--back');
            backButton.addEventListener('click', () => {
                this.currentView = 'root';
                this.render();
            });
            menu.appendChild(backButton);
        }

        items.forEach((item) => {
            const button = createMenuButton(item);

            if (item.type === 'submenu') {
                button.classList.add('fp-context-menu__item--submenu');
            }

            button.addEventListener('click', async () => {
                if (item.type === 'submenu') {
                    this.currentView = item.view;
                    this.render();
                    return;
                }

                try {
                    await item.action?.();
                } finally {
                    this.close();
                }
            });

            menu.appendChild(button);
        });

        if (this.currentView === 'root' && (window.fluent_player?.show_powered_by ?? true)) {
            menu.appendChild(createBrandingFooter());
        }

        this.positionMenu(menu);
    }

    positionMenu(menu) {
        const { x, y } = this.activePosition;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

        menu.style.left = '0px';
        menu.style.top = '0px';

        requestAnimationFrame(() => {
            if (!this.menuElement) {
                return;
            }

            const rect = menu.getBoundingClientRect();
            const clampedLeft = Math.max(8, Math.min(x, viewportWidth - rect.width - 8));
            const clampedTop = Math.max(8, Math.min(y, viewportHeight - rect.height - 8));

            menu.style.left = `${clampedLeft}px`;
            menu.style.top = `${clampedTop}px`;
        });
    }

    getContextMenuConfig(surface) {
        return normalizeContextMenuConfig(this.adapter?.getContextMenuConfig?.(surface) || {});
    }

    getRootItems(surface) {
        const config = this.getContextMenuConfig(surface);
        if (!config.enabled) {
            return [];
        }

        const items = [];
        const playerUrl = this.adapter?.buildPlaybackUrl?.(surface, { includeTime: false });

        if (config.items.copy_link && playerUrl) {
            items.push({
                label: $t('Copy Link'),
                icon: ICONS.link,
                action: () => copyText(playerUrl)
            });
        }

        if (config.items.copy_link_at_time && this.adapter?.canCopyPlaybackUrlAtTime?.(surface)) {
            items.push({
                label: $t('Copy Link at Current Time'),
                icon: ICONS.link,
                action: () => copyText(this.adapter?.buildPlaybackUrl?.(surface, { includeTime: true }) || '')
            });
        }

        if (config.items.loop && this.adapter?.supportsLoop?.(surface)) {
            items.push({
                label: $t('Loop'),
                icon: ICONS.repeat,
                role: 'menuitemcheckbox',
                checked: !!this.adapter?.isLoopEnabled?.(surface),
                action: () => this.adapter?.setLoopEnabled?.(surface, !this.adapter?.isLoopEnabled?.(surface))
            });
        }

        if (config.items.playback_speed && this.adapter?.canSetPlaybackSpeed?.(surface)) {
            const currentRate = this.adapter?.getPlaybackRate?.(surface) || 1;
            items.push({
                type: 'submenu',
                view: 'speed',
                label: $t('Playback Speed'),
                icon: ICONS.speed,
                meta: `${currentRate}x`
            });
        }

        if (config.items.captions) {
            const captionTracks = this.adapter?.getCaptionTracks?.(surface) || [];
            if (captionTracks.length === 1) {
                items.push({
                    label: $t('Captions'),
                    icon: ICONS.captions,
                    role: 'menuitemcheckbox',
                    checked: !!captionTracks[0].selected,
                    action: () => this.adapter?.toggleSingleCaptionTrack?.(surface)
                });
            } else if (captionTracks.length > 1) {
                items.push({
                    type: 'submenu',
                    view: 'captions',
                    label: $t('Captions'),
                    icon: ICONS.captions
                });
            }
        }

        if (config.items.pip && this.adapter?.canTogglePictureInPicture?.(surface)) {
            items.push({
                label: $t('Picture-in-Picture'),
                icon: ICONS.pip,
                role: 'menuitemcheckbox',
                checked: !!this.adapter?.isPictureInPictureActive?.(surface),
                action: () => this.adapter?.togglePictureInPicture?.(surface)
            });
        }

        return items;
    }

    getItemsForCurrentView() {
        if (!this.activeSurface) {
            return [];
        }

        if (this.currentView === 'speed') {
            return this.getPlaybackSpeedItems(this.activeSurface);
        }

        if (this.currentView === 'captions') {
            return this.getCaptionItems(this.activeSurface);
        }

        return this.getRootItems(this.activeSurface);
    }

    getPlaybackSpeedItems(surface) {
        if (!this.adapter?.canSetPlaybackSpeed?.(surface)) {
            return [];
        }

        const currentRate = this.adapter?.getPlaybackRate?.(surface) || 1;
        const speedOptions = this.adapter?.getPlaybackSpeedOptions?.(surface) || DEFAULT_SPEED_OPTIONS;

        return speedOptions
            .filter((value) => isFiniteNumber(value) && value > 0)
            .map((value) => ({
                label: `${value}x`,
                role: 'menuitemcheckbox',
                checked: Math.abs(currentRate - value) < 0.01,
                action: () => this.adapter?.setPlaybackRate?.(surface, value)
            }));
    }

    getCaptionItems(surface) {
        const tracks = this.adapter?.getCaptionTracks?.(surface) || [];
        if (!tracks.length) {
            return [];
        }

        const items = [{
            label: $t('Off'),
            role: 'menuitemcheckbox',
            checked: !tracks.some((track) => track.selected),
            action: () => this.adapter?.setActiveCaptionTrack?.(surface, null)
        }];

        tracks.forEach((track) => {
            items.push({
                label: track.label,
                role: 'menuitemcheckbox',
                checked: !!track.selected,
                action: () => this.adapter?.setActiveCaptionTrack?.(surface, track.id)
            });
        });

        return items;
    }
}
