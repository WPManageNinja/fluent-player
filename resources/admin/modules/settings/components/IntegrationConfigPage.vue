<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Rest from '@/utils/http/Rest.js';
import Notify from '@/utils/Notify.js';
import { Close } from '@element-plus/icons-vue';
import { useProviderConfig } from '@/composables/useProviderConfig.js';
import ConfigFormFields from './ConfigFormFields.vue';
import SetupInstructionsDialog from './SetupInstructionsDialog.vue';

const route = useRoute();
const router = useRouter();

const integrationKey = computed(() => route.params.key);

const {
	settings, fieldsMap, currentConfig, loading, configName,
	validationErrors, getValue, setValue, getFieldOptions,
	togglePasswordVisibility, isPasswordVisible, validate
} = useProviderConfig(integrationKey);

// Complex Array Dialog State
const complexArrayDialogVisible = ref(false);
const activeItem = ref({});
const isEditingItem = ref(false);
const itemIndex = ref(-1);
const currentArrayKey = ref('');
const currentItemFields = ref([]);

// Setup Instructions
const instructionsVisible = ref(false);
const currentInstructions = ref(null);

// FluentCRM-side facts (Event Tracking state, automation count, deep links)
const crmBehavior = ref(null);

const showSetupInstructions = (instructions) => {
	currentInstructions.value = instructions;
	instructionsVisible.value = true;
};

