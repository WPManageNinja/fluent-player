<template>
    <el-dialog
        :model-value="modelValue"
        :title="$t('Manage Tags')"
        width="480px"
        class="fplayer-manage-tags-modal"
        @update:model-value="emit('update:modelValue', $event)"
        @close="close"
        append-to-body
    >
        <div v-loading="loading" class="fplayer-manage-tags-content">
            <div v-if="!loading && tags.length === 0" class="fplayer-manage-tags-empty">
                {{ $t('No tags found') }}
            </div>
            <div
                v-for="tag in tags"
                :key="tag.name"
                class="fplayer-manage-tags-row"
            >
                <template v-if="editingTag === tag.name">
                    <el-input
                        v-model="editValue"
                        size="default"
                        class="fplayer-manage-tags-input"
                        @keydown.enter="saveRename(tag)"
                        @keydown.escape="cancelEditing"
                    />
                    <div class="fplayer-manage-tags-row-actions">
                        <el-button
                            size="small"
                            type="primary"
                            class="fplayer-primary-btn"
                            :loading="savingTag === tag.name"
                            @click="saveRename(tag)"
                        >
                            {{ $t('Save') }}
                        </el-button>
                        <el-button size="small" @click="cancelEditing">
                            {{ $t('Cancel') }}
                        </el-button>
                    </div>
                </template>

                <template v-else>
                    <div
                        class="fplayer-manage-tags-name"
                        @click="startEditing(tag)"
                        :title="$t('Click to rename')"
                    >
                        <span>{{ tag.name }}</span>
                        <el-tag size="small" type="info" class="fplayer-manage-tags-count">
                            {{ tag.count }}
                        </el-tag>
                    </div>
                    <div class="fplayer-manage-tags-row-actions">
                        <el-popconfirm
                            :title="$t('Delete this tag?')"
                            @confirm="handleDelete(tag)"
                            width="200"
                        >
                            <template #reference>
                                <el-button
                                    size="small"
                                    type="danger"
                                    plain
                                    :loading="deletingTag === tag.name"
                                    @click.stop
                                >
                                    {{ $t('Delete') }}
                                </el-button>
                            </template>
                        </el-popconfirm>
                    </div>
                </template>
            </div>

            <div v-if="isCreating" class="fplayer-manage-tags-row">
                <el-input
                    ref="createInputRef"
                    v-model="createValue"
                    size="default"
                    class="fplayer-manage-tags-input"
                    :placeholder="$t('Enter tag name')"
                    @keydown.enter="createTag"
                    @keydown.escape="cancelCreate"
                />
                <div class="fplayer-manage-tags-row-actions">
                    <el-button
                        size="small"
                        type="primary"
                        class="fplayer-primary-btn"
                        :loading="creatingTag"
                        @click="createTag"
                    >
                        {{ $t('Add') }}
                    </el-button>
                    <el-button size="small" @click="cancelCreate">
                        {{ $t('Cancel') }}
                    </el-button>
                </div>
            </div>
        </div>
        <template #footer>
            <el-button @click="close" class="fplayer-secondary-btn">
                {{ $t('Close') }}
            </el-button>
            <el-button
                type="primary"
                class="fplayer-primary-btn"
                :disabled="isCreating"
                @click="startCreate"
            >
                {{ $t('Add Tag') }}
            </el-button>
        </template>
    </el-dialog>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue';
import Rest from '@/utils/http/Rest';
import Notify from '@/utils/Notify.js';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['update:modelValue', 'tags-updated']);

const tags = ref([]);
const loading = ref(false);
const editingTag = ref(null);
const editValue = ref('');
const savingTag = ref(null);
const deletingTag = ref(null);
const isCreating = ref(false);
const createValue = ref('');
const creatingTag = ref(false);
const createInputRef = ref(null);

const close = () => {
    emit('update:modelValue', false);
};

const fetchTags = async () => {
    loading.value = true;
    try {
        const response = await Rest.get('media/tags', { with_counts: 1 });
        tags.value = response.tags || [];
    } catch (e) {
        Notify.error('Failed to load tags');
    } finally {
        loading.value = false;
    }
};

const emitTagsUpdated = (action) => {
    emit('tags-updated', {
        action,
        tags: tags.value.map((tag) => tag.name),
    });
};

watch(() => props.modelValue, (visible) => {
    if (visible) {
        editingTag.value = null;
        isCreating.value = false;
        createValue.value = '';
        fetchTags();
    }
});

const startCreate = async () => {
    editingTag.value = null;
    editValue.value = '';
    isCreating.value = true;
    createValue.value = '';

    await nextTick();
    createInputRef.value?.focus?.();
};

const cancelCreate = () => {
    isCreating.value = false;
    createValue.value = '';
};

const startEditing = (tag) => {
    cancelCreate();
    editingTag.value = tag.name;
    editValue.value = tag.name;
};

const cancelEditing = () => {
    editingTag.value = null;
    editValue.value = '';
};

const saveRename = async (tag) => {
    const trimmed = editValue.value.trim();
    if (!trimmed || trimmed === tag.name) {
        cancelEditing();
        return;
    }
    savingTag.value = tag.name;
    try {
        await Rest.put('media/tags', {
            old_name: tag.name,
            new_name: trimmed,
        });
        Notify.success('Tag renamed successfully');
        editingTag.value = null;
        await fetchTags();
        emitTagsUpdated('rename');
    } catch (e) {
        Notify.error(e.message || 'Failed to rename tag');
    } finally {
        savingTag.value = null;
    }
};

const createTag = async () => {
    const trimmed = createValue.value.trim();
    if (!trimmed) {
        return;
    }

    creatingTag.value = true;
    try {
        await Rest.post('media/tags', {
            tag_name: trimmed,
        });
        Notify.success('Tag created successfully');
        cancelCreate();
    } catch (e) {
        Notify.error(e.message || 'Failed to create tag');
        return;
    } finally {
        creatingTag.value = false;
    }

    try {
        await fetchTags();
        emitTagsUpdated('create');
    } catch (e) {
        Notify.error('Tag was created, but the tag list could not be refreshed');
    }
};

const handleDelete = async (tag) => {
    deletingTag.value = tag.name;
    try {
        await Rest.delete('media/tags', { tag_name: tag.name });
        Notify.success('Tag deleted successfully');
        await fetchTags();
        emitTagsUpdated('delete');
    } catch (e) {
        Notify.error(e.message || 'Failed to delete tag');
    } finally {
        deletingTag.value = null;
    }
};
</script>
