<script setup>
import { computed, getCurrentInstance, onMounted, reactive, ref } from 'vue';
import { ElIcon } from 'element-plus';
import { CircleCheckFilled, WarningFilled, Lock, Refresh } from '@element-plus/icons-vue';
import Rest from '@/utils/http/Rest.js';
import Notify from '@/utils/Notify.js';
import ProUpgrade from '@/components/ProUpgrade.vue';
import { useProFeatures } from '@/composables/useFeatures.js';
import { useAdminNotices } from '@/composables/useAdminNotices';

defineProps({
    settings: {
        type: Object,
        default: () => ({})
    }
});

const { isProActive, getUpgradeUrl } = useProFeatures();
const { setNotices } = useAdminNotices();
const instance = getCurrentInstance();
const $t = instance?.proxy?.$t || ((text) => text);

// Refresh the in-app notices after a licence write. Older Pro builds omit the key,
// so leave the existing notices alone rather than blanking them.
const syncNotices = (response) => {
    if (Array.isArray(response?.admin_notices)) {
        setNotices(response.admin_notices);
    }
};
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

const hasLicense = computed(() => !!(license.value && license.value.license_key_masked));

// The raw key never reaches the browser; the server sends a masked version only.
const maskedLicenseKey = computed(() => String(license.value?.license_key_masked || ''));

// Set by the server when a license is past expiry but still inside the store's
// grace window. Absent on older Pro builds, so it simply reads false there.
const inGracePeriod = computed(() => !!license.value?.in_grace_period);

const expiresLabel = computed(() => {
    if (license.value?.is_lifetime) {
        return 'Lifetime';
    }

    // Prefer the server's locale-formatted date; fall back to the raw value for
    // older Pro builds that do not send expires_human.
    const human = String(license.value?.expires_human || '');
    if (human) {
        return human;
    }

    const expires = String(license.value?.expires || '');
    if (!expires) {
        return 'Not available';
    }

    return expires === 'lifetime' ? 'Lifetime' : expires;
});

const daysRemaining = computed(() => {
    const value = license.value?.days_remaining;

    if (value === null || value === undefined || value === '') {
        return null;
    }

    const days = Number(value);

    return Number.isFinite(days) ? Math.trunc(days) : null;
});

const expiryHint = computed(() => {
    const days = daysRemaining.value;

    if (days === null || license.value?.is_lifetime) {
        return '';
    }

    if (days === -1) {
        return $t('Expired within the last day');
    }

    if (days < 0) {
        return $t('Expired more than %d days ago').replace('%d', Math.abs(days) - 1);
    }

    if (days === 0) {
        return $t('Less than 1 day remaining');
    }

    if (days === 1) {
        return $t('In 1 day');
    }

    return $t('In %d days').replace('%d', days);
});

const lastCheckedLabel = computed(() => String(license.value?.last_checked_human || ''));

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
        // Tolerant of both contracts: the plain shape returns the license object
        // directly; older Pro builds wrap it as { license }.
        license.value = response?.license_data ?? response?.license ?? response ?? null;
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

        license.value = response?.license_data ?? response?.license ?? license.value;
        syncNotices(response);
        form.licenseKey = '';
        showNewLicenseInput.value = false;
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
        license.value = response?.license_data ?? response?.license ?? null;
        syncNotices(response);
        showNewLicenseInput.value = false;
        Notify.success(response?.message || 'License deactivated successfully');
    } catch (error) {
        Notify.error(error.message || 'Failed to deactivate license');
    } finally {
        deactivating.value = false;
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
                    <span
                        class="fplayer-license-icon"
                        :class="inGracePeriod ? 'is-warning' : 'is-success'"
                        role="img"
                        :aria-label="inGracePeriod ? $t('License in grace period') : $t('License active')"
                    >
                        <el-icon><WarningFilled v-if="inGracePeriod" /><CircleCheckFilled v-else /></el-icon>
                    </span>
                    <h3 v-if="inGracePeriod">Your license is in a grace period</h3>
                    <h3 v-else>Congratulations! Your license key is valid and activated</h3>

                    <p v-if="inGracePeriod" class="fplayer-license-grace" role="alert">
                        Your license has expired. Everything keeps working for now, but updates and support
                        will end soon — <a :href="renewUrl" target="_blank" rel="noopener">renew your license</a> to keep them.
                    </p>
                    <p>
                        Want to deactivate this license?
                        <a href="#" @click.prevent="deactivateLicense">Click here</a>
                    </p>

                    <div class="fplayer-license-details">
                        <p v-if="hasLicense">
                            <span class="label">License Key</span>
                            <span class="value fplayer-license-key">
                                <code>{{ maskedLicenseKey }}</code>
                            </span>
                        </p>
                        <p>
                            <span class="label">{{ inGracePeriod ? 'Expired' : 'Expires' }}</span>
                            <span class="value">
                                {{ expiresLabel }}
                                <small v-if="expiryHint">{{ expiryHint }}</small>
                            </span>
                        </p>
                        <p v-if="inGracePeriod">
                            <span class="label">{{ $t('Updates & Support') }}</span>
                            <span class="value">{{ $t('Ending soon') }}</span>
                        </p>
                        <p v-if="license?.variation_title">
                            <span class="label">Plan</span>
                            <span class="value">{{ license.variation_title }}</span>
                        </p>
                        <p v-if="lastCheckedLabel">
                            <span class="label">{{ $t('Last checked') }}</span>
                            <span class="value">{{ lastCheckedLabel }}</span>
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
                                <span class="value">
                                    {{ expiresLabel }}
                                    <small v-if="expiryHint">{{ expiryHint }}</small>
                                </span>
                            </p>
                            <p v-if="lastCheckedLabel">
                                <span class="label">{{ $t('Last checked') }}</span>
                                <span class="value">{{ lastCheckedLabel }}</span>
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
                            :aria-label="$t('License Key')"
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
                        :aria-label="$t('License Key')"
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
