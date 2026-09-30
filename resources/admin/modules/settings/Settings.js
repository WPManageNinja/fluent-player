import Model from '@/modules/Model.js';
import Rest from '@/utils/http/Rest.js';
import Notify from "@/utils/Notify.js";

class Settings extends Model {
    data = {
        settings: {
            // Initialize with empty objects that will be filled after loading
            general: {},
            youtube: {},
            vimeo: {},
            performance: {},
            analytics: {},
            google_analytics: {},
            branding: {},
        },
        errors: {},
        // JSON snapshot of the last loaded/saved settings, used for dirty tracking
        savedSnapshot: '',
        isBusy: {
            saving: false,
            loading: false,
        }
    };

    // Default settings - used as fallback and for resetting
    defaults = {
        general: {
            default_aspect_ratio: 'original',
            resume_playback: true,
            pause_others_on_play: true,
            custom_css: '',
        },
        youtube: {
            privacy_mode: false,
            show_subscribe_button: false,
        },
        vimeo: {
            privacy_mode: true,
        },
        performance: {},
        analytics: {
            enabled: false,
            auto_cleanup: {
                enabled: true,
                days: 30,
            },
        },
        google_analytics: {
            enabled: false,
            use_existing_tag: false,
            measurement_id: '',
        },
        branding: {
            brand_color: '#DD1F13',
            control_bar_color: '#171717A6',
            logo_url: '',
            logo_link: '',
            logo_position: 'top-right',
            logo_width: 100,
        },
    };

    /**
     * Load all settings from the server
     */
    get() {
        this.isBusy.loading = true;

        return Rest.get('settings')
            .then(response => {
                if (response && response.settings) {
                    let settings = response.settings;

                    // Parse settings if it's a string
                    if (typeof settings === 'string') {
                        try {
                            settings = JSON.parse(settings);
                        } catch (e) {
                            console.error('Error parsing settings JSON:', e);
                        }
                    }

                    // Merge with defaults to ensure all properties exist
                    this.settings = this.deepMerge(this.defaults, settings);
                } else {
                    // Use defaults if no settings were returned
                    this.settings = this.deepMerge({}, this.defaults);
                }

                this.takeSnapshot();
            })
            .then(() => {
                return this.settings;
            })
            .catch(error => {
                console.error('Error loading settings:', error);
                Notify.error('Failed to load settings');

                // Use defaults on error
                this.settings = this.deepMerge({}, this.defaults);
                this.takeSnapshot();
                throw error;
            })
            .finally(() => {
                this.isBusy.loading = false;
            });
    }

    /**
     * Capture the current settings as the last persisted state
     */
    takeSnapshot() {
        this.savedSnapshot = JSON.stringify(this.settings);
    }

    /**
     * Whether settings differ from the last loaded/saved state
     */
    isDirty() {
        if (!this.savedSnapshot) {
            return false;
        }

        return JSON.stringify(this.settings) !== this.savedSnapshot;
    }

    /**
     * Revert settings to the last loaded/saved state
     */
    discard() {
        if (this.savedSnapshot) {
            this.settings = JSON.parse(this.savedSnapshot);
        }
    }

    // Helper method for deep merging objects
    deepMerge(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
                result[key] = this.deepMerge(target[key], source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }

    /**
     * Save all settings to the server
     */
    save() {
        this.isBusy.saving = true;

        // Create a copy of settings without integrations
        const settingsToSave = { ...this.settings };
        delete settingsToSave.integrations;

        // Save main settings
        return Rest.put('settings', {
            settings: settingsToSave
        })
            .then(response => {
                return response;
            })
            .then(response => {
                // Adopt the server's sanitized values so dirty tracking and discard
                // match what was persisted. Merge keeps client-only sections (e.g.
                // integrations) the server response omits.
                if (response && response.settings && typeof response.settings === 'object') {
                    this.settings = this.deepMerge(this.settings, response.settings);
                }
                this.takeSnapshot();
                Notify.success(response.message || 'Settings saved successfully');
                return response;
            })
            .catch(error => {
                console.error('Error saving settings:', error);
                Notify.error(error.message || 'Failed to save settings');
                throw error;
            })
            .finally(() => {
                this.isBusy.saving = false;
            });
    }
}

export default Settings;
