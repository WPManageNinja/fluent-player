import { ref, computed } from 'vue';
import { normalizeSettingBoolean } from './normalizeBoolean.js';

export function useProviderConfig(providerKey) {
	const settings = ref({});
	const fieldsMap = ref({});
	const passwordVisibility = ref({});
	const validationErrors = ref({});
	const loading = ref(true);
	const configName = ref('');

	const currentConfig = computed(() => fieldsMap.value[providerKey.value] || {});

	// 'enabled' is always a checkbox; other fields are checkboxes per their config.
	function isCheckboxField(fieldKey) {
		if (fieldKey === 'enabled') return true;
		const fieldConfig = fieldsMap.value[providerKey.value];
		const fields = (fieldConfig && (fieldConfig.fields || fieldConfig.settings_fields)) || [];
		const f = fields.find(x => x.key === fieldKey);
		return !!f && (f.type === 'checkbox' || f.type === 'switch');
	}

	function getValue(fieldKey) {
		const integration = settings.value[providerKey.value];
		if (!integration) return isCheckboxField(fieldKey) ? false : '';
		const value = integration[fieldKey];
		// Checkbox/switch values arrive as boolean OR 'true'/'yes'/'1' strings
		// after REST sanitization — coerce so el-switch reflects the saved state.
		// normalizeSettingBoolean also handles the 'true' string (dev's inline
		// coercion missed it — the original toggle bug).
		if (isCheckboxField(fieldKey)) {
			return normalizeSettingBoolean(value);
		}
		return value;
	}

	function setValue(fieldKey, value) {
		const key = providerKey.value;
		if (!settings.value[key]) {
			settings.value[key] = { enabled: false };
		}
		const fieldConfig = fieldsMap.value[key];
		const isStandard = fieldConfig && fieldConfig.source === 'standard';
		// Store checkboxes as 'yes'/'no' for standard integrations (matches the
		// PHP side), boolean otherwise.
		if (isCheckboxField(fieldKey)) {
			settings.value[key][fieldKey] = isStandard ? (value ? 'yes' : 'no') : !!value;
		} else {
			settings.value[key][fieldKey] = value;
		}
	}

	function getFieldOptions(field) {
		if (field.type === 'select' && field.options) {
			if (Array.isArray(field.options)) return field.options;
			return Object.entries(field.options).map(([value, label]) => ({ value, label }));
		}
		return [];
	}

	function togglePasswordVisibility(fieldKey) {
		const k = `${providerKey.value}_${fieldKey}`;
		passwordVisibility.value[k] = !passwordVisibility.value[k];
	}

	function isPasswordVisible(fieldKey) {
		const k = `${providerKey.value}_${fieldKey}`;
		return passwordVisibility.value[k] || false;
	}

	function validate() {
		const key = providerKey.value;
		const integration = settings.value[key] || {};
		const fieldConfig = fieldsMap.value[key];
		const fields = fieldConfig?.fields || fieldConfig?.settings_fields || [];
		const isEnabled = getValue('enabled');

		if (!isEnabled) {
			validationErrors.value[key] = {};
			return true;
		}

		let hasErrors = false;
		const errors = {};
		fields.forEach(field => {
			if (field.required && field.key !== 'enabled' && field.type !== 'setup_instructions') {
				const value = integration[field.key];
				if (!value || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0)) {
					errors[field.key] = true;
					hasErrors = true;
				} else {
					errors[field.key] = false;
				}
			}
		});

		validationErrors.value[key] = errors;
		return !hasErrors;
	}

	return {
		settings,
		fieldsMap,
		currentConfig,
		loading,
		configName,
		validationErrors,
		passwordVisibility,
		getValue,
		setValue,
		getFieldOptions,
		togglePasswordVisibility,
		isPasswordVisible,
		validate
	};
}
