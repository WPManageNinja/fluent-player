<template>
    <el-dialog
        :model-value="modelValue"
        :title="$t('Select Media to Import')"
        width="700px"
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <div class="fplayer-migration-media-selector">
            <div class="fplayer-migration-media-filters">
                <div class="fplayer-migration-media-tabs">
                    <el-button
                        v-for="tab in mediaTabs"
                        :key="tab.key"
                        :class="filter === tab.key ? 'fplayer-primary-btn' : 'fplayer-secondary-btn'"
                        size="small"
                        @click="filter = tab.key"
                    >
                        {{ tab.label }} ({{ tab.count }})
                    </el-button>
                </div>
                <el-input
                    v-model="search"
                    :placeholder="$t('Search by title...')"
                    clearable
                    size="small"
                    class="fplayer-migration-media-search"
                />
            </div>

            <div class="fplayer-migration-media-select-all">
                <el-checkbox
                    :model-value="allSelected"
                    :indeterminate="someSelected && !allSelected"
                    @change="toggleAll"
                >
                    {{ $t('Select All') }} ({{ filtered.length }})
                </el-checkbox>
            </div>

            <div class="fplayer-migration-media-list">
                <div
                    v-for="item in filtered"
                    :key="item.id"
                    class="fplayer-migration-media-item"
                >
                    <el-checkbox
                        :model-value="selected.includes(item.id)"
                        :disabled="isProRequired(item) && !hasProActive"
                        @change="toggleItem(item.id)"
                    >
                        <span style="display: inline-flex; align-items: center; gap: 6px;">
                            <span class="fplayer-migration-media-title">{{ item.title }}</span>
                            <el-tag size="small" type="info">{{ providerLabel(item.provider) }}</el-tag>
                            <el-tag v-if="isProRequired(item) && !hasProActive && !isImported(item.id)" size="small" type="warning">{{ $t('Pro') }}</el-tag>
                            <el-tag v-if="isImported(item.id)" size="small" type="success">{{ $t('Imported') }}</el-tag>
                        </span>
                    </el-checkbox>
                </div>
                <div v-if="!filtered.length" class="fplayer-migration-media-empty">
                    {{ $t('No media found matching your filters.') }}
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
    import { ref, computed } from 'vue';

    const props = defineProps({
        modelValue: Boolean,
        items: { type: Array, default: () => [] },
        selected: { type: Array, default: () => [] },
        hasProActive: Boolean,
        mediaMap: { type: Object, default: () => ({}) },
        mediaCounts: { type: Object, default: () => ({}) },
    });

    const emit = defineEmits(['update:modelValue', 'update:selected']);

    const filter = ref('all');
    const search = ref('');

    const providerLabels = { youtube: 'YouTube', self_hosted: 'Self-hosted', vimeo: 'Vimeo', audio: 'Audio', bunny: 'Bunny' };
    const providerLabel = (provider) => providerLabels[provider] || provider;
    const isProRequired = (item) => item.provider === 'bunny';
    const isImported = (ppPostId) => !!props.mediaMap[ppPostId];

    const mediaTabs = computed(() => {
        const m = props.mediaCounts;
        return [
            { key: 'all', label: 'All', count: m.total || 0 },
            { key: 'youtube', label: 'YouTube', count: m.youtube || 0 },
            { key: 'self_hosted', label: 'Self-hosted', count: m.self_hosted || 0 },
            { key: 'vimeo', label: 'Vimeo', count: m.vimeo || 0 },
            { key: 'audio', label: 'Audio', count: m.audio || 0 },
            { key: 'bunny', label: 'Bunny', count: m.bunny || 0 },
        ].filter(t => t.key === 'all' || t.count > 0);
    });

    const filtered = computed(() => {
        let list = props.items;
        if (filter.value !== 'all') {
            list = list.filter(m => m.provider === filter.value);
        }
        if (search.value) {
            const q = search.value.toLowerCase();
            list = list.filter(m => m.title.toLowerCase().includes(q));
        }
        return list;
    });

    const allSelected = computed(() => filtered.value.length > 0 && filtered.value.every(m => props.selected.includes(m.id)));
    const someSelected = computed(() => filtered.value.some(m => props.selected.includes(m.id)));

    const toggleAll = (checked) => {
        const selectable = filtered.value.filter(m => props.hasProActive || !isProRequired(m));
        const ids = selectable.map(m => m.id);
        if (checked) {
            emit('update:selected', [...new Set([...props.selected, ...ids])]);
        } else {
            emit('update:selected', props.selected.filter(id => !ids.includes(id)));
        }
    };

    const toggleItem = (id) => {
        const idx = props.selected.indexOf(id);
        const next = [...props.selected];
        if (idx >= 0) {
            next.splice(idx, 1);
        } else {
            next.push(id);
        }
        emit('update:selected', next);
    };
</script>
