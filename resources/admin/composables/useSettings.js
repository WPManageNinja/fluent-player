import Settings from '@/modules/settings/Settings.js';
import { computed, ref } from 'vue';

// Initialize the settings model once
const settings = Settings.init();
const isSettingsLoaded = ref(false);

const defaultPresetSlug = computed(() => {
    return settings.settings?.general?.default_preset || null;
});

// Whether settings differ from the last loaded/saved state
const isSettingsDirty = computed(() => settings.isDirty());

/**
 * Composable function to access settings
 *
 * @returns {Object} The initialized Settings model instance with loading state
 */
export function useSettings() {
    const loadSettings = async () => {
        if (!isSettingsLoaded.value) {
            try {
                await settings.get();
                isSettingsLoaded.value = true;
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        }
    };

    return {
        Settings: settings,
        loadSettings,
        isSettingsLoaded,
        isSettingsDirty,
        defaultPresetSlug
    };
}
