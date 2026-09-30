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

    // WordPress sets the admin submenu highlight server-side on page load; hash-based
    // SPA navigation never reloads, so move `current` to match the active route.
    const syncAdminSubmenu = (activeMenu) => {
        const links = jQuery('#adminmenu .toplevel_page_fluent-player .wp-submenu li > a');
        if (!links.length) {
            return;
        }
        links.removeClass('current').removeAttr('aria-current');
        links.parent('li').removeClass('current');

        const active = links.filter(function () {
            const href = jQuery(this).attr('href') || '';
            // Media is the plain page link with no hash route; the rest carry `#/<key>`.
            return activeMenu === 'medias' ? !href.includes('#/') : href.includes(`#/${activeMenu}`);
        }).first();
        active.addClass('current').attr('aria-current', 'page');
        active.parent('li').addClass('current');
    };

    router.afterEach((to, from) => {
        const activeMenu = to.meta.active_menu;
        jQuery('.fplayer-menu li').removeClass('active-item');
        jQuery(`.fplayer-menu li.fplayer-item__${activeMenu}`).addClass('active-item');
        syncAdminSubmenu(activeMenu);
        const title = to.meta.title || (activeMenu ? activeMenu.charAt(0).toUpperCase() + activeMenu.slice(1) : null);
        if (title) {
            jQuery('head title').text(`${title} - Fluent Player`);
        }
    });

    return router;
};