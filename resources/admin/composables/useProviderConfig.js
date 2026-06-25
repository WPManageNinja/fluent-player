import { ref, computed } from 'vue';

export function useProviderConfig(providerKey) {
	const settings = ref({});
	const fieldsMap = ref({});
	const passwordVisibility = ref({});
	const validationErrors = ref({});
	const loading = ref(true);
	const configName = ref('');

	const currentConfig = computed(() => fieldsMap.value[providerKey.value] || {});

	function getValue(fieldKey) {
		const integration = settings.value[providerKey.value];
		if (!integration) return fieldKey === 'enabled' ? false : '';
		const value = integration[fieldKey];
		if (fieldKey === 'enabled') {
			if (typeof value === 'boolean') return value;
			return value === 'yes';
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
		if (fieldKey === 'enabled') {
			if (isStandard) {
				settings.value[key][fieldKey] = value ? 'yes' : 'no';
			} else {
				settings.value[key][fieldKey] = !!value;
			}
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
