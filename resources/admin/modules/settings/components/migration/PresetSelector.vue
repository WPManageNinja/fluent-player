<template>
    <el-dialog
        :model-value="modelValue"
        :title="$t('Select Presets to Import')"
        width="500px"
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <div class="fplayer-migration-media-selector">
            <div class="fplayer-migration-media-select-all">
                <el-checkbox
                    :model-value="allSelected"
                    :indeterminate="someSelected && !allSelected"
                    @change="toggleAll"
                >
                    {{ $t('Select All') }} ({{ items.length }})
                </el-checkbox>
            </div>

            <div class="fplayer-migration-media-list">
                <div
                    v-for="preset in items"
                    :key="preset.uid"
                    class="fplayer-migration-media-item"
                >
                    <el-checkbox
                        :model-value="selected.includes(preset.uid)"
                        @change="toggleItem(preset.uid)"
                    >
                        <span class="fplayer-migration-media-title">{{ preset.name || $t('(Untitled)') }}</span>
                    </el-checkbox>
                </div>
            </div>

            <div class="fplayer-migration-media-footer">
                {{ $t('Selected:') }} {{ selected.length }} {{ $t('of') }} {{ items.length }}
            </div>
        </div>

        <template #footer>
            <el-button class="fplayer-primary-btn" @click="$emit('update:modelValue', false)">{{ $t('Done') }}</el-button>
        </template>
    </el-dialog>
</template>

<script setup>
    import { computed } from 'vue';

    const props = defineProps({
        modelValue: Boolean,
        items: { type: Array, default: () => [] },
        selected: { type: Array, default: () => [] },
    });

    const emit = defineEmits(['update:modelValue', 'update:selected']);

    const allSelected = computed(() => props.items.length > 0 && props.items.every(p => props.selected.includes(p.uid)));
    const someSelected = computed(() => props.items.some(p => props.selected.includes(p.uid)));

    const toggleAll = (checked) => {
        emit('update:selected', checked ? props.items.map(p => p.uid) : []);
    };

    const toggleItem = (uid) => {
        const next = [...props.selected];
        const idx = next.indexOf(uid);
        if (idx >= 0) {
            next.splice(idx, 1);
        } else {
            next.push(uid);
        }
        emit('update:selected', next);
    };
</script>
