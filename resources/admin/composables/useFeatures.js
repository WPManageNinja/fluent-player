import { computed } from 'vue';
import __ from '@/utils/translator/Translator';


/**
 * Feature constants for easy reference
 */
export const FEATURES = {
    GENERAL: 'general',
    BRANDING: 'branding',
    LICENSING: 'licensing',
    YOUTUBE: 'youtube',
    PERFORMANCE: 'performance',
    PLAYLIST: 'playlist',
    ANALYTICS: 'analytics',
    INTEGRATIONS: 'integrations',
    EXPORT: 'export',
    MIGRATION: 'migration',
    PRESETS: 'presets',
    BROWSER_STORAGE: 'browser_storage',
    STORAGE: 'storage'
};

export const PRO_FEATURES = [
    FEATURES.LICENSING,
    FEATURES.PLAYLIST,
    FEATURES.ANALYTICS,
    FEATURES.INTEGRATIONS,
    FEATURES.BROWSER_STORAGE,
    FEATURES.PERFORMANCE,
    FEATURES.STORAGE
];

/**
 * Email providers that require Pro version
 */
export const PRO_EMAIL_PROVIDERS = [
    'mailchimp',
    'webhook'
];

/**
 * Composable for managing pro features across the application
 */
export function useProFeatures() {
    /**
     * Check if pro version is active
     */
    const isProActive = computed(() => {
        return !!window.fluentFrameworkAdmin?.has_pro;
    });

    /**
     * Get feature configurations for different modules
     */
    const getFeatureConfig = (featureType) => {
        const configs = {
            [FEATURES.PLAYLIST]: {
                title: __('Playlist is a Pro Feature'),
                description: __('Upgrade to Pro to create beautiful playlists with advanced features including:'),
                features: [
                    __('Unlimited playlists and media'),
                    __('Advanced playlist layouts and positioning'),
                    __('Shuffle and continuous play options'),
                    __('Full appearance customization'),
                    __('Playlist analytics and tracking'),
                    __('Playlist templates and presets'),
                    __('Advanced keyboard controls')
                ],
                upgradeUrl: getUpgradeUrl(FEATURES.PLAYLIST)
            },
            [FEATURES.ANALYTICS]: {
                title: __('Advanced Analytics With Pro'),
                description: __('Get detailed insights into your media performance with Advanced Analytics.'),
                features: [
                    __('Detailed viewer analytics'),
                    __('Watch time tracking'),
                    __('Engagement metrics'),
                    __('Geographic data'),
                    __('Device and browser statistics'),
                    __('Custom date ranges'),
                    __('Real-time monitoring')
                ],
                upgradeUrl: getUpgradeUrl(FEATURES.ANALYTICS)
            },
            [FEATURES.INTEGRATIONS]: {
                title: __('More Integrations With Pro'),
                description: __('Connect with powerful third-party services including:'),
                features: [
                    __('Mailchimp integration'),
                    __('Webhook integration'),
                ],
                upgradeUrl: getUpgradeUrl(FEATURES.INTEGRATIONS)
            },
            [FEATURES.BROWSER_STORAGE]: {
                title: __('Browser Progress Tracking With Pro'),
                description: __('Enhance user experience with browser-based progress tracking:'),
                features: [
                    __('Store playback progress in browser storage'),
                    __('Reduce server load with client-side tracking'),
                    __('Faster progress restoration'),
                    __('Better performance for high-traffic sites'),
                    __('Privacy-friendly local storage'),
                    __('Automatic cleanup of expired data'),
                    __('Works across browser sessions'),
                    __('No additional server requests needed')
                ],
                upgradeUrl: getUpgradeUrl(FEATURES.BROWSER_STORAGE)
            },
            [FEATURES.STORAGE]: {
                title: __('Advanced Storage With Pro'),
                description: __('Store or stream your media from external storage services:'),
                features: [
                    __('BunnyCDN Storage'),
                    __('BunnyCDN Stream'),
                    __('Mux Video'),
                    __('Mux Stream'),
                    __('Gumlet Video'),
                    __('Gumlet Stream'),
                    __('Cloudflare R2 Storage'),
                    __('Cloudflare Stream'),
                ],
                upgradeUrl: getUpgradeUrl(FEATURES.STORAGE)
            },
        };

        return configs[featureType] || {
            title: __('This is a Pro Feature'),
            description: __('Unlock advanced features and capabilities with FluentPlayer Pro.'),
            features: []
        };
    };

    /**
     * Check if a specific feature is available
     */
    const hasFeature = (featureName) => {
        if (isProActive.value) {
            return true;
        }

        return !PRO_FEATURES.includes(featureName)
    };

    /**
     * Get upgrade URL with optional feature tracking
     */
    const getUpgradeUrl = (feature = null) => {
        let url = 'https://fluentplayer.com/';

        if (feature) {
            url += `?feature=${encodeURIComponent(feature)}`;
        }

        return url;
    };

    /**
     * Show pro upgrade notification
     */
    const showUpgradeNotification = (featureName) => {
        // Placeholder for future toast notification
    };

    /**
     * Common pro feature gate function
     */
    const requiresPro = (featureName, callback = null) => {
        if (hasFeature(featureName)) {
            if (callback && typeof callback === 'function') {
                return callback();
            }
            return true;
        }

        showUpgradeNotification(featureName);
        return false;
    };

    /**
     * Check if an email provider is a pro feature
     */
    const isProEmailProvider = (providerKey) => {
        return PRO_EMAIL_PROVIDERS.includes(providerKey?.toLowerCase());
    };

    /**
     * Get pro feature config for email providers
     */
    const getEmailProviderProConfig = (providerName) => {
        const providerLower = providerName?.toLowerCase() || '';
        let features = [];

        if (providerLower.includes('mailchimp')) {
            features = [
                __('Connect with Mailchimp email marketing platform'),
            ];
        } else if (providerLower.includes('webhook')) {
            features = [
                __('Send emails to any external service via webhooks'),
            ];
        } else {
            features = [
                __('Advanced email marketing integration'),
                __('Automated subscriber management'),
                __('Custom webhook configurations'),
                __('Enhanced email capture capabilities'),
                __('Professional email marketing tools'),
                __('Advanced integration options')
            ];
        }

        return {
            title: __('%s is a Pro Feature', providerName),
            description: __('Upgrade to Pro to use %s integration for email capture.', providerName),
            features: features,
            upgradeUrl: getUpgradeUrl('email_capture')
        };
    };

    return {
        isProActive,
        hasFeature,
        getFeatureConfig,
        getUpgradeUrl,
        showUpgradeNotification,
        requiresPro,
        isProEmailProvider,
        getEmailProviderProConfig
    };
}
