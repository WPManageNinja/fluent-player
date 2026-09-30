<template>
    <div class="fplayer-bulk-action-bar">
        <div class="fplayer-bulk-action-bar-controls">
            <el-select
                v-model="selectedAction"
                :placeholder="$t('Select bulk action')"
                :aria-label="$t('Select bulk action')"
                popper-class="fplayer-bulk-dropdown"
                class="fplayer-bulk-action-select"
            >
                <el-option
                    v-for="action in availableActions"
                    :key="action.value"
                    :label="action.label"
                    :value="action.value"
                />
            </el-select>

            <el-select
                v-if="selectedAction === 'change_status'"
                v-model="statusValue"
                :placeholder="$t('Set status')"
                :aria-label="$t('Set status')"
                popper-class="fplayer-bulk-dropdown"
                class="fplayer-bulk-action-param"
            >
                <el-option
                    v-for="status in statusOptions"
                    :key="status.value"
                    :label="status.label"
                    :value="status.value"
                />
            </el-select>

            <el-select
                v-else-if="selectedAction === 'add_tags'"
                v-model="addTagsValue"
                multiple
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
                :placeholder="$t('Type or pick tags')"
                :aria-label="$t('Tags to add')"
                popper-class="fplayer-bulk-dropdown"
                class="fplayer-bulk-action-param fplayer-bulk-action-param--wide"
            >
                <el-option v-for="tag in allTags" :key="tag" :label="tag" :value="tag" />
            </el-select>

            <el-select
                v-else-if="selectedAction === 'remove_tags'"
                v-model="removeTagsValue"
                multiple
                filterable
                :placeholder="$t('Pick tags to remove')"
                :aria-label="$t('Tags to remove')"
                popper-class="fplayer-bulk-dropdown"
                class="fplayer-bulk-action-param fplayer-bulk-action-param--wide"
            >
                <el-option v-for="tag in selectionTags" :key="tag" :label="tag" :value="tag" />
            </el-select>

            <el-select
                v-else-if="selectedAction === 'add_to_playlist'"
                v-model="playlistValue"
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
                :loading="playlistsLoading"
                :placeholder="$t('Pick a playlist or type to create')"
                :aria-label="$t('Target playlist')"
                popper-class="fplayer-bulk-dropdown"
                class="fplayer-bulk-action-param fplayer-bulk-action-param--wide"
            >
                <el-option
                    v-for="playlist in playlists"
                    :key="playlist.ID"
                    :label="playlist.post_title"
                    :value="playlist.ID"
                />
            </el-select>

            <el-popconfirm
                v-if="needsConfirm"
                :title="confirmTitle"
                width="260"
                confirm-button-type="danger"
                :confirm-button-text="$t('Delete')"
                :cancel-button-text="$t('Cancel')"
                @confirm="doApply"
            >
                <template #reference>
                    <el-button
                        :type="isDanger ? 'danger' : 'primary'"
                        :class="confirmClass"
                        :disabled="!canConfirm"
                        :loading="busy"
                    >
                        {{ confirmLabel }}
                    </el-button>
                </template>
            </el-popconfirm>
            <el-button
                v-else
                :type="isDanger ? 'danger' : 'primary'"
                :class="confirmClass"
                :disabled="!canConfirm"
                :loading="busy"
                @click="doApply"
            >
                {{ confirmLabel }}
            </el-button>
        </div>

        <div class="fplayer-bulk-action-bar-meta">
            <span class="fplayer-bulk-action-count">{{ $t('%d item(s) selected', selectedRows.length) }}</span>
            <button
                type="button"
                class="fplayer-bulk-action-clear fplayer-icon-wrapper"
                :aria-label="$t('Clear selection')"
                :title="$t('Clear selection')"
                @click="emit('clear')"
            >
                <IconCloseLine :size="12" />
            </button>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import __ from '@/utils/translator/Translator';
import Rest from '@/utils/http/Rest';
import Notify from '@/utils/Notify';
import IconCloseLine from '@components/icons/IconCloseLine.vue';

