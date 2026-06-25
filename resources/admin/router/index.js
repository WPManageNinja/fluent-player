import { createRouter, createWebHashHistory } from 'vue-router';
import routes from '@/router/routes';
import Notify from "@/utils/Notify.js";

export default function (app) {
    
    const router = createRouter({
        history: createWebHashHistory(),
        strict: true,
        routes,
    });

    // Navigation guard to check analytics settings
    router.beforeEach(async (to, from, next) => {
        // Check if route is in analytics section
        if (to.matched.some(record => record.name === 'analytics' || record.name?.startsWith('analytics.'))) {
            const appVars = app.config.globalProperties.appVars || {};
            if (appVars.has_pro && !appVars.analytics?.enabled) {
                Notify.info('Analytics feature is disabled in settings');
                next({ name: 'settings.analytics' });
                return;
            }
        }
        
        next();
    });

    router.afterEach((to, from) => {
        const activeMenu = to.meta.active_menu;
        jQuery('.fplayer-menu li').removeClass('active-item');
        jQuery(`.fplayer-menu li.fplayer-item__${activeMenu}`).addClass('active-item');
        const title = to.meta.title || (activeMenu ? activeMenu.charAt(0).toUpperCase() + activeMenu.slice(1) : null);
        if (title) {
            jQuery('head title').text(`${title} - Fluent Player`);
        }
    });

    return router;
};