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
                meta: '‹'
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
                action: () => copyText(playerUrl)
            });
        }

        if (config.items.copy_link_at_time && this.adapter?.canCopyPlaybackUrlAtTime?.(surface)) {
            items.push({
                label: $t('Copy Link at Current Time'),
                action: () => copyText(this.adapter?.buildPlaybackUrl?.(surface, { includeTime: true }) || '')
            });
        }

        if (config.items.loop && this.adapter?.supportsLoop?.(surface)) {
            items.push({
                label: $t('Loop'),
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
                meta: `${currentRate}x`
            });
        }

        if (config.items.captions) {
            const captionTracks = this.adapter?.getCaptionTracks?.(surface) || [];
            if (captionTracks.length === 1) {
                items.push({
                    label: $t('Captions'),
                    role: 'menuitemcheckbox',
                    checked: !!captionTracks[0].selected,
                    action: () => this.adapter?.toggleSingleCaptionTrack?.(surface)
                });
            } else if (captionTracks.length > 1) {
                items.push({
                    type: 'submenu',
                    view: 'captions',
                    label: $t('Captions')
                });
            }
        }

        if (config.items.pip && this.adapter?.canTogglePictureInPicture?.(surface)) {
            items.push({
                label: $t('Picture-in-Picture'),
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
