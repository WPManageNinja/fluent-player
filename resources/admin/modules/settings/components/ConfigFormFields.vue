<script setup>
import { Opportunity } from '@element-plus/icons-vue';

const props = defineProps({
	fields: { type: Array, default: () => [] },
	getValue: { type: Function, required: true },
	setValue: { type: Function, required: true },
	getFieldOptions: { type: Function, required: true },
	togglePasswordVisibility: { type: Function, required: true },
	isPasswordVisible: { type: Function, required: true },
	validationErrors: { type: Object, default: () => ({}) },
	providerKey: { type: String, required: true }
});

const emit = defineEmits(['show-setup-instructions']);

const setupFields = () => props.fields.filter(f => f.type === 'setup_instructions');
const formFields = () => props.fields.filter(f => f.key !== 'enabled' && f.type !== 'setup_instructions');
</script>

<template>
	<!-- Enable Toggle -->
	<div class="fplayer-form-item enabled-toggle-item">
		<div class="fplayer-form-label-wrapper">
			<label class="fplayer-form-label">Enable Integration</label>
			<div class="form-help">Turn on this switch to enable the integration.</div>
		</div>
		<div class="fplayer-form-control">
			<el-switch
				class="fplayer-switch"
				:model-value="getValue('enabled')"
				@update:model-value="(val) => setValue('enabled', val)"
			/>
		</div>
	</div>

	<!-- Setup Instructions Tip -->
	<div
		v-for="field in setupFields()"
		:key="field.key"
		class="config-alert"
	>
		<el-alert show-icon type="info" :closable="false">
			<template #title>Setup Required</template>
			Please follow the instructions below to set up this integration.
		</el-alert>
		<el-button
			class="fplayer-secondary-btn"
			@click="emit('show-setup-instructions', field.instructions)"
			type="primary" plain size="small" style="margin-top: 12px;" :icon="Opportunity">
			View Setup Instructions
		</el-button>
	</div>

	<!-- Fields -->
	<div
		v-for="field in formFields()"
		:key="field.key"
		class="fplayer-form-item"
		v-show="!field.depends_on || getValue(field.depends_on)"
	>
		<div class="fplayer-form-label-wrapper">
			<label class="fplayer-form-label">
				{{ field.label }}
				<span v-if="field.required" class="required">*</span>
			</label>
			<div v-if="field.description || field.help || field.link" class="form-help">
				<template v-if="field.description || field.help">{{ field.description || field.help }}</template>
				<a
					v-if="field.link?.url"
					:href="field.link.url"
					target="_blank"
					rel="noopener noreferrer"
					class="form-help-link"
				>
					{{ field.link.text || field.link.url }}
				</a>
			</div>
		</div>
		<div class="fplayer-form-control">
			<!-- Switch -->
			<el-switch
				class="fplayer-switch"
				v-if="field.type === 'checkbox' || field.type === 'switch'"
				:model-value="getValue(field.key)"
				@update:model-value="setValue(field.key, $event)"
			/>

			<!-- Checkbox Group -->
			<el-checkbox-group
				v-else-if="field.type === 'checkbox_group'"
				:model-value="getValue(field.key) || []"
				@update:model-value="setValue(field.key, $event)"
			>
				<el-checkbox
					v-for="option in field.options"
					:key="option.value"
					:label="option.value"
				>
					{{ option.label }}
				</el-checkbox>
			</el-checkbox-group>

			<!-- Select -->
			<el-select
				v-else-if="field.type === 'select'"
				:model-value="getValue(field.key)"
				@update:model-value="setValue(field.key, $event)"
				style="width: 100%"
				:multiple="field.multiple"
				:placeholder="field.placeholder || `Select ${field.label}`"
			>
				<el-option
					v-for="option in getFieldOptions(field)"
					:key="option.value"
					:label="option.label"
					:value="option.value"
				/>
			</el-select>

			<!-- Radio -->
			<el-radio-group
				v-else-if="field.type === 'radio'"
				:model-value="getValue(field.key)"
				@update:model-value="setValue(field.key, $event)"
			>
				<el-radio
					v-for="option in getFieldOptions(field)"
					:key="option.value"
					:label="option.value"
				>
					{{ option.label }}
				</el-radio>
			</el-radio-group>

			<!-- Textarea -->
			<el-input
				v-else-if="field.type === 'textarea'"
				:model-value="getValue(field.key)"
				@update:model-value="setValue(field.key, $event)"
				type="textarea"
				:rows="3"
				:placeholder="field.placeholder"
				:class="{ 'is-error': validationErrors[providerKey]?.[field.key] }"
			/>

			<!-- Password/API Key -->
			<el-input
				v-else-if="field.type === 'password' || field.type === 'api_key'"
				:model-value="getValue(field.key)"
				@update:model-value="setValue(field.key, $event)"
				:type="isPasswordVisible(field.key) ? 'text' : 'password'"
				:placeholder="field.placeholder"
				:class="{ 'is-error': validationErrors[providerKey]?.[field.key] }"
			>
				<template #append>
					<el-button @click="togglePasswordVisibility(field.key)">
						{{ isPasswordVisible(field.key) ? 'Hide' : 'Show' }}
					</el-button>
				</template>
			</el-input>

			<!-- Complex Array (slot for parent to handle) -->
			<slot
				v-else-if="field.type === 'complex_array'"
				name="complex-array"
				:field="field"
			/>

			<!-- Default Input -->
			<el-input
				v-else
				:model-value="getValue(field.key)"
				@update:model-value="setValue(field.key, $event)"
				:type="field.type === 'number' ? 'number' : 'text'"
				:placeholder="field.placeholder"
				:class="{ 'is-error': validationErrors[providerKey]?.[field.key] }"
			/>

			<span v-if="validationErrors[providerKey]?.[field.key]" class="field-error">This field is required</span>
		</div>
	</div>

	<!-- After fields slot (for test connection, etc.) -->
	<slot name="after-fields" />
</template>
