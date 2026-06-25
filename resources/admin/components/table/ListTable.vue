<template>
    <div class="fplayer-list-table-container">
        <div v-if="$route.name === routeName">
	        <HeaderFilters
		        v-if="showHeaderFilters"
		        :current-filter="currentFilter"
		        v-model:search-query="searchQuery"
		        @filter-change="handleFilterChange"
		        @search="handleSearch"
		        :status-filters="statusFilters"
                :extra-filters="showSourceColumn ? mediaListFilters : []"
                :extra-filter-values="mediaListFilterValues"
		        :tag-filters="showTagFilters ? allTags : []"
		        :has-pro="showTagFilters"
		        :current-tag="currentTag"
		        @tag-change="handleTagChange"
                @extra-filter-change="handleExtraFilterChange"
                @clear-combined-filters="handleClearCombinedFilters"
		        @manage-tags="manageTagsVisible = true"
	        />

            <TableSkeleton
                v-if="dataSource.isBusy.loading"
                :show-source="showSourceColumn"
                :show-tags="showTagFilters"
            />
            <el-table
                v-else
                :data="dataSource.list"
                :show-header="dataSource.list.length > 0"
                @row-click="onRowClick"
                @sort-change="handleSortChange"
                :default-sort="defaultSort"
                class="fplayer-list-table"
            >
                <template #empty>
                    <div class="fplayer-list-table-empty">
                        <IconNoData :size="120" />
                    </div>
                </template>
	            <el-table-column :label="$t('ID')" width="96" class-name="fplayer-id-column" sortable="custom" prop="id">
	                <template #default="scope">
                        #{{ scope.row.ID }}
                    </template>
	            </el-table-column>
                <el-table-column min-width="200" :label="$t('Title')" sortable="custom" prop="title">
                    <template #default="scope">
                        <div class="fplayer-table-title-cell">
                            <component :is="getMediaTypeIcon(scope.row)" :size="20" :title="getMediaType(scope.row) === 'audio' ? $t('Audio') : $t('Video')" class="fplayer-table-title-icon" />
                            <el-tooltip placement="top" :show-after="300" popper-class="fplayer-title-tooltip">
                                <template #content>
                                    <div class="fplayer-title-tooltip-inner">
                                        <img
                                            v-if="scope.row.settings?.posterSrc"
                                            :src="scope.row.settings.posterSrc"
                                            alt=""
                                            aria-hidden="true"
                                            class="fplayer-title-tooltip-thumb"
                                        />
                                        <span class="fplayer-title-tooltip-text">{{ scope.row.post_title }}</span>
                                    </div>
                                </template>
                                <a :href="getEditUrl(scope.row)" @click.prevent="handleEdit(scope.row, $event)" class="fplayer-table-title-link fplayer-table-title-link--clamp">
                                    {{ scope.row.post_title }}
                                </a>
                            </el-tooltip>
                        </div>
                    </template>
                </el-table-column>

	            <el-table-column v-if="showSourceColumn" width="130" :label="$t('Source')">
		            <template #default="scope">
			            <div class="fplayer-icon-wrapper">
                            <template v-if="sourceInfoByProvider[scope.row.settings?.provider]">
                                <component :is="sourceInfoByProvider[scope.row.settings?.provider].icon" :size="20" />
                                <span class="fplayer-icons-label">{{ sourceInfoByProvider[scope.row.settings?.provider].label }}</span>
                            </template>
                            <div v-else class="fplayer-icon-wrapper">
                                <component :is="IconUploaded" :size="20" />
                                <span class="fplayer-icon-label">{{ $t('Uploaded') }}</span>
                            </div>
                        </div>
		            </template>
	            </el-table-column>

	            <el-table-column v-if="showSourceColumn" width="90" :label="$t('Duration')">
		            <template #default="scope">
			            <template v-if="scope.row.settings?.duration > 0">{{ formatDuration(scope.row.settings.duration) }}</template>
			            <span v-else class="fplayer-tag-empty">&mdash;</span>
		            </template>
	            </el-table-column>

	            <el-table-column v-if="editPostType === 'fluent_player_media' && hasPro" width="150" :label="$t('Tags')">
		            <template #default="scope">
			            <div v-if="scope.row.tags?.length" class="fplayer-tag-chips">
				            <el-tag
					            v-for="tag in getVisibleTags(scope.row.tags)"
					            :key="tag"
					            size="small"
					            class="fplayer-tag-chip"
					            type="info"
				            >
					            {{ tag }}
				            </el-tag>
                            <el-tag
                                v-if="getHiddenTagsCount(scope.row.tags) > 0"
                                size="small"
                                class="fplayer-tag-chip fplayer-tag-chip--more"
                                type="info"
                                :title="getHiddenTagsLabel(scope.row.tags)"
                            >
                                +{{ getHiddenTagsCount(scope.row.tags) }}
                            </el-tag>
			            </div>
			            <span v-else class="fplayer-tag-empty">&mdash;</span>
		            </template>
	            </el-table-column>

	            <el-table-column width="130" :label="$t('Created At')" sortable="custom" prop="date">
		            <template #default="scope">
			            {{ formatDate(scope.row.post_date) }}
		            </template>
	            </el-table-column>

                <el-table-column :width="showSourceColumn ? 110 : 130" :label="$t('Status')" sortable="custom" prop="post_status">
                    <template #default="scope">
                        <el-tag
	                        class="fplayer-status-tag"
	                        :class="{ ['fplayer-status-tag--' + scope.row.post_status] : true }"
                            size="small"
                        >
                            {{ scope.row.post_status === 'publish' ? $t('Public') : (scope.row.post_status === 'private' ? $t('Private') : $t('Draft')) }}
                        </el-tag>
                    </template>
                </el-table-column>

                <el-table-column :label="$t('ShortCode')" :width="showSourceColumn ? 190 : 240">
                    <template #default="scope">
                        <TableShortcode :shortcode="getShortcode(scope.row)" />
                    </template>
                </el-table-column>
                
                <el-table-column :min-width="50" class-name="fplayer-actions-column">
                    <template #default="scope">
                        <TableActions 
                            :row="scope.row"
                            :view-url-key="viewUrlKey"
                            :edit-post-type="editPostType"
                            @delete="dataSource.delete"
                        />
                    </template>
                </el-table-column>
            </el-table>

            <div class="fplayer-list-table-pagination">
                <Pagination :pagination="dataSource.pagination" @fetch="handleRedirect" />
            </div>

            <ManageTagsModal
                v-if="showTagFilters"
                v-model="manageTagsVisible"
                @tags-updated="handleTagsUpdated"
            />
        </div>
        <div v-else>
            <router-view />
        </div>
    </div>
