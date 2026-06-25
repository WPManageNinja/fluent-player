<template>
    <div class="fplayer-header-filters">
        <div class="fplayer-header-filters-tabs">
            <button 
                v-for="filter in statusFilters"
                :key="filter.key"
                type="button"
                :class="['fplayer-header-filters-tab', { 'fplayer-header-filters-tab-active': currentFilter === filter.key }]"
                :aria-pressed="currentFilter === filter.key"
                @click="handleFilterChange(filter.key)"
            >
                {{ filter.label }}
            </button>
        </div>
        <div class="fplayer-header-filters-actions">
            <el-popover
                v-if="hasCombinedFilters"
                placement="bottom-end"
                trigger="click"
                width="320"
                popper-class="fplayer-header-filters-popover"
                v-model:visible="popoverVisible"
                @show="handlePopoverShow"
            >
                <template #reference>
                    <div class="fplayer-header-filters-popover-trigger-wrap">
                        <button
                            ref="popoverTriggerRef"
                            type="button"
                            class="fplayer-header-filters-popover-trigger"
                            :class="{ 'fplayer-header-filters-popover-trigger-has-clear': activeFilterCount }"
                            :aria-label="$t('Filters')"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                            </svg>
                            <span>{{ $t('Filters') }}</span>
                            <span v-if="activeFilterCount" class="fplayer-header-filters-popover-count">{{ activeFilterCount }}</span>
                        </button>
                        <button
                            v-if="activeFilterCount"
                            type="button"
                            class="fplayer-header-filters-popover-clear"
                            :aria-label="$t('Clear all filters')"
                            :title="$t('Clear all filters')"
                            @click.stop.prevent="clearCombinedFilters"
                            @keydown.enter.stop.prevent="clearCombinedFilters"
                            @keydown.space.stop.prevent="clearCombinedFilters"
                        >
                            <icon-close-line :size="10" />
                        </button>
                    </div>
                </template>

                <div ref="popoverContentRef" class="fplayer-header-filters-popover-content" @keydown="handlePopoverKeydown">
                    <div
                        v-for="filter in extraFilters"
                        :key="filter.key"
                        class="fplayer-header-filters-field"
                    >
                        <div class="fplayer-header-filters-field-label">{{ filter.label }}</div>
                        <el-select
                            :model-value="extraFilterValues[filter.key] || []"
                            :placeholder="filter.placeholder || filter.label"
                            clearable
                            filterable
                            multiple
                            :teleported="false"
                            collapse-tags
                            collapse-tags-tooltip
                            size="default"
                            class="fplayer-header-filters-field-select"
                            @change="(val) => emit('extra-filter-change', { key: filter.key, value: val || [] })"
                        >
                            <el-option
                                v-for="option in filter.options || []"
                                :key="option.value"
                                :label="option.label"
                                :value="option.value"
                            />
                        </el-select>
                    </div>

                    <div v-if="tagFilters.length > 0" class="fplayer-header-filters-field">
                        <div class="fplayer-header-filters-field-header">
                            <div class="fplayer-header-filters-field-label">{{ $t('Tags') }}</div>
                            <button
                                v-if="hasPro"
                                type="button"
                                class="fplayer-header-filters-manage-link"
                                :aria-label="$t('Manage Tags')"
                                :title="$t('Manage Tags')"
                                @click="emit('manage-tags')"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <path d="M20.59 13.41 12 22l-9-9V4h9z" />
                                    <path d="M7 7h.01" />
                                </svg>
                            </button>
                        </div>
                        <el-select
                            :model-value="currentTag"
                            :placeholder="$t('All Tags')"
                            clearable
                            filterable
                            multiple
                            :teleported="false"
                            collapse-tags
                            collapse-tags-tooltip
                            size="default"
                            class="fplayer-header-filters-field-select"
                            popper-class="fplayer-tag-select-dropdown"
                            @change="(val) => emit('tag-change', val || [])"
                        >
                            <el-option
                                v-for="tag in filteredTagFilters"
                                :key="tag"
                                :label="tag"
                                :value="tag"
                            />
                        </el-select>
                    </div>

                    <div v-if="activeFilterCount" class="fplayer-header-filters-popover-actions">
                        <button
                            type="button"
                            class="fplayer-header-filters-reset"
                            @click="clearCombinedFilters"
                        >
                            {{ $t('Clear all') }}
                        </button>
                    </div>
                </div>
            </el-popover>
            <div
                ref="searchContainerRef"
                class="fplayer-header-filters-search"
                :class="{ 'fplayer-header-filters-search--expanded': searchExpanded }"
                @focusout="(e) => handleSearchFocusOut(e)"
            >
                <div class="fplayer-header-filters-search-input-wrap">
                    <el-input
                        ref="searchInputRef"
                        :model-value="searchQuery"
                        :placeholder="$t('Search...')"
                        @input="handleSearchInput"
                        :clearable="false"
                        @keydown.escape="handleEscape"
                    />
                </div>
                <button
                    ref="searchTriggerRef"
                    type="button"
                    class="fplayer-header-filters-search-trigger fplayer-icon-wrapper"
                    :aria-label="hasSearchValue ? $t('Clear search') : $t('Search')"
                    @click="handleTriggerClick"
                >
                    <icon-close-line v-if="hasSearchValue" :size="10" />
                    <icon-search v-else :size="16" />
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import debounce from 'lodash/debounce';
import IconSearch from './icons/IconSearch.vue';
import IconCloseLine from './icons/IconCloseLine.vue';

