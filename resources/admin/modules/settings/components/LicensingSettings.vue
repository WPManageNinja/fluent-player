<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElButton, ElIcon, ElInput } from 'element-plus';
import { CircleCheckFilled, WarningFilled, Lock, Refresh, DocumentCopy } from '@element-plus/icons-vue';
import Rest from '@/utils/http/Rest.js';
import Notify from '@/utils/Notify.js';
import ProUpgrade from '@/components/ProUpgrade.vue';
import { useProFeatures } from '@/composables/useFeatures.js';
import { useAdminNotices } from '@/composables/useAdminNotices';

const { setNotices } = useAdminNotices();

const syncNotices = (response) => {
    if (response && Array.isArray(response.admin_notices)) {
        setNotices(response.admin_notices);
    }
};

defineProps({
    settings: {
        type: Object,
        default: () => ({})
    }
});

const { isProActive, getUpgradeUrl } = useProFeatures();
const isLicensingEnabled = computed(() => !!window.fluentFrameworkAdmin?.licensing?.enabled);
const purchaseUrl = getUpgradeUrl('licensing');

const loading = ref(false);
const activating = ref(false);
const deactivating = ref(false);
const refreshing = ref(false);
const showNewLicenseInput = ref(false);
const errorMessage = ref('');
const license = ref(null);

const form = reactive({
    licenseKey: ''
});

const statusKey = computed(() => String(license.value?.status || 'unregistered'));

const hasLicense = computed(() => !!(license.value && license.value.license_key));

const maskedLicenseKey = computed(() => {
    const value = String(license.value?.license_key || '');
    if (!value) {
        return '';
    }

    if (value.length <= 8) {
        return value;
    }

    return `${value.slice(0, 4)}••••${value.slice(-4)}`;
});

const expiresLabel = computed(() => {
    const expires = String(license.value?.expires || '');
    if (!expires) {
        return 'Not available';
    }

    return expires === 'lifetime' ? 'Lifetime' : expires;
});

const renewUrl = computed(() => license.value?.renew_url || purchaseUrl);

const showActivateButton = computed(() => {
    if (statusKey.value === 'valid') {
        return false;
    }

    return statusKey.value !== 'expired' || showNewLicenseInput.value;
});

const activateButtonLabel = computed(() => (statusKey.value === 'expired' ? 'Renew License' : 'Activate License'));

const loadLicense = async (forceRefresh = false) => {
    loading.value = !forceRefresh;
    refreshing.value = forceRefresh;
    errorMessage.value = '';

    try {
        const response = await Rest.get('settings/license', forceRefresh ? { refresh: 1 } : {});
        license.value = response?.license || null;
        syncNotices(response);
    } catch (error) {
        Notify.error(error.message || 'Failed to load license details');
    } finally {
        loading.value = false;
        refreshing.value = false;
    }
};

const activateLicense = async () => {
    if (!form.licenseKey.trim()) {
        errorMessage.value = 'Please enter a license key first';
        return;
    }

    activating.value = true;
    errorMessage.value = '';

    try {
        const response = await Rest.post('settings/license', {
            license_key: form.licenseKey.trim()
        });

        license.value = response?.license || license.value;
        form.licenseKey = '';
        showNewLicenseInput.value = false;
        syncNotices(response);
        Notify.success(response?.message || 'License activated successfully');
    } catch (error) {
        errorMessage.value = error.message || 'Failed to activate license';
    } finally {
        activating.value = false;
    }
};

const deactivateLicense = async () => {
    deactivating.value = true;
    errorMessage.value = '';

    try {
        const response = await Rest.delete('settings/license');
        license.value = response?.license || null;
        showNewLicenseInput.value = false;
        syncNotices(response);
        Notify.success(response?.message || 'License deactivated successfully');
    } catch (error) {
        Notify.error(error.message || 'Failed to deactivate license');
    } finally {
        deactivating.value = false;
    }
};

const copyLicenseKey = async () => {
    const value = String(license.value?.license_key || '');
    if (!value) {
        return;
    }

    try {
        await navigator.clipboard.writeText(value);
        Notify.success('License key copied');
    } catch (error) {
        Notify.error('Could not copy the license key');
    }
};

onMounted(() => {
    if (isProActive.value && isLicensingEnabled.value) {
        loadLicense();
    }
});
</script>

