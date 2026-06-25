// Route components are lazy-loaded so each page (and its heavy deps — e.g.
// echarts + the world map, used only by Analytics) ships as its own chunk
// instead of being bundled into the admin entry. The landing route (Media)
// no longer pays for the analytics/settings code on first paint.

export default [
    {
        path: '/',
        name: 'medias',
        component: () => import('@/modules/medias/index.vue'),
        meta: {
            active_menu: 'medias',
            title: 'Media'
        },
    },
    {
        path: '/playlists',
        name: 'playlists',
        component: () => import('@/modules/playlist/index.vue'),
        meta: {
            active_menu: 'playlists',
            title: 'Playlists'
        }
    },
    {
        path: '/analytics',
        name: 'analytics',
        component: () => import('@/modules/analytics/index.vue'),
        meta: {
            active_menu: 'analytics',
            title: 'Analytics'
        },
        children: [
            {
                path: '',
                name: 'analytics.dashboard',
                component: () => import('@/modules/analytics/components/Dashboard.vue'),
            },
            {
                props: true,
                path: 'video/:id',
                name: 'analytics.video',
                component: () => import('@/modules/analytics/components/VideoAnalytics.vue'),
            },
            {
                props: true,
                path: 'user/:id',
                name: 'analytics.user',
                component: () => import('@/modules/analytics/components/UserAnalytics.vue'),
            }
        ]
    },
    {
        path: '/settings',
        name: 'settings',
        component: () => import('@/modules/settings/index.vue'),
        meta: {
            active_menu: 'settings',
            title: 'Settings'
        },
        children: [
            {
                path: '',
                name: 'settings.general',
                component: () => import('@/modules/settings/components/GeneralSettings.vue'),
            },
            {
                path: 'branding',
                name: 'settings.branding',
                component: () => import('@/modules/settings/components/BrandingSettings.vue'),
            },
            {
                path: 'licensing',
                name: 'settings.licensing',
                component: () => import('@/modules/settings/components/LicensingSettings.vue'),
            },
            {
                path: 'integrations',
                name: 'settings.integrations',
                component: () => import('@/modules/settings/components/IntegrationsSettings.vue'),
            },
            {
                path: 'integrations/:key',
                name: 'settings.integrations.config',
                component: () => import('@/modules/settings/components/IntegrationConfigPage.vue'),
            },
            {
                path: 'storage',
                name: 'settings.storage',
                component: () => import('@/modules/settings/components/StorageSettings.vue'),
            },
            {
                path: 'storage/:key',
                name: 'settings.storage.config',
                component: () => import('@/modules/settings/components/StorageConfigPage.vue'),
            },
            {
                path: 'youtube',
                name: 'settings.youtube',
                component: () => import('@/modules/settings/components/YoutubeSettings.vue'),
            },
            {
                path: 'analytics',
                name: 'settings.analytics',
                component: () => import('@/modules/settings/components/AnalyticsSettings.vue'),
            },
            {
                path: 'export',
                name: 'settings.export',
                component: () => import('@/modules/settings/components/ExportSettings.vue'),
            },
            {
                path: 'migration',
                name: 'settings.migration',
                component: () => import('@/modules/settings/components/migration/Index.vue'),
            }
        ]
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/components/NotFound.vue'),
    }
];