const props = defineProps({
    currentFilter: {
        type: String,
        required: true
    },
    searchQuery: {
        type: String,
        required: true
    },
    statusFilters: {
        type: Array,
        default: () => []
    },
    tagFilters: {
        type: Array,
        default: () => []
    },
    hasPro: {
        type: Boolean,
        default: false
    },
    currentTag: {
        type: [String, Array],
        default: () => []
    },
    extraFilters: {
        type: Array,
        default: () => []
    },
    extraFilterValues: {
        type: Object,
        default: () => ({})
    }
});

const emit = defineEmits(['filter-change', 'search', 'update:searchQuery', 'tag-change', 'manage-tags', 'extra-filter-change', 'clear-combined-filters']);

const searchExpanded = ref(false);
const searchInputRef = ref(null);
const searchContainerRef = ref(null);
const popoverContentRef = ref(null);
const popoverVisible = ref(false);
const popoverTriggerRef = ref(null);
const searchTriggerRef = ref(null);

const hasSearchValue = computed(() => props.searchQuery.trim() !== '');
const hasCombinedFilters = computed(() => props.extraFilters.length > 0 || props.tagFilters.length > 0);
const activeFilterCount = computed(() => {
    let count = Array.isArray(props.currentTag)
        ? props.currentTag.filter(Boolean).length
        : (props.currentTag ? 1 : 0);

    count += Object.values(props.extraFilterValues || {}).reduce((total, value) => {
        if (Array.isArray(value)) {
            return total + value.filter(Boolean).length;
        }

        return total + (value ? 1 : 0);
    }, 0);

    return count;
});
const filteredTagFilters = computed(() => {
    return props.tagFilters;
});

const emitSearchDebounced = debounce(() => emit('search'), 500);

function handleTriggerClick() {
    if (searchExpanded.value && hasSearchValue.value) {
        emitSearchDebounced.cancel();
        emit('update:searchQuery', '');
        emit('search');
        searchExpanded.value = false;
    } else {
        searchExpanded.value = !searchExpanded.value;
        if (searchExpanded.value) {
            nextTick(() => {
                searchInputRef.value?.focus?.();
            });
        }
    }
}

function handleSearchFocusOut(event) {
    if (!event || (event.relatedTarget && searchContainerRef.value?.contains(event.relatedTarget))) {
        return;
    }
    nextTick(() => {
        const el = searchContainerRef.value;
        if (el && !el.contains(document.activeElement) && !hasSearchValue.value) {
            searchExpanded.value = false;
        }
    });
}

function handleEscape() {
    if (hasSearchValue.value) {
        emit('update:searchQuery', '');
        emit('search');
    }
    searchExpanded.value = false;
}

function getPopoverFocusables() {
    const content = popoverContentRef.value;
    if (!content) return [];
    return Array.from(
        content.querySelectorAll('button:not([disabled]), [role="combobox"], input:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter(el => el.offsetParent !== null);
}

function handlePopoverShow() {
    nextTick(() => {
        const focusables = getPopoverFocusables();
        focusables[0]?.focus();
    });
}

function handlePopoverKeydown(e) {
    if (e.key === 'Escape') {
        const selectEl = document.activeElement?.closest('.el-select');
        if (selectEl?.querySelector('[aria-expanded="true"]')) return;
        e.stopPropagation();
        popoverVisible.value = false;
        nextTick(() => popoverTriggerRef.value?.focus());
        return;
    }
    if (e.key !== 'Tab') return;

    const focusables = getPopoverFocusables();
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        popoverVisible.value = false;
        nextTick(() => popoverTriggerRef.value?.focus());
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        popoverVisible.value = false;
        nextTick(() => searchTriggerRef.value?.focus());
    }
}

const clearCombinedFilters = () => {
    emit('clear-combined-filters');
};

watch(searchExpanded, (expanded) => {
    if (expanded) {
        nextTick(() => {
            searchInputRef.value?.focus?.();
        });
    }
});

const handleFilterChange = (filterKey) => {
    emit('filter-change', filterKey);
};

const handleSearchInput = (value) => {
    emit('update:searchQuery', value);
    emitSearchDebounced();
};

onBeforeUnmount(() => {
    emitSearchDebounced.cancel();
});
</script>