<template>
    <div class="fplayer-settings-section fplayer-licensing-settings-page" v-loading="loading">
        <template v-if="!isProActive">
            <pro-upgrade
                title="FluentPlayer Pro Licensing"
                description="Activate FluentPlayer Pro to connect your site with your Pro license."
                :features="[
                    'Store your FluentPlayer Pro license key',
                    'Validate the activation status from your dashboard',
                    'Pass the active license key to the hosted subtitle service'
                ]"
                :upgrade-url="purchaseUrl"
            />
        </template>

        <template v-else-if="!isLicensingEnabled">
            <div class="fplayer-form-item fplayer-form-item-full-width">
                <div class="fplayer-form-label-wrapper">
                    <label class="fplayer-form-label">License Status</label>
                    <p class="fplayer-form-help">This FluentPlayer Pro build does not expose the licensing screen yet.</p>
                </div>

                <div class="fplayer-form-control">
                    <p class="fplayer-form-group-help-text">
                        Update FluentPlayer Pro to a build that includes the licensing API to manage license details here.
                    </p>
                </div>
            </div>
        </template>

        <template v-else>
            <div
                class="fplayer-license-box"
                :class="`fplayer-license-${statusKey}`"
                v-loading="activating || deactivating"
            >
                <div v-if="statusKey === 'valid'" class="fplayer-license-content is-centered">
                    <span class="fplayer-license-icon is-success" role="img" aria-label="License active">
                        <el-icon><CircleCheckFilled /></el-icon>
                    </span>
                    <h3>Congratulations! Your license key is valid and activated</h3>
                    <p>
                        Want to deactivate this license?
                        <a href="#" @click.prevent="deactivateLicense">Click here</a>
                    </p>

                    <div class="fplayer-license-details">
                        <p v-if="hasLicense">
                            <span class="label">License Key</span>
                            <span class="value fplayer-license-key">
                                <code>{{ maskedLicenseKey }}</code>
                                <el-button text class="fplayer-license-copy" @click="copyLicenseKey">
                                    <el-icon><DocumentCopy /></el-icon>
                                </el-button>
                            </span>
                        </p>
                        <p>
                            <span class="label">Expires</span>
                            <span class="value">{{ expiresLabel }}</span>
                        </p>
                        <p v-if="license?.variation_title">
                            <span class="label">Plan</span>
                            <span class="value">{{ license.variation_title }}</span>
                        </p>
                    </div>
                </div>

                <div v-else-if="statusKey === 'expired'" class="fplayer-license-content is-centered">
                    <template v-if="!showNewLicenseInput">
                        <span class="fplayer-license-icon is-warning" role="img" aria-label="License expired">
                            <el-icon><WarningFilled /></el-icon>
                        </span>
                        <h3>Looks like your license key has expired!</h3>
                        <p>
                            Have a new license key?
                            <a href="#" @click.prevent="showNewLicenseInput = true">Click here</a>
                            or <a :href="renewUrl" target="_blank" rel="noopener">Purchase a new license</a>
                        </p>

                        <div class="fplayer-license-details">
                            <p v-if="hasLicense">
                                <span class="label">License Key</span>
                                <span class="value fplayer-license-key">
                                    <code>{{ maskedLicenseKey }}</code>
                                </span>
                            </p>
                            <p>
                                <span class="label">Expired At</span>
                                <span class="value">{{ expiresLabel }}</span>
                            </p>
                        </div>
                    </template>

                    <div v-else class="fplayer-license-input-block">
                        <h3>Your License Key</h3>
                        <el-input
                            v-model="form.licenseKey"
                            type="password"
                            show-password
                            placeholder="Enter your new license key"
                            autocomplete="off"
                        />
                    </div>
                </div>

                <div v-else class="fplayer-license-content">
                    <h3>Please provide a license key of FluentPlayer Pro</h3>
                    <el-input
                        v-model="form.licenseKey"
                        type="password"
                        show-password
                        placeholder="License Key"
                        autocomplete="off"
                    />
                    <p>
                        Don't have a license key?
                        <a :href="purchaseUrl" target="_blank" rel="noopener">Purchase one here</a>
                    </p>
                </div>

                <p v-if="errorMessage" class="fplayer-license-error">{{ errorMessage }}</p>

                <div class="fplayer-license-actions">
                    <el-button text :loading="refreshing" @click="loadLicense(true)">
                        <el-icon><Refresh /></el-icon>
                        Refresh Status
                    </el-button>

                    <el-button
                        v-if="showActivateButton"
                        type="primary"
                        class="fplayer-primary-btn"
                        :loading="activating"
                        @click="activateLicense"
                    >
                        <el-icon><Lock /></el-icon>
                        {{ activateButtonLabel }}
                    </el-button>
                </div>
            </div>
        </template>
    </div>
</template>
