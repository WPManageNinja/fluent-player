<script setup>
    import { onMounted, onBeforeUnmount, ref, computed, unref, markRaw } from 'vue';
    import { ArrowRight } from '@element-plus/icons-vue';
    import { useSettings } from '@/composables/useSettings.js';
    import Notify from '@/utils/Notify';
    import { FEATURES, useProFeatures } from '@/composables/useFeatures.js';
    import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router';
    import AdminNotice from '@/components/AdminNotice.vue';
    import IconGeneral from '@/components/icons/settings/IconGeneral.vue';
    import IconBranding from '@/components/icons/settings/IconBranding.vue';
    import IconIntegrations from '@/components/icons/settings/IconIntegrations.vue';
    import IconStorage from '@/components/icons/settings/IconStorage.vue';
    import IconYoutube from '@/components/icons/settings/IconYoutube.vue';
    import IconPerformance from '@/components/icons/settings/IconPerformance.vue';
    import IconSettingsAnalytics from '@/components/icons/settings/IconSettingsAnalytics.vue';
    import IconExport from '@/components/icons/settings/IconExport.vue';
    import IconMigration from '@/components/icons/settings/IconMigration.vue';
    import IconLicensing from '@/components/icons/settings/IconLicensing.vue';
    import IconSidebar from '@/components/icons/settings/IconSidebar.vue';
    import Storage from '@/utils/Storage.js';
    import { toggleAnalyticsMenu } from '@/utils/analyticsMenu.js';

    const router = useRouter();
    const route = useRoute();
    const { Settings, loadSettings, isSettingsLoaded, isSettingsDirty } = useSettings();
    const { hasFeature } = useProFeatures();

    const loading = ref(false);
    const saving = ref(false);
    const routerViewChild = ref(null);
    const sidebarOpen = ref(false);
    const isSidebarCollapsed = ref(Storage.get('fplayer_sidebar_collapsed', 'false') === 'true');
    const isMenuHovered = ref(false);

    const toggleSidebar = () => {
        isSidebarCollapsed.value = !isSidebarCollapsed.value;
        Storage.set('fplayer_sidebar_collapsed', isSidebarCollapsed.value);
    };
    const toggleMobileMenu = () => { sidebarOpen.value = !sidebarOpen.value; };
    const closeMobileMenu = () => { sidebarOpen.value = false; };
    const navigateToTab = (path) => {
        router.push(path);
        closeMobileMenu();
    };

    const baseTabs = [
	    { id: FEATURES.GENERAL, name: 'General Settings', label: 'General', path: '/settings', icon: markRaw(IconGeneral) },
	    { id: FEATURES.BRANDING, name: 'Branding Settings', label: 'Branding', path: '/settings/branding', icon: markRaw(IconBranding) },
	    { id: FEATURES.INTEGRATIONS, name: 'Integrations', label: 'Integrations', path: '/settings/integrations', icon: markRaw(IconIntegrations) },
	    { id: FEATURES.STORAGE, name: 'Storage', label: 'Storage', path: '/settings/storage', icon: markRaw(IconStorage) },
	    { id: FEATURES.YOUTUBE, name: 'YouTube Settings', label: 'YouTube', path: '/settings/youtube', icon: markRaw(IconYoutube) },
	    { id: FEATURES.ANALYTICS, name: 'Analytics Settings', label: 'Analytics', path: '/settings/analytics', icon: markRaw(IconSettingsAnalytics) },
	    { id: FEATURES.EXPORT, name: 'Export', label: 'Export', path: '/settings/export', icon: markRaw(IconExport) },
    ];

    const tabs = computed(() => {
        const items = [...baseTabs];
        if (window.fluentFrameworkAdmin?.show_migration) {
            items.push({ id: FEATURES.MIGRATION, name: 'Migration', label: 'Migration', path: '/settings/migration', icon: markRaw(IconMigration) });
        }
        if (window.fluentFrameworkAdmin?.has_pro && window.fluentFrameworkAdmin?.licensing?.enabled) {
            items.push({ id: FEATURES.LICENSING, name: 'Licensing', label: 'Licensing', path: '/settings/licensing', icon: markRaw(IconLicensing) });
        }
        return items;
    });

    const activeTab = computed(() => {
        const name = route.name || '';
        if (typeof name === 'string' && name.startsWith('settings.')) {
            const parts = name.replace('settings.', '').split('.');
            return parts[0];
        }
        return 'general';
    });

    const activePath = computed(() => {
        // Match parent path for sub-pages (e.g., /settings/storage/bunnycdn_storage → /settings/storage)
        const tab = tabs.value.find(t => route.path.startsWith(t.path) && t.path !== '/settings');
        return tab ? tab.path : (route.path === '/settings' ? '/settings' : route.path);
    });

    const isConfigPage = computed(() => {
        const name = route.name || '';
        return name.endsWith('.config');
    });

    const currentTab = computed(() => tabs.value.find(tab => tab.id === activeTab.value));

    const configPageName = computed(() => {
        if (!isConfigPage.value) return '';
        const child = routerViewChild.value;
        if (!child?.configName) return formatKey(route.params.key);
        return unref(child.configName) || formatKey(route.params.key);
    });

    const formatKey = (key) => {
        if (!key) return '';
        return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    // Warn via the native browser prompt when reloading/closing with unsaved changes
    const handleBeforeUnload = (event) => {
	    if (isSettingsDirty.value) {
		    event.preventDefault();
		    event.returnValue = '';
	    }
    };

    onMounted(() => {
	    window.addEventListener('beforeunload', handleBeforeUnload);

	    if (!isSettingsLoaded.value) {
		    loadSettings()
			    .then(() => {
				    tabs.value.forEach(tab => {
					    if (!Settings.settings[tab.id]) {
						    Settings.settings[tab.id] = {};
					    }
				    });
				    // Re-snapshot so tab backfill above doesn't count as a user change
				    Settings.takeSnapshot();
			    })
			    .catch(error => {
				    Notify.error('Failed to load settings');
			    })
			    .finally(() => {
				    loading.value = false;
			    });
	    }
    });

    onBeforeUnmount(() => {
	    window.removeEventListener('beforeunload', handleBeforeUnload);
    });

    // Validate settings before saving; returns false (and notifies) when invalid
    const validateSettings = () => {
	    const gaSettings = Settings.settings.google_analytics || {};
	    const isGAEnabled = gaSettings.enabled === true || gaSettings.enabled === 'true';
	    const useExistingTag = gaSettings.use_existing_tag === true || gaSettings.use_existing_tag === 'true';
	    const measurementId = gaSettings.measurement_id;
	    const isProActive = window.fluentFrameworkAdmin?.has_pro;

	    if (isProActive && isGAEnabled && !useExistingTag && !measurementId) {
		    Notify.error('Measurement ID is required when Google Analytics is enabled and not using an existing tag');
		    return false;
	    }

	    return true;
    };

    const persistSettings = async () => {
	    await Settings.save();
	    // Persist analytics enabled state so revert won't undo analytics menu link
	    const appVars = window.fluentFrameworkAdmin || {};
	    if (!appVars.analytics) appVars.analytics = {};
	    appVars.analytics.enabled = !!Settings.settings?.analytics?.enabled;
    };

    // Save all settings
    const saveSettings = async () => {
	    saving.value = true;

	    // Delegate to config page component if on a config sub-page
	    if (isConfigPage.value && routerViewChild.value?.save) {
		    try {
			    await routerViewChild.value.save();
		    } catch (error) {
			    console.error('Failed to save:', error);
		    } finally {
			    saving.value = false;
		    }
		    return;
	    }

	    if (!validateSettings()) {
            saving.value = false;
            router.push({ name: 'settings.analytics' });
            return;
        }
        try {
            await persistSettings();
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            saving.value = false;
        }
    };

    // Unsaved-changes guard: ask before leaving the settings area with pending edits
    const showUnsavedDialog = ref(false);
    const dialogSaving = ref(false);
    let resolveLeave = null;

    const finishLeaveDialog = (shouldLeave) => {
	    const resolve = resolveLeave;
	    resolveLeave = null;
	    showUnsavedDialog.value = false;
	    if (resolve) resolve(shouldLeave);
    };

    const discardAndLeave = () => {
	    Settings.discard();
	    // Re-sync the Analytics nav link to the restored value, since
	    // AnalyticsSettings may be unmounted (e.g. discarding from another tab).
	    toggleAnalyticsMenu(!!Settings.settings?.analytics?.enabled);
	    finishLeaveDialog(true);
    };

    const saveAndLeave = async () => {
	    if (!validateSettings()) {
		    finishLeaveDialog(false);
		    router.push({ name: 'settings.analytics' });
		    return;
	    }

	    dialogSaving.value = true;
	    try {
		    await persistSettings();
		    finishLeaveDialog(true);
	    } catch (error) {
		    // Keep the dialog open; edits stay intact and the model already notified
		    console.error('Failed to save settings:', error);
	    } finally {
		    dialogSaving.value = false;
	    }
    };

    onBeforeRouteLeave(() => {
	    if (!isSettingsDirty.value) {
		    return true;
	    }

	    showUnsavedDialog.value = true;

	    return new Promise((resolve) => {
		    resolveLeave = resolve;
	    });
    });
	const hasSaveButton = (tabId) => {
		if (isConfigPage.value) return true;
		return ![FEATURES.STORAGE, FEATURES.EXPORT, FEATURES.INTEGRATIONS, FEATURES.MIGRATION, FEATURES.LICENSING].includes(tabId);
	}
</script>

<template>
    <div class="fplayer-admin-page fplayer-admin-page-settings">
        <div class="fplayer-page-settings-layout" :class="{ 'fplayer-settings-sidebar-open': sidebarOpen, 'is-collapsed': isSidebarCollapsed }">
            <!-- Backdrop (visible when sidebar open on small screens) -->
            <div
                v-if="sidebarOpen"
                class="fplayer-settings-sidebar-backdrop"
                aria-hidden="true"
                @click="closeMobileMenu"
            />
            <!-- Sidebar Navigation -->
            <div
                id="fplayer-settings-sidebar"
                class="fplayer-settings-sidebar"
                :class="{ 'fplayer-settings-sidebar-open': sidebarOpen, 'is-collapsed': isSidebarCollapsed, 'is-hover-expanded': isMenuHovered }"
            >
                <!-- Sticky header with collapse toggle (desktop) -->
                <div class="fplayer-settings-sidebar-header" :class="{ 'is-collapsed': isSidebarCollapsed }">
                    <el-tooltip :enterable="false" :transition="'none'" :content="isSidebarCollapsed ? 'Open Sidebar' : 'Close Sidebar'" placement="right">
                        <button
                            type="button"
                            class="fplayer-settings-sidebar-toggle"
                            :aria-label="isSidebarCollapsed ? 'Open settings sidebar' : 'Close settings sidebar'"
                            :aria-expanded="!isSidebarCollapsed"
                            aria-controls="fplayer-settings-sidebar"
                            @click="toggleSidebar"
                            @keydown.enter.prevent="toggleSidebar"
                            @keydown.space.prevent="toggleSidebar"
                        >
                            <IconSidebar :size="20" />
                        </button>
                    </el-tooltip>
                    <div class="fplayer-settings-sidebar-header-title">Settings</div>
                </div>

                <!-- Navigation menu -->
                <el-menu
                    :router="true"
                    :default-active="activePath"
                    class="fplayer-settings-el-menu"
                    @mouseenter="isMenuHovered = true"
                    @mouseleave="isMenuHovered = false"
                >
                    <el-menu-item
                        v-for="tab in tabs"
                        :key="tab.id"
                        :index="tab.path"
                        :tabindex="0"
                        role="link"
                        :aria-current="activePath === tab.path ? 'page' : undefined"
                        @click="closeMobileMenu"
                        @keydown.enter.prevent="navigateToTab(tab.path)"
                        @keydown.space.prevent="navigateToTab(tab.path)"
                    >
                        <component :is="tab.icon" :size="20" class="fplayer-menu-icon" />
                        <span class="fplayer-menu-title">
                            {{ tab.label }}
                        </span>
                    </el-menu-item>
                </el-menu>
            </div>

            <!-- Main Content Area -->
            <div class="fplayer-page-settings-content">
                <!-- Sub Top Bar -->
                <div class="fplayer-settings-top-bar" v-if="!loading">
                    <button
                        type="button"
                        class="fplayer-settings-sidebar-toggle fplayer-settings-menu-toggle-open"
                        aria-label="Toggle settings menu"
                        :aria-expanded="sidebarOpen"
                        aria-controls="fplayer-settings-sidebar"
                        @click="toggleMobileMenu"
                        @keydown.enter.prevent="toggleMobileMenu"
                        @keydown.space.prevent="toggleMobileMenu"
                    >
                        <IconSidebar :size="20" />
                    </button>
                    <div class="fplayer-settings-top-bar-left">
                        <h2 v-if="isConfigPage" class="fplayer-settings-breadcrumb">
                            <router-link :to="{ name: 'settings.' + activeTab }" class="fplayer-breadcrumb-parent">{{ currentTab?.name }}</router-link>
                            <el-icon class="fplayer-breadcrumb-separator"><ArrowRight /></el-icon>
                            <span class="fplayer-breadcrumb-current">{{ configPageName }}</span>
                        </h2>
                        <h2 v-else>{{ currentTab?.name }}</h2>
                    </div>

                     <el-button
                        v-if="hasFeature(activeTab) && hasSaveButton(activeTab)"
                        type="primary"
                        class="fplayer-primary-btn fplayer-settings-save-btn"
                        @click="saveSettings"
                        :loading="saving"
                    >
                        {{ $t('Save Settings') }}
                    </el-button>
                </div>

                <div class="fplayer-settings-content-body">
                    <AdminNotice />
                    <!-- Loading state -->
                    <div v-if="loading" class="fplayer-settings-loading">
                        <el-skeleton :rows="10" animated />
                    </div>

                    <!-- Content -->
                    <template v-else>
	                    <router-view v-slot="{ Component }">
		                    <component
			                    :is="Component"
			                    ref="routerViewChild"
			                    v-bind="isConfigPage ? {} : { settings: Settings.settings?.[activeTab] || {} }"
			                    v-on="isConfigPage ? {} : { 'update:settings': (newValue) => Settings.settings[activeTab] = newValue }"
		                    />
	                    </router-view>
                    </template>
                </div>
            </div>
        </div>

        <!-- Unsaved changes confirmation -->
        <el-dialog
            v-model="showUnsavedDialog"
            :title="$t('Unsaved Changes')"
            width="480px"
            class="fplayer-unsaved-changes-modal"
            append-to-body
            :close-on-click-modal="!dialogSaving"
            :close-on-press-escape="!dialogSaving"
            @close="finishLeaveDialog(false)"
        >
            <p>{{ $t('You have unsaved changes in Settings. What would you like to do?') }}</p>
            <template #footer>
                <el-button
                    class="fplayer-secondary-btn"
                    :disabled="dialogSaving"
                    @click="discardAndLeave"
                >
                    {{ $t('Discard') }}
                </el-button>
                <el-button
                    type="primary"
                    class="fplayer-primary-btn"
                    :loading="dialogSaving"
                    @click="saveAndLeave"
                >
                    {{ $t('Save & Continue') }}
                </el-button>
            </template>
        </el-dialog>
    </div>
</template>
