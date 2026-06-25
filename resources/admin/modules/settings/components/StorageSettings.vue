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
const activeFilter = ref('all');
const searchQuery = ref('');

const integrations = ref({});
const storageFields = ref({});

const loading = ref(false);

const { isProActive, getFeatureConfig, getUpgradeUrl } = useProFeatures();
const storageProConfig = computed(() => {
	const config = getFeatureConfig(FEATURES.STORAGE);
	return {
		...config,
		upgradeUrl: getUpgradeUrl(FEATURES.STORAGE)
	};
});

const statusFilters = [
	{ key: 'all', label: 'All' },
	{ key: 'bunny', label: 'BunnyCDN' },
	{ key: 'mux', label: 'Mux' },
];

const availableStorages = computed(() => {
	return Object.keys(storageFields.value);
});

const filteredStorages = computed(() => {
	let keys = availableStorages.value;
	let list = keys.map(key => ({
		key,
		...storageFields.value[key]
	}));

	if (activeFilter.value === 'bunny') {
		list = list.filter(item => ['bunnycdn_stream', 'bunnycdn_storage'].includes(item.key));
	}
	if (activeFilter.value === 'mux') {
		list = list.filter(item => item.key === 'mux');
	}
	if (searchQuery.value) {
		const q = searchQuery.value.toLowerCase();
		list = list.filter(item => {
			return item.name.toLowerCase().includes(q) ||
				(item.description && item.description.toLowerCase().includes(q));
		});
	}

	return list;
});

// Helper to get storage value (used for enabled/disabled tags in list)
const getStorageValue = (storageKey, fieldKey) => {
	const integration = integrations.value[storageKey];
	if (!integration) return fieldKey === 'enabled' ? false : '';
	const value = integration[fieldKey];

	if (fieldKey === 'enabled') {
		if (typeof value === 'boolean') return value;
		return value === 'yes';
	}
	return value;
};

const fetchAllStoragesData = async () => {
	loading.value = true;
	try {
		const [standardFields, standardSettings] = await Promise.all([
			Rest.get('integrations/fields'),
			Rest.get('integrations'),
		]);
		const mergedFields = {};
		const mergedSettings = {};
		if (standardFields) {
			Object.keys(standardFields).forEach(key => {
				mergedFields[key] = {
					...standardFields[key],
					source: 'standard',
					category: 'others'
				};
			});
		}
		if (standardSettings) {
			Object.keys(standardSettings).forEach(key => {
				mergedSettings[key] = standardSettings[key];
				if (!mergedSettings[key]) mergedSettings[key] = { enabled: 'no' };
			});
		}
		storageFields.value = mergedFields;

		Object.keys(mergedFields).forEach(key => {
			const fieldConfig = mergedFields[key];
			if (!mergedSettings[key]) {
				const isStandard = fieldConfig.source === 'standard';
				mergedSettings[key] = { enabled: isStandard ? 'no' : false };
			}
		});

		integrations.value = mergedSettings;
	} catch (error) {
		console.error('Failed to load integrations:', error);
		Notify.error('Failed to load integrations');
	} finally {
		loading.value = false;
	}
};

const openConfigPage = (key) => {
	router.push({ name: 'settings.storage.config', params: { key } });
};

onMounted(async () => {
	await fetchAllStoragesData();
});
</script>

<template>
	<div class="fplayer-settings-section fplayer-integrations-settings-section">
		<pro-upgrade v-if="!isProActive" v-bind="storageProConfig"/>
		<div v-else>
			<!-- Filters & Search -->
			<HeaderFilters
				v-model:search-query="searchQuery"
				:current-filter="activeFilter"
				@filter-change="filter => activeFilter = filter"
				:status-filters="statusFilters"
			/>

			<IntegrationListSkeleton v-if="loading" :rows="3" />

			<!-- Storage List -->
			<div v-else class="fplayer-integrations-list-container">
				<div
					v-for="item in filteredStorages"
					:key="item.key"
					class="fplayer-integrations-item"
					@click="openConfigPage(item.key)"
				>
					<!-- Storage Row -->
					<div class="fplayer-integrations-row">
						<div class="fplayer-integrations-brand">
							<img
								v-if="item.logo || item.icon"
								:src="item.logo || item.icon"
								:alt="item.name"
							/>
							<div v-else class="fplayer-integrations-brand-placeholder">{{
									item.name ? item.name[0] : '?'
								}}
							</div>
						</div>

						<div class="fplayer-integrations-info">
							<div class="fplayer-integrations-info-header">
								<h4 class="fplayer-integrations-info-title">{{ item.name }}</h4>
							</div>
							<p class="fplayer-integrations-info-desc">{{ item.description }}</p>
						</div>

						<div class="fplayer-integrations-actions" @click.stop>
							<el-tag
								:type="getStorageValue(item.key, 'enabled') ? 'success' : 'info'"
								size="small"
								round
								effect="plain"
							>
								{{ getStorageValue(item.key, 'enabled') ? 'Enabled' : 'Disabled' }}
							</el-tag>
							<el-button
								class="fplayer-secondary-btn"
								type="primary"
								plain
								@click="openConfigPage(item.key)"
								title="Configure Storage"
							>
								<span>Configure</span>
							</el-button>
						</div>
					</div>
				</div>

				<div v-if="filteredStorages.length === 0" class="fplayer-no-results">
					No storage providers found.
				</div>
			</div>
		</div>
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
