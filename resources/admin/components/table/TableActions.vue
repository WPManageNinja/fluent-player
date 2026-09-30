<template>
    <div class="fplayer-row-actions">
        <!-- Inline icon buttons (icon-only, labelled for assistive tech) -->
        <template v-if="isTrashed">
            <el-button
                link
                class="fplayer-table-actions-trigger"
                :aria-label="$t('Restore')"
                :title="$t('Restore')"
                @click.stop="handleRestore"
            >
                <el-icon><IconRestore :size="18" /></el-icon>
            </el-button>
            <el-popconfirm
                :title="$t('Permanently delete this? This cannot be undone.')"
                :confirm-button-text="$t('Delete')"
                :cancel-button-text="$t('Cancel')"
                confirm-button-type="danger"
                @confirm="handleForceDelete(props.row)"
                width="240"
            >
                <template #reference>
                    <el-button
                        link
                        class="fplayer-table-actions-trigger fplayer-action-danger"
                        :aria-label="$t('Delete Permanently')"
                        :title="$t('Delete Permanently')"
                        @click.stop
                    >
                        <el-icon><IconDelete :size="18" /></el-icon>
                    </el-button>
                </template>
            </el-popconfirm>
        </template>
        <template v-else>
            <el-button
                link
                class="fplayer-table-actions-trigger"
                :aria-label="$t('View')"
                :title="$t('View')"
                @click.stop="handleView(props.row)"
            >
                <el-icon><IconView :size="18" /></el-icon>
            </el-button>
            <el-button
                link
                class="fplayer-table-actions-trigger"
                :aria-label="$t('Edit')"
                :title="$t('Edit')"
                @click.stop="handleEditClick"
            >
                <el-icon><IconEdit :size="18" /></el-icon>
            </el-button>

            <el-dropdown @command="handleCommand">
                <el-button link class="fplayer-table-actions-trigger" :aria-label="$t('More actions')" :title="$t('More actions')" @click.stop>
                    <el-icon>
                        <svg xmlns="http://www.w3.org/2000/svg" width="3" height="14" viewBox="0 0 3 14" fill="none" aria-hidden="true">
                            <path d="M1.125 0C0.50625 0 0 0.50625 0 1.125C0 1.74375 0.50625 2.25 1.125 2.25C1.74375 2.25 2.25 1.74375 2.25 1.125C2.25 0.50625 1.74375 0 1.125 0ZM1.125 11.25C0.50625 11.25 0 11.7563 0 12.375C0 12.9938 0.50625 13.5 1.125 13.5C1.74375 13.5 2.25 12.9938 2.25 12.375C2.25 11.7563 1.74375 11.25 1.125 11.25ZM1.125 5.625C0.50625 5.625 0 6.13125 0 6.75C0 7.36875 0.50625 7.875 1.125 7.875C1.74375 7.875 2.25 7.36875 2.25 6.75C2.25 6.13125 1.74375 5.625 1.125 5.625Z" fill="#525866"/>
                        </svg>
                    </el-icon>
                </el-button>
                <template #dropdown>
                    <el-dropdown-menu class="fplayer-table-actions-dropdown">
                        <el-dropdown-item v-if="editPostType === 'fluent_player_media' && isProActive" command="analytics" @click.native="captureEvent">
                            <div class="fplayer-icon-wrapper">
                                <IconAnalytics :size="18" />
                                <span class="fplayer-icon-label">{{ $t('Analytics') }}</span>
                            </div>
                        </el-dropdown-item>
                        <el-popconfirm
                            :title="$t('Move this to trash?')"
                            @confirm="handleDelete(props.row)"
                            width="200"
                        >
                            <template #reference>
                                <div class="el-dropdown-menu__item text-danger" @click.stop>
                                    <div class="fplayer-icon-wrapper">
                                        <IconDelete :size="18" />
                                        <span class="fplayer-icon-label">{{ $t('Trash') }}</span>
                                    </div>
                                </div>
                            </template>
                        </el-popconfirm>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
        </template>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import IconView from '@components/icons/IconView.vue';
import IconEdit from '@components/icons/IconEdit.vue';
import IconRestore from '@components/icons/IconRestore.vue';
import IconAnalytics from '@components/icons/IconAnalytics.vue';
import IconDelete from '@components/icons/IconDelete.vue';
import { usePostNavigation } from '@/composables/usePostNavigation';
import { useProFeatures } from '@/composables/useFeatures.js';

const { isProActive } = useProFeatures();

const router = useRouter();

const props = defineProps({
    row: {
        type: Object,
        required: true
    },
    viewUrlKey: {
        type: String,
        required: true
    },
    editPostType: {
        type: String,
        default: null
    }
});

const emit = defineEmits(['delete', 'restore', 'force-delete']);

const isTrashed = computed(() => props.row?.post_status === 'trash');

const { handleEdit, handleView: viewPost } = usePostNavigation(props);

// Wrapper to pass viewUrlKey
const handleView = (item) => viewPost(item, props.viewUrlKey);

// Inline Edit keeps the ctrl/cmd-click "open in new tab" behavior by forwarding the event.
const handleEditClick = (event) => handleEdit(props.row, event);

const handleRestore = () => {
    emit('restore', props.row);
};

const handleDelete = (item) => {
    emit('delete', item);
};

const handleForceDelete = (item) => {
    emit('force-delete', item);
};

let lastEvent = null;

const captureEvent = (event) => {
    lastEvent = event;
};

const handleCommand = (command) => {
    const event = lastEvent;
    lastEvent = null;

    if (command === 'analytics') {
        if (event && (event.metaKey || event.ctrlKey)) {
            const route = router.resolve({ name: 'analytics.video', params: { id: props.row.ID } });
            window.open(route.href, '_blank');
        } else {
            router.push({ name: 'analytics.video', params: { id: props.row.ID } });
        }
    }
};
</script>
