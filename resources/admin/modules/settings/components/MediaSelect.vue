<script setup>
import { useRemoteOptions } from '@/composables/useRemoteOptions.js';

const props = defineProps({
	field: { type: Object, required: true },
	modelValue: { type: Array, default: () => [] },
	extraParams: { type: Object, default: () => ({}) },
	ariaLabel: { type: String, default: '' }
});

const emit = defineEmits(['update:modelValue']);

const {
	options, groups, loading, serverSearch, extraSeedOptions,
	debouncedSearch, onVisibleChange
} = useRemoteOptions({
	endpoint: props.field.endpoint,
	getSeededOptions: () => props.field.selected_options || [],
	getParams: () => props.extraParams,
	clearOnEmptyParam: 'media_ids'
});
</script>

<template>
	<el-select
		:model-value="modelValue"
		@update:model-value="emit('update:modelValue', $event)"
		style="width: 100%"
		multiple
		filterable
		:aria-label="ariaLabel || field.placeholder || field.label"
		:remote="serverSearch"
		:remote-method="serverSearch ? debouncedSearch : undefined"
		:loading="loading"
		:placeholder="field.placeholder || ''"
		:no-data-text="field.empty_text || $t('No results')"
		popper-class="fplayer-media-select-popper"
		@visible-change="onVisibleChange"
	>
		<el-option
			v-for="option in extraSeedOptions"
			:key="'seed-' + option.value"
			:label="option.label"
			:value="option.value"
		/>
		<template v-if="field.grouped">
			<el-option-group v-for="group in groups" :key="group.label" :label="group.label">
				<el-option
					v-for="option in group.options"
					:key="option.value"
					:label="option.label"
					:value="option.value"
				/>
			</el-option-group>
		</template>
		<template v-else>
			<el-option
				v-for="option in options"
				:key="option.value"
				:label="option.label"
				:value="option.value"
			/>
		</template>
	</el-select>
</template>
