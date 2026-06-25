<template>
    <div class="fplayer-app-body">
	    <AdminNotice v-if="!isSettingsRoute" />
	    <router-view />
    </div>
</template>

<script>
import { initMobileNav } from '@/composables/useMobileNav';
import AdminNotice from '@/components/AdminNotice.vue';

export default {
    name: 'Application',
    components: { AdminNotice },
    data() {
        return {
            mobileNavCleanup: null
        };
    },
    computed: {
        isSettingsRoute() {
            const path = this.$route?.path;
            // Hard reload reports START_LOCATION ('/') until the lazy settings chunk resolves; fall back to the hash to avoid a full-width notice flash.
            if (typeof path === 'string' && path !== '/') {
                return path.startsWith('/settings');
            }
            const hash = (typeof window !== 'undefined' && window.location.hash) || '';
            return hash.replace(/^#/, '').startsWith('/settings');
        }
    },
    mounted() {
        jQuery('.notice-warning:not(.fluent-player-pro-notice), .notice-error:not(.fluent-player-pro-notice)').remove();
        const appRoot = this.$el?.closest('.fplayer-app') || this.$el?.closest('[id$="-app"]');
        this.mobileNavCleanup = initMobileNav(appRoot);
    },
    beforeUnmount() {
        if (typeof this.mobileNavCleanup === 'function') {
            this.mobileNavCleanup();
        }
    }
};
</script>
