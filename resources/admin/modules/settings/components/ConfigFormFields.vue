<script setup>
import { Opportunity } from '@element-plus/icons-vue';
import MediaSelect from './MediaSelect.vue';

const props = defineProps({
	fields: { type: Array, default: () => [] },
	getValue: { type: Function, required: true },
	setValue: { type: Function, required: true },
	getFieldOptions: { type: Function, required: true },
	togglePasswordVisibility: { type: Function, required: true },
	isPasswordVisible: { type: Function, required: true },
	validationErrors: { type: Object, default: () => ({}) },
	providerKey: { type: String, required: true },
	hideEnableToggle: { type: Boolean, default: false }
});

const emit = defineEmits(['show-setup-instructions']);

const setupFields = () => props.fields.filter(f => f.type === 'setup_instructions');
const formFields = () => props.fields.filter(f => f.key !== 'enabled' && f.type !== 'setup_instructions');

const conditionMet = (cond) => {
	if (!cond) return true;
	if (typeof cond === 'string') return !!props.getValue(cond);
	if (Array.isArray(cond.all)) return cond.all.every(conditionMet);
	const value = props.getValue(cond.key);
	if ('value' in cond) return value === cond.value;
	if ('in' in cond) return cond.in.includes(value);
	if ('contains' in cond) return Array.isArray(value) && value.includes(cond.contains);
	if ('nonempty' in cond) return Array.isArray(value) ? value.length > 0 : !!value;
	if ('empty' in cond) return Array.isArray(value) ? value.length === 0 : !value;
	return !!value;
};

const fieldVisible = (field) => conditionMet(field.depends_on);

const optionsFor = (field) => Array.isArray(field.options) ? field.options : props.getFieldOptions(field);

const mediaSelectParams = (field) => {
	if (!field.depends_from) return {};
	const value = props.getValue(field.depends_from);
	return { media_ids: Array.isArray(value) ? value.join(',') : '' };
};

/**
 * Deselecting a media immediately drops its "mediaId:layerId" entries from
 * any picker scoped to it (matches save-time pruning).
 */
const onMediaSelectChange = (field, value) => {
	props.setValue(field.key, value);
	const kept = (Array.isArray(value) ? value : []).map(String);
	props.fields.forEach((f) => {
		if (f.depends_from !== field.key) return;
		const current = props.getValue(f.key);
		if (!Array.isArray(current) || !current.length) return;
		const pruned = current.filter((id) => kept.includes(String(id).split(':')[0]));
		if (pruned.length !== current.length) {
			props.setValue(f.key, pruned);
		}
	});
};

// consecutive indent:true fields render inside one fplayer-form-sub-items block
const renderGroups = () => {
	const groups = [];
	for (const field of formFields()) {
		const sub = !!field.indent;
		const last = groups[groups.length - 1];
		if (last && last.sub === sub) {
			last.fields.push(field);
		} else {
			groups.push({ sub, fields: [field] });
		}
	}
	return groups;
};

const groupVisible = (group) => group.fields.some(fieldVisible);
</script>