const fetchData = async () => {
	loading.value = true;
	try {
		const emailProviders = await Rest.get('email-providers');
		const mergedFields = {};
		const mergedSettings = {};

		if (emailProviders) {
			const meta = emailProviders.providers_meta || {};
			const providerSettings = emailProviders.providers || {};
			Object.keys(meta).forEach(k => {
				const settingsFields = (meta[k].settings_fields || []).filter(f => f.context !== 'preset_editor');
				mergedFields[k] = {
					name: meta[k].name,
					description: meta[k].description,
					logo: meta[k].logo,
					fields: settingsFields,
					source: 'email-provider',
					category: 'email'
				};
				validationErrors.value[k] = {};
			});
			Object.keys(providerSettings).forEach(k => {
				mergedSettings[k] = providerSettings[k];
				if (!mergedSettings[k]) mergedSettings[k] = { enabled: false };
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
		configName.value = mergedFields[integrationKey.value]?.name || integrationKey.value;
		crmBehavior.value = (emailProviders?.providers_meta || {})[integrationKey.value]?.crm_behavior || null;

		// Redirect on invalid key
		if (!mergedFields[integrationKey.value]) {
			router.replace({ name: 'settings.integrations' });
			return;
		}

		// no FluentCRM (connected forced false) → don't render a saveable timeline form
		if (integrationKey.value === 'fluentcrm' && !mergedSettings.fluentcrm?.connected) {
			router.replace({ name: 'settings.integrations' });
			return;
		}
	} catch (error) {
		Notify.error('Failed to load integration data');
	} finally {
		loading.value = false;
	}
};

const save = async () => {
	const key = integrationKey.value;
	const integration = settings.value[key] || {};
	const isEnabled = getValue('enabled');

	if (!isEnabled) {
		try {
			const response = await Rest.post('email-providers', {
				provider: key,
				settings: { ...integration, enabled: false }
			});
			Notify.success(response.message || 'Integration disabled');
		} catch (error) {
			Notify.error(error.message || 'Failed to disable integration');
			setValue('enabled', true);
		}
		return;
	}

	if (!validate()) {
		return;
	}

	try {
		let settingsToSave = JSON.parse(JSON.stringify(settings.value[key] || {}));
		const response = await Rest.post('email-providers', {
			provider: key,
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

// Complex Array functions
const addComplexArrayItem = (arrayKey, fields) => {
	const newItem = {};
	fields.forEach(field => {
		if (field.default !== undefined) {
			newItem[field.key] = field.default;
		} else if (field.type === 'array') {
			newItem[field.key] = [];
		} else {
			newItem[field.key] = '';
		}
	});
	activeItem.value = newItem;
	isEditingItem.value = false;
	currentArrayKey.value = arrayKey;
	currentItemFields.value = fields;
	complexArrayDialogVisible.value = true;
};

const editComplexArrayItem = (arrayKey, index, fields) => {
	const key = integrationKey.value;
	const list = settings.value[key]?.[arrayKey];
	if (!list || !list[index]) return;
	activeItem.value = JSON.parse(JSON.stringify(list[index]));
	itemIndex.value = index;
	currentArrayKey.value = arrayKey;
	currentItemFields.value = fields;
	isEditingItem.value = true;
	complexArrayDialogVisible.value = true;
};

const deleteComplexArrayItem = (arrayKey, index) => {
	const key = integrationKey.value;
	if (!settings.value[key][arrayKey]) {
		settings.value[key][arrayKey] = [];
	}
	settings.value[key][arrayKey].splice(index, 1);
};

const addArrayItem = (arrayFieldKey, fields) => {
	if (!activeItem.value[arrayFieldKey]) {
		activeItem.value[arrayFieldKey] = [];
	}
	const newItem = {};
	fields.forEach(field => {
		if (field.key === 'name') {
			newItem[field.key] = `header-${activeItem.value[arrayFieldKey].length + 1}`;
		} else if (field.key === 'value') {
			newItem[field.key] = '';
		} else {
			newItem[field.key] = field.default || '';
		}
	});
	activeItem.value[arrayFieldKey].push(newItem);
};

const removeArrayItem = (arrayFieldKey, index) => {
	activeItem.value[arrayFieldKey].splice(index, 1);
};

const saveComplexArrayItem = () => {
	for (const field of currentItemFields.value) {
		if (field.required && !activeItem.value[field.key]) {
			Notify.error(`${field.label} is required`);
			return;
		}
		if (field.key === 'url' && activeItem.value[field.key]) {
			try {
				new URL(activeItem.value[field.key]);
			} catch (e) {
				try {
					new URL(`https://${activeItem.value[field.key]}`);
					activeItem.value[field.key] = `https://${activeItem.value[field.key]}`;
				} catch (e) {
					Notify.error('Please enter a valid URL');
					return;
				}
			}
		}
		if (field.type === 'array') {
			const headers = activeItem.value[field.key];
			if (headers && headers.length > 0) {
				const headerNames = headers.map(h => h.name);
				const uniqueHeaderNames = [...new Set(headerNames)];
				if (headerNames.length !== uniqueHeaderNames.length) {
					Notify.error('Duplicate header names are not allowed');
					return;
				}
				const invalidHeaders = headers.filter(h => !h.name || !h.value);
				if (invalidHeaders.length > 0) {
					Notify.error('All headers must have both name and value');
					return;
				}
			}
		}
	}

	const key = integrationKey.value;
	const arrayKey = currentArrayKey.value;
	if (!settings.value[key][arrayKey]) {
		settings.value[key][arrayKey] = [];
	}
	if (isEditingItem.value) {
		settings.value[key][arrayKey][itemIndex.value] = activeItem.value;
	} else {
		settings.value[key][arrayKey].push(activeItem.value);
	}
	complexArrayDialogVisible.value = false;
};

const formatHeaderName = (item, field) => {
	if (!item[field]) return;
	if (item[field].includes(' ')) {
		item[field] = item[field].replace(/\s+/g, '-');
	}
	item[field] = item[field].toLowerCase().replace(/[^a-z0-9-_]/g, '');
	if (!item[field]) {
		item[field] = 'header';
	}
};

onMounted(() => {
	fetchData();
});

watch(integrationKey, () => {
	fetchData();
});

defineExpose({ save, configName, loading });
</script>

<template>
	<div class="fplayer-settings-section fplayer-integration-config-page">
		<template v-if="loading">
			<el-skeleton :rows="6" animated />
		</template>
		<template v-else-if="currentConfig.name">
			<div v-if="crmBehavior" class="fplayer-integration-info-card">
				<div class="fplayer-integration-info-card-head">
					<h3>{{ $t('Automation Triggers') }}</h3>
					<el-tooltip :content="$t('Open Automation Editor')" placement="top">
						<a
							:href="crmBehavior.automation_editor_url"
							target="_blank"
							rel="noopener noreferrer"
							class="fplayer-integration-info-card-link"
							:aria-label="$t('Open Automation Editor')"
						>
							<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
						</a>
					</el-tooltip>
				</div>
				<p class="fplayer-integration-info-card-body">
					{{ $t('Media milestones and layer interactions are available as triggers and goals in FluentCRM automations. Target media from the automation editor.') }}
				</p>
				<p class="fplayer-integration-info-card-status" :class="{ 'is-active': crmBehavior.automation_count > 0 }">
					<span class="status-dot" aria-hidden="true"></span>
					{{ crmBehavior.automation_count_text }}
				</p>
			</div>

			<h3 v-if="crmBehavior" class="fplayer-integration-section-title">{{ $t('Contact Timeline') }}</h3>

			<ConfigFormFields
				:fields="currentConfig.fields || []"
				:get-value="getValue"
				:set-value="setValue"
				:get-field-options="getFieldOptions"
				:toggle-password-visibility="togglePasswordVisibility"
				:is-password-visible="isPasswordVisible"
				:validation-errors="validationErrors"
				:provider-key="integrationKey"
				:hide-enable-toggle="integrationKey === 'fluentcrm'"
				@show-setup-instructions="showSetupInstructions"
			>
				<template #complex-array="{ field }">
					<div class="fplayer-integrations-complex-array-wrapper">
						<div
							v-if="!getValue(field.key) || getValue(field.key).length === 0"
							class="empty-state">
							<p>No items added yet.</p>
						</div>
						<div v-else class="fplayer-integrations-complex-array-list">
							<el-tag
								v-for="(arrItem, idx) in getValue(field.key)"
								:key="idx"
								closable
								@close="deleteComplexArrayItem(field.key, idx)"
								@click="editComplexArrayItem(field.key, idx, field.fields)"
							>
								{{ arrItem[field.item_label] || `Item ${ idx + 1 }` }}
							</el-tag>
						</div>
						<el-button type="primary" plain size="small" class="fplayer-secondary-btn"
						           @click="addComplexArrayItem(field.key, field.fields)">
							{{ field.button_text || 'Add Item' }}
						</el-button>
					</div>
				</template>
			</ConfigFormFields>
		</template>

		<!-- Complex Array Item Dialog -->
		<el-dialog
			v-model="complexArrayDialogVisible"
			:title="isEditingItem ? 'Edit Item' : 'Add Item'"
			width="500px"
			append-to-body
			class="fplayer-integrations-complex-array-dialog"
		>
			<el-form label-position="top">
				<template v-for="(dialogField, index) in currentItemFields" :key="index">
					<el-form-item :label="dialogField.label" :required="dialogField.required">
						<!-- Text Input -->
						<el-input
							v-if="dialogField.type === 'text' || !dialogField.type"
							v-model="activeItem[dialogField.key]"
							:placeholder="dialogField.placeholder || ''"
						/>
						<!-- Select Input -->
						<el-select
							v-else-if="dialogField.type === 'select'"
							v-model="activeItem[dialogField.key]"
							:placeholder="dialogField.placeholder || ''"
						>
							<el-option v-for="opt in dialogField.options" :key="opt.id || opt.value"
							           :label="opt.name || opt.label" :value="opt.id || opt.value"/>
						</el-select>
						<!-- Array Input (for headers, etc.) -->
						<div v-else-if="dialogField.type === 'array'" class="fplayer-integrations-array-wrapper">
							<div v-if="!activeItem[dialogField.key] || activeItem[dialogField.key].length === 0"
							     class="empty-state">
								<p>No items added yet.</p>
							</div>
							<div v-else class="fplayer-integrations-array-items">
								<div v-for="(item, arrIdx) in activeItem[dialogField.key]" :key="arrIdx"
								     class="fplayer-integrations-array-item">
									<template v-for="(subField, subIndex) in dialogField.fields" :key="subIndex">
										<el-input
											v-model="item[subField.key]"
											:placeholder="subField.label"
											class="array-item-input"
											@update:modelValue="subField.key === 'name' ? formatHeaderName(item, 'name') : null"
										/>
									</template>
									<el-button type="danger" class="fplayer-secondary-btn" circle @click="removeArrayItem(dialogField.key, arrIdx)">
										<el-icon>
											<Close/>
										</el-icon>
									</el-button>
								</div>
							</div>

							<el-button type="primary" plain size="small" class="fplayer-secondary-btn fplayer-mt-2"
							           @click="addArrayItem(dialogField.key, dialogField.fields)">
								{{ dialogField.button_text || 'Add Item' }}
							</el-button>
						</div>
					</el-form-item>
				</template>
			</el-form>
			<template #footer>
				<span class="dialog-footer">
					<el-button @click="complexArrayDialogVisible = false">Cancel</el-button>
					<el-button type="primary" class="fplayer-primary-btn" @click="saveComplexArrayItem">
						{{ isEditingItem ? 'Update' : 'Add' }}
					</el-button>
				</span>
			</template>
		</el-dialog>

		<!-- Setup Instructions Modal -->
		<SetupInstructionsDialog v-model="instructionsVisible" :instructions="currentInstructions" />
	</div>
</template>
