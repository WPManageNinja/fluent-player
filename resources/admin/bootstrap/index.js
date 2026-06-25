
if (fluentFrameworkAdmin && fluentFrameworkAdmin.asset_url) {
    const __webpack_public_path__ = fluentFrameworkAdmin.asset_url;
}
import { createApp } from 'vue';
import router from '@/router';
import mixins from '@/mixins';
import Rest from '@/utils/http/Rest.js';
import Application from "@/components/Application.vue";


const app = createApp(Application);

mixins.forEach(mixinObject => app.mixin(mixinObject));

app.config.globalProperties.appVars = fluentFrameworkAdmin;

app.use(router(app));

Rest.setInstance(app);

window.fluentFrameworkAdmin = window.fluentFrameworkAdmin || {};

export default app;
