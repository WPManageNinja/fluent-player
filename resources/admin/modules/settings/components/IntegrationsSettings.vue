<script setup>
import { ref, computed, onMounted } from 'vue';
import Rest from '@/utils/http/Rest.js';
import Notify from '@/utils/Notify.js';
import ProUpgrade from '@/components/ProUpgrade.vue';
import { FEATURES, useProFeatures } from '@/composables/useFeatures.js';
import HeaderFilters from '@components/HeaderFilters.vue';
import IntegrationListSkeleton from './IntegrationListSkeleton.vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// Filter state
const activeFilter = ref('all'); // 'all', 'esp', 'others'
const searchQuery = ref('');

const integrations = ref({});
const integrationFields = ref({});

const loading = ref(false);

const { isProActive, getFeatureConfig, getUpgradeUrl } = useProFeatures();
const integrationsProConfig = computed(() => {
	const config = getFeatureConfig(FEATURES.INTEGRATIONS);
	return {
		...config,
		upgradeUrl: getUpgradeUrl(FEATURES.INTEGRATIONS)
	};
});

const statusFilters = [
	{key: 'all', label: 'All'},
	{key: 'esp', label: 'Email Service Provider'},
	{key: 'others', label: 'Others'},
];

// Hardcoded ESP categorization/Ordering
const ESP_KEYS = [
	'fluentcrm', 'mailchimp', 'active_campaign', 'convertkit', 'mailerlite',
	'drip', 'get_response', 'sendinblue', 'platform_ly', 'moosend', 'send_fox', 'mautic'
];

const availableIntegrations = computed(() => {
	return Object.keys(integrationFields.value);
});

const filteredIntegrations = computed(() => {
	let keys = availableIntegrations.value;
	let list = keys.map(key => ({
		key,
		...integrationFields.value[key]
	}));

	// Filter by type
	if (activeFilter.value === 'esp') {
		list = list.filter(item => (ESP_KEYS.includes(item.key) || item.category === 'email') && item.key !== 'webhook');
	} else if (activeFilter.value === 'others') {
		list = list.filter(item => item.key === 'webhook' || (!ESP_KEYS.includes(item.key) && item.category !== 'email'));
	}

	// Filter by search
	if (searchQuery.value) {
		const q = searchQuery.value.toLowerCase();
		list = list.filter(item => {
			return item.name.toLowerCase().includes(q) ||
				(item.description && item.description.toLowerCase().includes(q));
		});
	}

	return list;
});

const displayIntegrations = computed(() => {
	const list = filteredIntegrations.value;
	if (isProActive.value) return list;
	return list.filter(item => item.key === 'fluentcrm');
});

// Helper to get integration value (used for enabled/disabled tags in list)
const getIntegrationValue = (integrationKey, fieldKey) => {
	const integration = integrations.value[integrationKey];
	if (!integration) return fieldKey === 'enabled' ? false : '';

	if (fieldKey === 'enabled' && integrationKey === 'fluentcrm') {
		return !!integration['connected'];
	}

	const value = integration[fieldKey];

	if (fieldKey === 'enabled') {
		if (typeof value === 'boolean') return value;
		return value === 'yes';
	}
	return value;
};

const fetchAllIntegrationsData = async () => {
	loading.value = true;
	try {
		const [emailProviders] = await Promise.all([
			Rest.get('email-providers')
		]);

		const mergedFields = {};
		const mergedSettings = {};
		if (emailProviders) {
			const meta = emailProviders.providers_meta || {};
			const settings = emailProviders.providers || {};
			Object.keys(meta).forEach(key => {
				const settingsFields = (meta[key].settings_fields || []).filter(field => field.context !== 'preset_editor');
				mergedFields[key] = {
					name: meta[key].name,
					description: meta[key].description,
					logo: meta[key].logo,
					fields: settingsFields,
					source: 'email-provider',
					category: 'email'
				};
			});
			Object.keys(settings).forEach(key => {
				mergedSettings[key] = settings[key];
				if (!mergedSettings[key]) mergedSettings[key] = { enabled: false };
			});
		}

		integrationFields.value = mergedFields;

		Object.keys(mergedFields).forEach(key => {
			const fieldConfig = mergedFields[key];
			if (!mergedSettings[key]) {
				const isStandard = fieldConfig.source === 'standard';
				mergedSettings[key] = { enabled: isStandard ? 'no' : false };
			}
		});

		integrations.value = mergedSettings;
	} catch (error) {
		Notify.error('Failed to load integrations');
	} finally {
		loading.value = false;
	}
};

