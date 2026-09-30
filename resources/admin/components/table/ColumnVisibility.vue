<template>
    <el-popover
        placement="bottom-end"
        trigger="click"
        :width="240"
        popper-class="fplayer-column-visibility-popover"
    >
        <template #reference>
            <button
                type="button"
                class="fplayer-header-filters-search-trigger fplayer-column-visibility-trigger"
                :aria-label="$t('Toggle columns')"
                :title="$t('Toggle columns')"
            >
                <IconColumns :size="18" />
            </button>
        </template>

        <div class="fplayer-column-visibility-panel">
            <div class="fplayer-column-visibility-title">{{ $t('Columns') }}</div>
            <div class="fplayer-column-visibility-group">
                <el-checkbox
                    v-for="col in columns"
                    :key="col.key"
                    :model-value="col.visible"
                    class="fplayer-column-visibility-item"
                    @change="() => emit('toggle', col.key)"
                >
                    {{ col.label }}
                </el-checkbox>
            </div>
        </div>
    </el-popover>
</template>

<script setup>
import IconColumns from '@components/icons/IconColumns.vue';

defineProps({
    columns: {
        type: Array,
        default: () => [],
    },
});

const emit = defineEmits(['toggle']);
</script>