<template>
	<!-- Enable Toggle -->
	<div v-if="!hideEnableToggle" class="fplayer-form-item enabled-toggle-item">
		<el-switch
			class="fplayer-switch"
			:model-value="getValue('enabled')"
			@update:model-value="(val) => setValue('enabled', val)"
			:aria-label="$t('Enable Integration')"
		/>
		<div class="fplayer-form-label-wrapper">
			<label class="fplayer-form-label">{{ $t('Enable Integration') }}</label>
			<p class="fplayer-form-help">{{ $t('Turn on this switch to enable the integration.') }}</p>
		</div>
	</div>

	<!-- Setup Instructions Tip -->
	<div
		v-for="field in setupFields()"
		:key="field.key"
		class="config-alert"
	>
		<el-alert show-icon type="info" :closable="false">
			<template #title>{{ $t('Setup Required') }}</template>
			{{ $t('Please follow the instructions below to set up this integration.') }}
		</el-alert>
		<el-button
			class="fplayer-secondary-btn"
			@click="emit('show-setup-instructions', field.instructions)"
			type="primary" plain size="small" style="margin-top: 12px;" :icon="Opportunity">
			View Setup Instructions
		</el-button>
	</div>

	<!-- Fields -->
	<template v-for="(group, gi) in renderGroups()" :key="gi">
		<div v-if="group.sub" v-show="groupVisible(group)" class="fplayer-form-sub-items">
			<template v-for="field in group.fields" :key="field.key">
				<!-- Switch: convention layout — toggle left, label + help below -->
				<div
					v-if="field.type === 'checkbox' || field.type === 'switch'"
					v-show="fieldVisible(field)"
					class="fplayer-form-item fplayer-form-item--switch"
				>
					<el-switch
						class="fplayer-switch"
						:model-value="getValue(field.key)"
						@update:model-value="setValue(field.key, $event)"
						:aria-label="field.label"
					/>
					<div class="fplayer-form-label-wrapper">
						<label class="fplayer-form-label">{{ field.label }}</label>
						<p v-if="field.description || field.help" class="fplayer-form-help">{{ field.description || field.help }}</p>
					</div>
				</div>

				<!-- Inline notice (e.g. Event Tracking disabled) -->
				<div
					v-else-if="field.type === 'notice'"
					v-show="fieldVisible(field)"
					class="fplayer-form-notice"
					:class="'is-' + (field.variant || 'info')"
				>
					<span class="fplayer-form-notice-text">{{ field.text }}</span>
					<el-tooltip v-if="field.link?.url" :content="field.link.label" placement="top">
						<a
							:href="field.link.url"
							target="_blank"
							rel="noopener noreferrer"
							class="fplayer-form-notice-link"
							:aria-label="field.link.label"
						>
							<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
						</a>
					</el-tooltip>
				</div>

				<!-- Sub-field inputs: form-group layout -->
				<div
					v-else
					v-show="fieldVisible(field)"
					class="fplayer-form-group"
				>
					<label class="fplayer-form-group-label">
						{{ field.label }}
						<span v-if="field.required" class="required">*</span>
					</label>

					<el-checkbox-group
						v-if="field.type === 'checkbox_group'"
						:model-value="getValue(field.key) || []"
						@update:model-value="setValue(field.key, $event)"
					>
						<el-checkbox
							v-for="option in optionsFor(field)"
							:key="option.value"
							:label="option.value"
						>
							{{ option.label }}
						</el-checkbox>
					</el-checkbox-group>

					<el-radio-group
						v-else-if="field.type === 'radio'"
						:model-value="getValue(field.key)"
						@update:model-value="setValue(field.key, $event)"
					>
						<el-radio
							v-for="option in optionsFor(field)"
							:key="option.value"
							:label="option.value"
						>
							{{ option.label }}
						</el-radio>
					</el-radio-group>

					<MediaSelect
						v-else-if="field.type === 'media_select'"
						:field="field"
						:model-value="getValue(field.key) || []"
						:extra-params="mediaSelectParams(field)"
						@update:model-value="onMediaSelectChange(field, $event)"
					/>

					<el-input
						v-else
						:model-value="getValue(field.key)"
						@update:model-value="setValue(field.key, $event)"
						:type="field.type === 'number' ? 'number' : 'text'"
						:placeholder="field.placeholder"
						:aria-label="field.label"
					/>

					<p v-if="field.description || field.help" class="fplayer-form-group-help-text">{{ field.description || field.help }}</p>
				</div>
			</template>
		</div>

		<template v-else>
			<template v-for="field in group.fields" :key="field.key">
				<!-- Switch: convention layout — toggle left, label + help below -->
				<div
					v-if="field.type === 'checkbox' || field.type === 'switch'"
					v-show="fieldVisible(field)"
					class="fplayer-form-item fplayer-form-item--switch"
				>
					<el-switch
						class="fplayer-switch"
						:model-value="getValue(field.key)"
						@update:model-value="setValue(field.key, $event)"
						:aria-label="field.label"
					/>
					<div class="fplayer-form-label-wrapper">
						<label class="fplayer-form-label">{{ field.label }}</label>
						<p v-if="field.description || field.help" class="fplayer-form-help">{{ field.description || field.help }}</p>
					</div>
				</div>

				<!-- Top-level non-switch fields: legacy label/control rows -->
				<div
					v-else
					v-show="fieldVisible(field)"
					class="fplayer-form-item"
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
						<el-checkbox-group
							v-if="field.type === 'checkbox_group'"
							:model-value="getValue(field.key) || []"
							@update:model-value="setValue(field.key, $event)"
							:aria-label="field.label"
						>
							<el-checkbox
								v-for="option in optionsFor(field)"
								:key="option.value"
								:label="option.value"
							>
								{{ option.label }}
							</el-checkbox>
						</el-checkbox-group>

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

						<el-radio-group
							v-else-if="field.type === 'radio'"
							:model-value="getValue(field.key)"
							@update:model-value="setValue(field.key, $event)"
							:aria-label="field.label"
						>
							<el-radio
								v-for="option in optionsFor(field)"
								:key="option.value"
								:label="option.value"
							>
								{{ option.label }}
							</el-radio>
						</el-radio-group>

						<MediaSelect
							v-else-if="field.type === 'media_select'"
							:field="field"
							:model-value="getValue(field.key) || []"
							:extra-params="mediaSelectParams(field)"
							:aria-label="field.label"
							@update:model-value="onMediaSelectChange(field, $event)"
						/>

						<el-input
							v-else-if="field.type === 'textarea'"
							:model-value="getValue(field.key)"
							@update:model-value="setValue(field.key, $event)"
							type="textarea"
							:rows="3"
							:placeholder="field.placeholder"
							:class="{ 'is-error': validationErrors[providerKey]?.[field.key] }"
						/>

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

						<slot
							v-else-if="field.type === 'complex_array'"
							name="complex-array"
							:field="field"
						/>

						<el-input
							v-else
							:model-value="getValue(field.key)"
							@update:model-value="setValue(field.key, $event)"
							:type="field.type === 'number' ? 'number' : 'text'"
							:placeholder="field.placeholder"
							:class="{ 'is-error': validationErrors[providerKey]?.[field.key] }"
						/>

						<span v-if="validationErrors[providerKey]?.[field.key]" class="field-error">{{ $t('This field is required') }}</span>
					</div>
				</div>
			</template>
		</template>
	</template>

	<!-- After fields slot (for test connection, etc.) -->
	<slot name="after-fields" />
</template>