const openConfigPage = (key) => {
	router.push({ name: 'settings.integrations.config', params: { key } });
};

onMounted(async () => {
	await fetchAllIntegrationsData();
});
</script>

<template>
	<div
		class="fplayer-settings-section fplayer-integrations-settings-section"
		:class="{ 'fplayer-integrations-free': !isProActive }"
	>
		<div>
			<HeaderFilters
				v-if="isProActive"
				v-model:search-query="searchQuery"
				:current-filter="activeFilter"
				@filter-change="filter => activeFilter = filter"
				:status-filters="statusFilters"
			/>

			<IntegrationListSkeleton v-if="loading" :rows="3" />

			<!-- Integration List -->
			<div v-else class="fplayer-integrations-list-container">
				<div
					v-for="item in displayIntegrations"
					:key="item.key"
					class="fplayer-integrations-item"
					@click="item.key !== 'fluentcrm' && openConfigPage(item.key)"
				>
					<!-- Integration Row Header -->
					<div class="fplayer-integrations-row">
						<div class="fplayer-integrations-brand">
							<img
								v-if="item.logo || item.icon"
								:src="item.logo || item.icon"
								:alt="item.name"
							/>
							<div v-else class="fplayer-integrations-brand-placeholder">{{ item.name ? item.name[0] : '?' }}</div>
						</div>

						<div class="fplayer-integrations-info">
							<div class="fplayer-integrations-info-header">
								<h4 class="fplayer-integrations-info-title">{{ item.name }}</h4>
							</div>
							<p class="fplayer-integrations-info-desc">{{ item.description }}</p>
						</div>

						<div class="fplayer-integrations-actions" @click.stop>
							<el-link
								v-if="item.key === 'fluentcrm' && (!getIntegrationValue(item.key, 'connected'))"
								:href="integrations[item.key]?.connectUrl"
								target="_blank"
								:underline="false"
							>
								<el-button
									class="fplayer-secondary-btn"
									type="primary"
									plain
								>
									<el-icon>
										<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
											<path d="M10.75 8.5H14.5L10 13L5.5 8.5H9.25V3.25H10.75V8.5ZM4 15.25H16V10H17.5V16C17.5 16.1989 17.421 16.3897 17.2803 16.5303C17.1397 16.671 16.9489 16.75 16.75 16.75H3.25C3.05109 16.75 2.86032 16.671 2.71967 16.5303C2.57902 16.3897 2.5 16.1989 2.5 16V10H4V15.25Z" fill="#525866"/>
										</svg>
									</el-icon>
									<span>Install/Activate</span>
								</el-button>
							</el-link>
							<template v-else>
								<el-tag
									:type="getIntegrationValue(item.key, 'enabled') ? 'success' : 'info'"
									size="small"
									round
									effect="plain"
								>
									{{ getIntegrationValue(item.key, 'enabled') ? 'Enabled' : 'Disabled' }}
								</el-tag>
								<el-button
									v-if="item.key !== 'fluentcrm'"
									class="fplayer-secondary-btn"
									type="primary"
									plain
									@click="openConfigPage(item.key)"
									title="Configure Integration"
								>
									<span>Configure</span>
								</el-button>
							</template>
						</div>
					</div>
				</div>

				<div v-if="displayIntegrations.length === 0" class="fplayer-no-results">
					No integrations found.
				</div>
			</div>
		</div>

		<pro-upgrade v-if="!isProActive" v-bind="integrationsProConfig"/>
	</div>
</template>

<style scoped lang="scss">
/* WCAG AA — Element Plus plain tags render light text on a white background
   (~2.2–3:1). Darken the "Enabled"/"Disabled" status text to >= 4.5:1 while
   keeping the success(green) / info(grey) semantic. */
.fplayer-integrations-actions {
    :deep(.el-tag--success),
    :deep(.el-tag--success .el-tag__content) {
        color: #256a29; // ~6.2:1 on white
    }

    :deep(.el-tag--info),
    :deep(.el-tag--info .el-tag__content) {
        color: #5c5f66; // ~6:1 on white
    }
}
</style>
