/**
 * SettingsMenu component for Fluent Player
 * Enhanced with Playback, Accessibility, Quality, and Captions submenus
 */

const { useState, useCallback, useRef, useEffect } = wp.element;

const STORAGE_KEY = 'fluent_player_accessibility';
const A11Y_DEFAULTS = { announcements: false, 'keyboard-animations': true };

const loadA11yPrefs = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? { ...A11Y_DEFAULTS, ...JSON.parse(raw) } : { ...A11Y_DEFAULTS };
    } catch (e) {
        return { ...A11Y_DEFAULTS };
    }
};

const SettingsMenu = ({ settings = {} }) => {
    const { __ } = wp.i18n;
    const src = settings.src || '';
    const provider = settings.provider || '';
    const hasHls = provider === 'bunny' || provider === 'mux' || provider === 'mux_stream' || src.includes('.m3u8');
    const hasPro = !!window.fluentPlayerBlockVars?.hasPro;
    const hasSubtitles = settings.subtitles && settings.subtitles.length > 0;
    const controls = settings.controls || {};
    const presetSlug = settings.preset_slug || settings.slug || '';
    const isSimplePreset = presetSlug === 'simple';
    const hasPlayback = !isSimplePreset && controls.playback_speed !== false;
    const hasAccessibility = !isSimplePreset;
    const hasQuality = controls.quality !== false && hasHls;
    const hasCaptions = controls.captions_toggle !== false && ((hasPro && hasSubtitles) || hasHls) && !settings._hideCaptions;

    const [a11yPrefs, setA11yPrefs] = useState(loadA11yPrefs);
    const playerRef = useRef(null);

    const toggleA11y = useCallback((key) => {
        setA11yPrefs(prev => {
            const updated = { ...prev, [key]: !prev[key] };
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch (e) { /* quota */ }
            return updated;
        });
    }, []);

    // Apply keyboard-animations class to nearest media-player
    useEffect(() => {
        const el = playerRef.current;
        if (!el) return;
        const player = el.closest('media-player');
        if (player) {
            player.classList.toggle('fp-no-keyboard-animations', !a11yPrefs['keyboard-animations']);
        }
    }, [a11yPrefs['keyboard-animations']]);

    if (!hasPlayback && !hasAccessibility && !hasQuality && !hasCaptions) {
        return null;
    }

    return (
        <media-menu>
            <media-tooltip>
                <media-tooltip-trigger>
                    <media-menu-button class="fp-media-button">
                        <media-icon type="settings"></media-icon>
                    </media-menu-button>
                </media-tooltip-trigger>
                <media-tooltip-content class="fp-media-tooltip" placement="top">
                    <span>{__('Settings', 'fluent-player')}</span>
                </media-tooltip-content>
            </media-tooltip>
            <media-menu-items placement="top end">
                {/* Playback Submenu (Speed) */}
                {hasPlayback && (
                <media-menu>
                    <media-menu-button class="fp-media-menu-button">
                        <media-icon type="odometer"></media-icon>
                        <span className="fp-media-menu-button-label">{__('Playback', 'fluent-player')}</span>
                        <span className="fp-media-menu-button-hint" data-part="hint"></span>
                        <media-icon
                            class="fp-media-menu-button-open-icon"
                            type="chevron-right"
                        ></media-icon>
                    </media-menu-button>
                    <media-menu-items>
                        <media-speed-radio-group class="fp-media-radio-group">
                            <template>
                                <media-radio>
                                    <div className="fp-media-radio-check"></div>
                                    <span className="fp-media-radio-label" data-part="label"></span>
                                </media-radio>
                            </template>
                        </media-speed-radio-group>
                    </media-menu-items>
                </media-menu>
                )}

                {/* Accessibility Submenu */}
                {hasAccessibility && (
                <media-menu ref={playerRef}>
                    <media-menu-button class="fp-media-menu-button">
                        <media-icon type="accessibility"></media-icon>
                        <span className="fp-media-menu-button-label">{__('Accessibility', 'fluent-player')}</span>
                        <media-icon
                            class="fp-media-menu-button-open-icon"
                            type="chevron-right"
                        ></media-icon>
                    </media-menu-button>
                    <media-menu-items>
                        <div className="fp-menu-section">
                            <div className="fp-menu-item">
                                <div className="fp-menu-item-label">{__('Announcements', 'fluent-player')}</div>
                                <div
                                    className="fp-menu-checkbox"
                                    role="menuitemcheckbox"
                                    tabIndex="0"
                                    aria-label={__('Announcements', 'fluent-player')}
                                    aria-checked={a11yPrefs.announcements ? 'true' : 'false'}
                                    data-fp-toggle="announcements"
                                    onClick={() => toggleA11y('announcements')}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleA11y('announcements'); } }}
                                ></div>
                            </div>
                            <div className="fp-menu-item">
                                <div className="fp-menu-item-label">{__('Keyboard Animations', 'fluent-player')}</div>
                                <div
                                    className="fp-menu-checkbox"
                                    role="menuitemcheckbox"
                                    tabIndex="0"
                                    aria-label={__('Keyboard Animations', 'fluent-player')}
                                    aria-checked={a11yPrefs['keyboard-animations'] ? 'true' : 'false'}
                                    data-fp-toggle="keyboard-animations"
                                    onClick={() => toggleA11y('keyboard-animations')}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleA11y('keyboard-animations'); } }}
                                ></div>
                            </div>
                        </div>
                    </media-menu-items>
                </media-menu>
                )}

                {/* Quality Submenu */}
                {hasQuality && (
                <media-menu>
                    <media-menu-button class="fp-media-menu-button">
                        <media-icon type="settings"></media-icon>
                        <span className="fp-media-menu-button-label">{__('Quality', 'fluent-player')}</span>
                        <span className="fp-media-menu-button-hint" data-part="hint"></span>
                        <media-icon
                            class="fp-media-menu-button-open-icon"
                            type="chevron-right"
                        ></media-icon>
                    </media-menu-button>
                    <media-menu-items>
                        <media-quality-radio-group class="fp-media-radio-group">
                            <template>
                                <media-radio>
                                    <div className="fp-media-radio-check"></div>
                                    <span className="fp-media-radio-label" data-part="label"></span>
                                </media-radio>
                            </template>
                        </media-quality-radio-group>
                    </media-menu-items>
                </media-menu>
                )}

                {/* Captions Submenu */}
                {hasCaptions && (
                <media-menu class="fp-settings-captions-menu">
                    <media-menu-button class="fp-media-menu-button">
                        <media-icon type="subtitles"></media-icon>
                        <span className="fp-media-menu-button-label">{__('Captions', 'fluent-player')}</span>
                        <span className="fp-media-menu-button-hint" data-part="hint"></span>
                        <media-icon
                            class="fp-media-menu-button-open-icon"
                            type="chevron-right"
                        ></media-icon>
                    </media-menu-button>
                    <media-menu-items>
                        <media-captions-radio-group class="fp-media-radio-group">
                            <template>
                                <media-radio>
                                    <div className="fp-media-radio-check"></div>
                                    <span className="fp-media-radio-label" data-part="label"></span>
                                </media-radio>
                            </template>
                        </media-captions-radio-group>
                    </media-menu-items>
                </media-menu>
                )}
            </media-menu-items>
        </media-menu>
    );
};

export default SettingsMenu;
