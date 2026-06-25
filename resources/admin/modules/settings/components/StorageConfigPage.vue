<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Rest from '@/utils/http/Rest.js';
import Notify from '@/utils/Notify.js';
import { useProviderConfig } from '@/composables/useProviderConfig.js';
import ConfigFormFields from './ConfigFormFields.vue';
import SetupInstructionsDialog from './SetupInstructionsDialog.vue';

const route = useRoute();
const router = useRouter();

const storageKey = computed(() => route.params.key);
const testingConnection = ref('');

const {
	settings, fieldsMap, currentConfig, loading, configName,
	validationErrors, getValue, setValue, getFieldOptions,
	togglePasswordVisibility, isPasswordVisible, validate
} = useProviderConfig(storageKey);

// Setup Instructions
const instructionsVisible = ref(false);
const currentInstructions = ref(null);

const showSetupInstructions = (instructions) => {
	currentInstructions.value = instructions;
	instructionsVisible.value = true;
};

const fetchData = async () => {
	loading.value = true;
	try {
		const [standardFields, standardSettings] = await Promise.all([
			Rest.get('integrations/fields'),
			Rest.get('integrations'),
		]);

		const mergedFields = {};
		const mergedSettings = {};

		if (standardFields) {
			Object.keys(standardFields).forEach(k => {
				mergedFields[k] = {
					...standardFields[k],
					source: 'standard',
					category: 'others'
				};
				validationErrors.value[k] = {};
			});
		}
		if (standardSettings) {
			Object.keys(standardSettings).forEach(k => {
				mergedSettings[k] = standardSettings[k];
				if (!mergedSettings[k]) mergedSettings[k] = { enabled: 'no' };
			});
		}

		fieldsMap.value = mergedFields;

		Object.keys(mergedFields).forEach(k => {
			const fieldConfig = mergedFields[k];
			if (!mergedSettings[k]) {
				const isStandard = fieldConfig.source === 'standard';
				mergedSettings[k] = { enabled: isStandard ? 'no' : false };
			}
			const fields = fieldConfig.fields || [];
			fields.forEach(field => {
				if (field.default !== null && field.default !== undefined && mergedSettings[k][field.key] === undefined) {
					mergedSettings[k][field.key] = field.default;
				}
				if ((field.type === 'complex_array' || field.type === 'array') && !mergedSettings[k][field.key]) {
					mergedSettings[k][field.key] = [];
				}
			});
		});

		settings.value = mergedSettings;
		configName.value = mergedFields[storageKey.value]?.name || storageKey.value;

		// Redirect on invalid key
		if (!mergedFields[storageKey.value]) {
			router.replace({ name: 'settings.storage' });
		}
	} catch (error) {
		Notify.error('Failed to load storage data');
	} finally {
		loading.value = false;
	}
};

const save = async () => {
	const key = storageKey.value;

	if (!getValue('enabled')) {
		try {
			const response = await Rest.post(`integrations/${key}`, {
				settings: { enabled: 'no' }
			});
			Notify.success(response.message || 'Integration disabled');
		} catch (error) {
			Notify.error(error.message || 'Failed to disable integration');
			setValue('enabled', true);
		}
		return;
	}

	if (!validate()) {
		Notify.error('Please fill in all required fields');
		return;
	}

	try {
		let settingsToSave = JSON.parse(JSON.stringify(settings.value[key] || {}));
		const response = await Rest.post(`integrations/${key}`, {
			settings: settingsToSave
		});
		Notify.success(response.message || 'Integration settings saved successfully');
		if (response.settings) {
			settings.value[key] = response.settings;
		}
	} catch (error) {
		Notify.error(error.message || 'Failed to save integration settings');
	}
};

const testConnection = async () => {
	const key = storageKey.value;
	const integration = settings.value[key] || {};
	const fieldConfig = fieldsMap.value[key];

	if (!getValue('enabled')) {
		Notify.error('Please enable the integration first');
		return;
	}

	if (!validate()) {
		Notify.error('Please fill in required fields before testing connection');
		return;
	}

	testingConnection.value = key;
	try {
		let response;
		if (fieldConfig.source === 'standard') {
			response = await Rest.post(`integrations/${key}/test-connection`, {
				settings: integration
			});
		} else {
			response = await Rest.post(`email-providers/${key}/test-connection`, {
				settings: integration
			});
		}
		Notify.success(response.message || 'Connection test successful');
	} catch (error) {
		Notify.error(error.message || 'Connection test failed');
	} finally {
		testingConnection.value = '';
	}
};

onMounted(() => {
	fetchData();
});

watch(storageKey, () => {
	fetchData();
});

defineExpose({ save, configName, loading });
</script>

<template>
	<div class="fplayer-settings-section fplayer-storage-config-page">
		<template v-if="loading">
			<el-skeleton :rows="6" animated />
		</template>
		<template v-else-if="currentConfig.name">
			<ConfigFormFields
				:fields="currentConfig.fields || []"
				:get-value="getValue"
				:set-value="setValue"
				:get-field-options="getFieldOptions"
				:toggle-password-visibility="togglePasswordVisibility"
				:is-password-visible="isPasswordVisible"
				:validation-errors="validationErrors"
				:provider-key="storageKey"
				@show-setup-instructions="showSetupInstructions"
			>
				<template #after-fields>
					<div class="fplayer-storage-config-actions" style="padding: 20px 0 0;">
						<el-button
							type="info"
							plain
							size="small"
							@click="testConnection"
							:loading="testingConnection === storageKey"
						>
							Test Connection
						</el-button>
					</div>
				</template>
			</ConfigFormFields>
		</template>

		<!-- Setup Instructions Modal -->
		<SetupInstructionsDialog v-model="instructionsVisible" :instructions="currentInstructions" />
	</div>
</template>