const props = defineProps({
    selectedRows: {
        type: Array,
        default: () => [],
    },
    entity: {
        type: String,
        default: 'media',
    },
    hasPro: {
        type: Boolean,
        default: false,
    },
    allTags: {
        type: Array,
        default: () => [],
    },
    busy: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['apply', 'clear']);

const selectedAction = ref('');
const statusValue = ref('');
const addTagsValue = ref([]);
const removeTagsValue = ref([]);
const playlistValue = ref('');
const playlists = ref([]);
const playlistsLoading = ref(false);
const playlistsLoaded = ref(false);

const CONFIRM_ACTIONS = ['delete_permanently'];
const DANGER_ACTIONS = ['trash', 'delete_permanently', 'remove_tags'];

const nonTrashRows = computed(() => props.selectedRows.filter((r) => r.post_status !== 'trash'));
const trashedRows = computed(() => props.selectedRows.filter((r) => r.post_status === 'trash'));
const taggedRows = computed(() => nonTrashRows.value.filter((r) => (r.tags?.length || 0) > 0));

const selectionTags = computed(() => {
    const set = {};
    nonTrashRows.value.forEach((r) => {
        (r.tags || []).forEach((t) => {
            set[t] = true;
        });
    });
    return Object.keys(set);
});

const statusOptions = computed(() => [
    { value: 'publish', label: __('Public') },
    { value: 'private', label: __('Private') },
    { value: 'draft', label: __('Draft') },
]);

const availableActions = computed(() => {
    const actions = [];
    const isMedia = props.entity === 'media';
    const hasNonTrash = nonTrashRows.value.length > 0;
    const hasTrashed = trashedRows.value.length > 0;

    if (hasNonTrash) {
        actions.push({ value: 'change_status', label: __('Change status') });

        if (isMedia && props.hasPro) {
            actions.push({ value: 'add_tags', label: __('Add tags') });
            if (taggedRows.value.length > 0) {
                actions.push({ value: 'remove_tags', label: __('Remove tags') });
            }
            actions.push({ value: 'add_to_playlist', label: __('Add to playlist') });
        }

        actions.push({ value: 'trash', label: __('Move to Trash') });
    }

    if (hasTrashed) {
        actions.push({ value: 'restore', label: __('Restore') });

        // Delete permanently is only offered from the Trash list (i.e. when every
        // selected row is trashed) — never on all/public/private/draft/scheduled.
        if (!hasNonTrash) {
            actions.push({ value: 'delete_permanently', label: __('Delete permanently') });
        }
    }

    return actions;
});

watch(availableActions, (actions) => {
    if (selectedAction.value && !actions.some((a) => a.value === selectedAction.value)) {
        selectedAction.value = '';
    }
});

watch(selectedAction, (action) => {
    statusValue.value = '';
    addTagsValue.value = [];
    removeTagsValue.value = [];
    playlistValue.value = '';

    if (action === 'add_to_playlist' && !playlistsLoaded.value) {
        fetchPlaylists();
    }
});

const fetchPlaylists = async () => {
    playlistsLoading.value = true;
    try {
        const response = await Rest.get('playlist', { per_page: 100, status: 'all' });
        playlists.value = response.data || [];
        playlistsLoaded.value = true;
    } catch (e) {
        Notify.error('Failed to load playlists');
    } finally {
        playlistsLoading.value = false;
    }
};

const needsConfirm = computed(() => CONFIRM_ACTIONS.includes(selectedAction.value));
const isDanger = computed(() => DANGER_ACTIONS.includes(selectedAction.value));

const confirmClass = computed(() => (isDanger.value
    ? 'fplayer-bulk-action-confirm fplayer-bulk-action-confirm--danger'
    : 'fplayer-primary-btn fplayer-bulk-action-confirm'));

const confirmTitle = computed(() => __('Permanently delete the selected items? This cannot be undone.'));

const isNewPlaylistTitle = computed(() => {
    if (selectedAction.value !== 'add_to_playlist' || typeof playlistValue.value === 'number') {
        return false;
    }
    const title = String(playlistValue.value || '').trim();
    if (!title) {
        return false;
    }
    return !playlists.value.some((p) => String(p.post_title).trim().toLowerCase() === title.toLowerCase());
});

const confirmLabel = computed(() => {
    // Keep a generic label; only change it where it adds information.
    if (selectedAction.value === 'add_to_playlist' && isNewPlaylistTitle.value) {
        return __('Create new');
    }
    return __('Confirm');
});

const normalizedAddTags = computed(() => {
    const seen = {};
    const result = [];
    addTagsValue.value.forEach((raw) => {
        const tag = String(raw).trim();
        if (!tag) {
            return;
        }
        const key = tag.toLowerCase();
        if (seen[key]) {
            return;
        }
        seen[key] = true;
        result.push(tag);
    });
    return result;
});

const canConfirm = computed(() => {
    if (!selectedAction.value || props.busy) {
        return false;
    }
    switch (selectedAction.value) {
        case 'change_status':
            return !!statusValue.value;
        case 'add_tags':
            return normalizedAddTags.value.length > 0;
        case 'remove_tags':
            return removeTagsValue.value.length > 0;
        case 'add_to_playlist':
            return typeof playlistValue.value === 'number' || String(playlistValue.value).trim().length > 0;
        default:
            return true;
    }
});

const resolvePlaylistPayload = () => {
    const value = playlistValue.value;
    if (typeof value === 'number') {
        return { playlist_id: value };
    }
    const title = String(value).trim();
    const existing = playlists.value.find((p) => String(p.post_title).trim().toLowerCase() === title.toLowerCase());
    return existing ? { playlist_id: existing.ID } : { new_playlist_title: title };
};

const doApply = () => {
    if (!canConfirm.value) {
        return;
    }

    let payload = {};
    switch (selectedAction.value) {
        case 'change_status':
            payload = { status: statusValue.value };
            break;
        case 'add_tags':
            payload = { tags: normalizedAddTags.value };
            break;
        case 'remove_tags':
            payload = { tags: removeTagsValue.value };
            break;
        case 'add_to_playlist':
            payload = resolvePlaylistPayload();
            break;
    }

    emit('apply', { action: selectedAction.value, payload });
};
</script>