</template>

<script setup>
import Pagination from '@components/Pagination.vue';
import HeaderFilters from '@components/HeaderFilters.vue';
import ManageTagsModal from '@components/modals/ManageTagsModal.vue';
import TableActions from '@components/table/TableActions.vue';
import TableShortcode from '@components/table/TableShortcode.vue';
import TableSkeleton from '@components/table/TableSkeleton.vue';
import IconYoutube from '@components/icons/IconYoutube.vue';
import IconVimeo from '@components/icons/IconVimeo.vue';
import IconUploaded from '@components/icons/IconUploaded.vue';
import IconVideo from '@components/icons/IconVideo.vue';
import IconAudio from '@components/icons/IconAudio.vue';
import IconBunnyCDN from '@components/icons/IconBunnyCDN.vue';
import IconMux from '@components/icons/IconMux.vue';
import IconNoData from '@components/icons/IconNoData.vue';
import Rest from '@/utils/http/Rest';
import { useFluentPlayerCopyText } from '@/composables/useFluentPlayerCopyText.js';
import { usePostNavigation } from '@/composables/usePostNavigation';
import { formatDate } from '@/composables/useAppConfig.js';
import { formatDuration } from '@/modules/analytics/helpers/time.js';
import { computed, onMounted, ref } from 'vue';
import { getCurrentInstance } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps({
    dataSource: {
        type: Object,
        required: true
    },
    routeName: {
        type: String,
        required: true
    },
    shortcodeTemplate: {
        type: String,
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

const normalizeMultiValue = (value) => {
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }

    if (typeof value === 'string') {
        return value ? [value] : [];
    }

    return [];
};

const instance = getCurrentInstance();
const initialQuery = props.dataSource.useQuery();
const currentFilter = ref(initialQuery.status || 'all');
const searchQuery = ref(initialQuery.query || '');
const currentOrderBy = ref(initialQuery.orderby || 'id');
const currentOrder = ref(initialQuery.order || 'DESC');
const allTags = ref([]);
const currentTag = ref(normalizeMultiValue(initialQuery.tags?.length ? initialQuery.tags : initialQuery.tag));
const currentProvider = ref(normalizeMultiValue(initialQuery.provider));
const currentMediaType = ref(normalizeMultiValue(initialQuery.media_type));
const manageTagsVisible = ref(false);
const { getEditUrl, handleEdit } = usePostNavigation(props);

const hasPro = computed(() => !!window.fluentFrameworkAdmin?.has_pro);
const maxVisibleTags = 3;
const showTagFilters = computed(() => props.editPostType === 'fluent_player_media' && hasPro.value);

onMounted(async () => {
    useFluentPlayerCopyText('.fplayer-copy', 'Shortcode copied to clipboard!');
    if (showTagFilters.value) {
        try {
            const response = await Rest.get('media/tags');
            allTags.value = response.tags || [];
        } catch (e) {
            // Tags endpoint may not be available yet
        }
    }
});

const onRowClick = (row, column, event) => {
    if (event?.target?.closest?.('.fplayer-copy')) return;
    if (event?.target?.closest?.('.fplayer-table-title-link')) return;
    if (event?.target?.closest?.('.fplayer-actions-column')) return;
    handleEdit(row, event);
};

props.dataSource.get();

const statusFilters = computed(() => [
	{ key: 'all', label: instance?.proxy.$t('All') },
	{ key: 'publish', label: instance?.proxy.$t('Public') },
	{ key: 'private', label: instance?.proxy.$t('Private') },
	{ key: 'draft', label: instance?.proxy.$t('Draft') },
]);

const showSourceColumn = computed(() => props.editPostType === 'fluent_player_media');

const route = useRoute();

const showHeaderFilters = computed(() => {
    const hasItems = (props.dataSource?.list?.length || 0) > 0;
    if (hasItems) return true;
    if (currentFilter.value !== 'all' || !!searchQuery.value || !!currentTag.value) return true;
    const q = route?.query || {};
    return !!q.query || !!q.tag || (q.status && q.status !== 'all');
});

const getVisibleTags = (tags = []) => tags.slice(0, maxVisibleTags);
const getHiddenTagsCount = (tags = []) => Math.max(tags.length - maxVisibleTags, 0);
const getHiddenTagsLabel = (tags = []) => tags.slice(maxVisibleTags).join(', ');

const sourceInfoByProvider = computed(() => {
    const $t = instance?.proxy.$t;
    return {
        youtube: {
            icon: IconYoutube,
            label: $t('Youtube'),
        },
        vimeo: {
            icon: IconVimeo,
            label: $t('Vimeo'),
        },
        bunny: {
            icon: IconBunnyCDN,
            label: $t('Bunny Stream'),
        },
        bunny_storage: {
            icon: IconBunnyCDN,
            label: $t('BunnyCDN Storage'),
        },
        mux: {
            icon: IconMux,
            label: $t('Mux'),
        },
        mux_stream: {
            icon: IconMux,
            label: $t('Mux Live'),
        },
        wordpress: {
            icon: IconUploaded,
            label: $t('Uploaded'),
        }
    };
});

const mediaListFilters = computed(() => {
    const $t = instance?.proxy.$t;

    return [
        {
            key: 'media_type',
            label: $t('Media Type'),
            placeholder: $t('All Media Types'),
            options: [
                { value: 'video', label: $t('Video') },
                { value: 'audio', label: $t('Audio') },
            ]
        },
        {
            key: 'provider',
            label: $t('Source Provider'),
            placeholder: $t('All Sources'),
            options: [
                { value: 'wordpress', label: sourceInfoByProvider.value.wordpress.label },
                { value: 'youtube', label: sourceInfoByProvider.value.youtube.label },
                { value: 'vimeo', label: sourceInfoByProvider.value.vimeo.label },
                { value: 'bunny', label: sourceInfoByProvider.value.bunny.label },
                { value: 'bunny_storage', label: sourceInfoByProvider.value.bunny_storage.label },
                { value: 'mux', label: sourceInfoByProvider.value.mux.label },
                { value: 'mux_stream', label: sourceInfoByProvider.value.mux_stream.label },
            ]
        }
    ];
});

const mediaListFilterValues = computed(() => ({
    provider: currentProvider.value,
    media_type: currentMediaType.value,
}));

const getShortcode = (row) => {
    return props.shortcodeTemplate.replace('{ID}', row.ID);
};

const getMediaType = (row) => {
    const viewType = props.editPostType === 'fluent_player_media'
        ? row.settings?.viewType
        : row.first_media_type;

    return viewType === 'audio' ? 'audio' : 'video';
};

const getMediaTypeIcon = (row) => (getMediaType(row) === 'audio' ? IconAudio : IconVideo);

const syncRouteQuery = () => {
    const router = getCurrentInstance()?.proxy.$router;
    router?.push({
        name: props.routeName,
        query: {
            ...props.dataSource.useQuery()
        }
    });
};

const handleFilterChange = async (filterKey) => {
    currentFilter.value = filterKey;
    await props.dataSource.search('status', filterKey);
    syncRouteQuery();
};

const handleSearch = async () => {
	await props.dataSource.search('query', searchQuery.value);
    syncRouteQuery();
};

const handleTagChange = async (tag) => {
    currentTag.value = normalizeMultiValue(tag);
    props.dataSource.tag = currentTag.value[0] || '';
    await props.dataSource.search('tags', currentTag.value);
    syncRouteQuery();
};

const handleExtraFilterChange = async ({ key, value }) => {
    if (key === 'provider') {
        currentProvider.value = normalizeMultiValue(value);
    }

    if (key === 'media_type') {
        currentMediaType.value = normalizeMultiValue(value);
    }

    const normalizedValue = normalizeMultiValue(value);
    await props.dataSource.search(key, normalizedValue);
    syncRouteQuery();
};

const handleClearCombinedFilters = async () => {
    currentProvider.value = [];
    currentMediaType.value = [];
    currentTag.value = [];

    props.dataSource.provider = [];
    props.dataSource.media_type = [];
    props.dataSource.tags = [];
    props.dataSource.tag = '';
    props.dataSource.pagination.current_page = 1;

    await props.dataSource.get();
    syncRouteQuery();
};

const handleTagsUpdated = async (payload = {}) => {
    if (Array.isArray(payload.tags)) {
        allTags.value = payload.tags;
    } else {
        try {
            const response = await Rest.get('media/tags');
            allTags.value = response.tags || [];
        } catch (e) {
            // silent fail
        }
    }

    const nextTags = currentTag.value.filter((tag) => allTags.value.includes(tag));
    if (nextTags.length !== currentTag.value.length) {
        currentTag.value = nextTags;
        props.dataSource.tag = nextTags[0] || '';
        await props.dataSource.search('tags', nextTags);
        syncRouteQuery();
        return;
    }

    if (payload.action === 'rename' || payload.action === 'delete') {
        props.dataSource.get();
    }
};

const handleRedirect = () => {
    props.dataSource.get();
    syncRouteQuery();
};

const defaultSort = computed(() => ({
    prop: currentOrderBy.value,
    order: currentOrder.value === 'ASC' ? 'ascending' : 'descending',
}));

const handleSortChange = async ({ prop, order }) => {
    const orderBy = order ? prop : 'id';
    const orderDir = order === 'ascending' ? 'ASC' : 'DESC';

    currentOrderBy.value = orderBy;
    currentOrder.value = orderDir;

    props.dataSource.orderby = orderBy;
    props.dataSource.order = orderDir;
    props.dataSource.pagination.current_page = 1;

    const router = getCurrentInstance()?.proxy.$router;
    await router?.push({
        name: props.routeName,
        query: { ...props.dataSource.useQuery(), orderby: orderBy, order: orderDir, page: 1 },
    });

    await props.dataSource.get();
};
</script>
