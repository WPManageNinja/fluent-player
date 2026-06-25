/**
 * LanguageControls component for Fluent Player
 * Based on player/language-controls.php
 */

const LanguageControls = ({ settings, mediaId }) => {
    // Show language switcher only when explicitly enabled
    const showLanguageSwitcher = settings?.show_language_switcher === true;
    const languageMappings = settings?.language_mappings || [];

    if (!showLanguageSwitcher) {
        return null;
    }

    // Get language names from PHP Helper (via fluentPlayerBlockVars)
    const getLanguageNames = () => {
        return window.fluentPlayerBlockVars?.languages || {};
    };

    // Get language flags from PHP Helper (via fluentPlayerBlockVars)
    const getLanguageFlag = (langCode) => {
        const languageFlags = window.fluentPlayerBlockVars?.languageFlags || {};

        // First try direct match
        if (languageFlags[langCode] && languageFlags[langCode].flag) {
            return languageFlags[langCode].flag;
        }

        // Fallback: try to match by base language code
        const baseLangCode = langCode.split('_')[0];
        for (const [code, data] of Object.entries(languageFlags)) {
            if (data.code === baseLangCode) {
                return data.flag;
            }
        }

        // Default flag for unknown languages
        return '🌐';
    };

    const languageNames = getLanguageNames();
    const originalLanguage = settings?.language || 'en_US';
    const originalLanguageName = languageNames[originalLanguage] || originalLanguage;

    // Get current language info for button display
    let currentLanguageFlag = getLanguageFlag(originalLanguage);
    let currentLanguageCode = originalLanguage.split('_')[0].toUpperCase();

    // Check if we're viewing a mapped language
    const currentMapping = languageMappings.find(mapping => mapping.media_id == mediaId);
    if (currentMapping) {
        const mappedLangCode = currentMapping.language;
        currentLanguageFlag = getLanguageFlag(mappedLangCode);
        currentLanguageCode = mappedLangCode.split('_')[0].toUpperCase();
    }

    return (
        <media-controls className="fluent-player-language-controls">
            <media-menu className="fluent-player-language-menu">
                <media-menu-button
                    className="fluent-player-language-button fluent-player-language-button--styled"
                    aria-label="Language"
                    style={{
                        display: 'inline-flex',
                        position: 'absolute',
                        right: '16px',
                        top: '16px',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px',
                        width: 'auto',
                        height: 'auto',
                        minWidth: '80px',
                        padding: '8px 16px',
                        color: 'white',
                        background: 'rgba(0, 0, 0, 0.16)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '24px',
                        marginRight: '0',
                        cursor: 'pointer',
                        userSelect: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        appearance: 'none',
                        outline: 'none',
                        touchAction: 'manipulation',
                        WebkitUserSelect: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}
                >
                    <span
                        className="fluent-player-language-flag"
                        style={{
                            fontSize: '18px',
                            lineHeight: 1,
                            filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))'
                        }}
                    >{currentLanguageFlag}</span>
                    <span
                        className="fluent-player-language-code"
                        style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.8px',
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                        }}
                    >{currentLanguageCode}</span>
                    <media-icon
                        className="fluent-player-language-icon"
                        type="chevron-down"
                        style={{
                            width: '14px',
                            height: '14px',
                            opacity: 0.7,
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            marginLeft: '2px'
                        }}
                    ></media-icon>
                </media-menu-button>
                <media-menu-items
                    className="fluent-player-language-menu-items"
                    placement="bottom"
                    offset="8"
                    style={{
                        top: 'calc(20px + var(--media-menu-y-offset, 0px))',
                        right: '16px',
                        left: 'auto',
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                        minWidth: '280px',
                        padding: '8px',
                        maxHeight: '300px'
                    }}
                >
                    <media-radio-group
                        className="fluent-player-language-radio-group fluent-player-language-switcher-radio-group"
                        aria-label="Language Options"
                        data-media-id={mediaId}
                        value={mediaId}
                    >
                        {/* Current media with its assigned language */}
                        <media-radio
                            className="fluent-player-language-radio"
                            value={settings?.ID || mediaId}
                            data-lang={originalLanguage}
                            data-checked={mediaId == (settings?.ID || mediaId) ? true : undefined}
                        >
                            <span className="fluent-player-language-flag-option">{getLanguageFlag(originalLanguage)}</span>
                            <span className="fluent-player-language-radio-label">{originalLanguageName}</span>
                            <media-icon className="fluent-player-language-radio-icon" type="check"></media-icon>
                        </media-radio>

                        {/* Mapped languages (other videos) */}
                        {languageMappings.length > 0 ? (
                            languageMappings.map((mapping, index) => {
                                const mediaIdValue = mapping.media_id;
                                const langCode = mapping.language;

                                if (!mediaIdValue || !langCode) return null;

                                const languageName = languageNames[langCode] || langCode;
                                const languageFlag = getLanguageFlag(langCode);

                                return (
                                    <media-radio
                                        key={index}
                                        className="fluent-player-language-radio"
                                        value={mediaIdValue}
                                        data-lang={langCode}
                                        data-checked={mediaId == mediaIdValue ? true : undefined}
                                    >
                                        <span className="fluent-player-language-flag-option">{languageFlag}</span>
                                        <span className="fluent-player-language-radio-label">{languageName}</span>
                                        <media-icon className="fluent-player-language-radio-icon" type="check"></media-icon>
                                    </media-radio>
                                );
                            })
                        ) : (
                            /* Show a placeholder when no mappings are configured */
                            <media-radio
                                className="fluent-player-language-radio"
                                value="demo-spanish"
                                data-lang="es_ES"
                                disabled
                            >
                                <span className="fluent-player-language-flag-option">🇪🇸</span>
                                <span className="fluent-player-language-radio-label">Spanish (Demo - Configure in settings)</span>
                                <media-icon className="fluent-player-language-radio-icon" type="check"></media-icon>
                            </media-radio>
                        )}
                    </media-radio-group>
                </media-menu-items>
            </media-menu>
        </media-controls>
    );
};

export default LanguageControls;
