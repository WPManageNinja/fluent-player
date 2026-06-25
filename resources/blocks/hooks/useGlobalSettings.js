
/**
 * WordPress dependencies
 */
const { useState, useEffect, useCallback } = wp.element;
const { apiFetch } = wp;

// Global cache to prevent multiple requests (TTL 5 min to allow refresh if settings change elsewhere)
const CACHE_TTL_MS = 5 * 60 * 1000;
let globalSettingsCache = null;
let globalSettingsCacheTime = null;
let globalSettingsPromise = null;

/**
 * Custom hook for managing global settings
 */
const useGlobalSettings = () => {
    const [globalSettings, setGlobalSettings] = useState(globalSettingsCache);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const blockVars = window.fluentPlayerBlockVars || {};
    const apiRequestPath = `${blockVars.rest?.namespace}/${blockVars.rest?.version}`;

    /**
     * Fetch global settings from server
     */
    const fetchGlobalSettings = useCallback(async () => {
        const now = Date.now();
        const cacheValid = globalSettingsCache && globalSettingsCacheTime && (now - globalSettingsCacheTime < CACHE_TTL_MS);
        if (cacheValid) {
            setGlobalSettings(globalSettingsCache);
            return globalSettingsCache;
        }

        if (globalSettingsPromise) {
            return globalSettingsPromise;
        }

        setLoading(true);
        setError(null);

        globalSettingsPromise = apiFetch({
            path: `${apiRequestPath}/settings`
        }).then(response => {
            globalSettingsCache = response.settings;
            globalSettingsCacheTime = Date.now();
            setGlobalSettings(response.settings);
            return response.settings;
        }).catch(err => {
            console.error('Error fetching global settings:', err);
            setError(err.message || 'Failed to load global settings');
            throw err;
        }).finally(() => {
            setLoading(false);
            globalSettingsPromise = null;
        });

        return globalSettingsPromise;
    }, [apiRequestPath]);

    /**
     * Get a specific setting value with dot notation
     */
    const getSetting = useCallback((key, defaultValue = null) => {
        const settings = globalSettings || globalSettingsCache;
        if (!settings) return defaultValue;

        const keys = key.split('.');
        let value = settings;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }

        return value;
    }, [globalSettings]);

    /**
     * Get brand color from global settings
     */
    const getBrandColor = useCallback(() => {
        return getSetting('branding.brand_color', '#DD1F13');
    }, [getSetting]);

    // Load settings on mount if not cached or cache expired
    useEffect(() => {
        const now = Date.now();
        const cacheValid = globalSettingsCache && globalSettingsCacheTime && (now - globalSettingsCacheTime < CACHE_TTL_MS);
        if (!cacheValid && !globalSettingsPromise) {
            fetchGlobalSettings();
        } else if (globalSettingsCache) {
            setGlobalSettings(globalSettingsCache);
        }
    }, [fetchGlobalSettings]);

    return {
        globalSettings: globalSettings || globalSettingsCache,
        loading,
        error,
        fetchGlobalSettings,
        getSetting,
        getBrandColor
    };
};

export default useGlobalSettings;