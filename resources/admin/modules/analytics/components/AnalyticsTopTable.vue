<template>
    <el-card
        :class="[
            'fplayer-analytics-card',
            type === 'videos' ? 'fplayer-analytics-top-videos-card' : ''
        ]"
    >
        <template #header>
            <AnalyticsCardTitle :title="title" :help-text="helpText" />
        </template>
        <Transition name="fplayer-fade" mode="out-in">
        <div v-if="loading" key="skeleton" class="fplayer-list-table-skeleton" aria-hidden="true">
            <el-skeleton animated>
                <template #template>
                    <div class="fplayer-skeleton-row fplayer-skeleton-row--head">
                        <template v-if="type === 'users'">
                            <div class="fplayer-skeleton-cell" style="width: 96px;"><el-skeleton-item variant="text" style="width: 28px;" /></div>
                            <div class="fplayer-skeleton-cell" style="width: 360px;"><el-skeleton-item variant="text" style="width: 48px;" /></div>
                            <div class="fplayer-skeleton-cell" style="flex: 1;"><el-skeleton-item variant="text" style="width: 56px;" /></div>
                            <div class="fplayer-skeleton-cell" style="flex: 1;"><el-skeleton-item variant="text" style="width: 48px;" /></div>
                            <div class="fplayer-skeleton-cell" style="flex: 1;"><el-skeleton-item variant="text" style="width: 64px;" /></div>
                            <div class="fplayer-skeleton-cell" style="flex: 1;"><el-skeleton-item variant="text" style="width: 72px;" /></div>
                        </template>
                        <template v-else>
                            <div class="fplayer-skeleton-cell" style="width: 96px;"><el-skeleton-item variant="text" style="width: 28px;" /></div>
                            <div class="fplayer-skeleton-cell" style="flex: 1; min-width: 200px;"><el-skeleton-item variant="text" style="width: 56px;" /></div>
                            <div class="fplayer-skeleton-cell" style="width: 100px;"><el-skeleton-item variant="text" style="width: 44px;" /></div>
                            <div class="fplayer-skeleton-cell" style="width: 150px;"><el-skeleton-item variant="text" style="width: 96px;" /></div>
                            <div class="fplayer-skeleton-cell" style="flex: 1; min-width: 180px;"><el-skeleton-item variant="text" style="width: 104px;" /></div>
                        </template>
                    </div>

                    <div v-for="row in skeletonRows" :key="row" class="fplayer-skeleton-row">
                        <template v-if="type === 'users'">
                            <div class="fplayer-skeleton-cell" style="width: 96px;"><el-skeleton-item variant="text" style="width: 36px;" /></div>
                            <div class="fplayer-skeleton-cell" style="width: 360px;">
                                <el-skeleton-item variant="circle" style="width: 32px; height: 32px; border-radius: 50%;" />
                                <el-skeleton-item variant="text" style="width: 140px;" />
                            </div>
                            <div class="fplayer-skeleton-cell" style="flex: 1;"><el-skeleton-item variant="text" style="width: 70px;" /></div>
                            <div class="fplayer-skeleton-cell" style="flex: 1;"><el-skeleton-item variant="text" style="width: 60px;" /></div>
                            <div class="fplayer-skeleton-cell" style="flex: 1;"><el-skeleton-item variant="text" style="width: 30px;" /></div>
                            <div class="fplayer-skeleton-cell" style="flex: 1;"><el-skeleton-item variant="text" style="width: 56px;" /></div>
                        </template>
                        <template v-else>
                            <div class="fplayer-skeleton-cell" style="width: 96px;"><el-skeleton-item variant="text" style="width: 36px;" /></div>
                            <div class="fplayer-skeleton-cell" style="flex: 1; min-width: 200px;">
                                <el-skeleton-item variant="text" style="width: 40px; height: 28px; border-radius: 4px; flex-shrink: 0;" />
                                <el-skeleton-item variant="text" style="width: 60%;" />
                            </div>
                            <div class="fplayer-skeleton-cell" style="width: 100px;"><el-skeleton-item variant="text" style="width: 40px;" /></div>
                            <div class="fplayer-skeleton-cell" style="width: 150px;"><el-skeleton-item variant="text" style="width: 64px;" /></div>
                            <div class="fplayer-skeleton-cell" style="flex: 1; min-width: 180px;"><el-skeleton-item variant="text" class="fplayer-skeleton-pill" style="width: 140px;" /></div>
                        </template>
                    </div>
                </template>
            </el-skeleton>
        </div>
        <div v-else-if="data.length === 0" key="empty" class="fplayer-analytics-chart-no-data">
            <p>{{ effectiveEmptyMessage }}</p>
        </div>
        <el-table
            v-else
            key="table"
            :data="data"
            class="fplayer-list-table"
            style="width: 100%"
            @row-click="handleRowClick"
        >
            <!-- Top Users columns -->
            <template v-if="type === 'users'">
                <el-table-column label="ID" width="96">
                    <template #default="scope">
                        <router-link :to="{ name: 'analytics.user', params: { id: scope.row.user_id } }" class="fplayer-table-title-link">
                            #{{ scope.row.user_id }}
                        </router-link>
                    </template>
                </el-table-column>
                <el-table-column :label="$t('User')" width="360">
                    <template #default="scope">
                        <router-link :to="{ name: 'analytics.user', params: { id: scope.row.user_id } }" class="fplayer-table-title-link">
                            <el-avatar :size="32" :src="scope.row.avatar_url" :alt="scope.row.display_name || ('User #' + scope.row.user_id)" class="fplayer-table-title-link-avatar">
                                {{ (scope.row.display_name || '?').charAt(0).toUpperCase() }}
                            </el-avatar>
                            <span class="fplayer-table-title-link-name">{{ scope.row.display_name || 'User #' + scope.row.user_id }}</span>
                        </router-link>
                    </template>
                </el-table-column>
                <el-table-column prop="location" :label="$t('Country')" />
                <el-table-column prop="device" :label="$t('Device')" />
                <el-table-column prop="views" :label="$t('Total View')" />
                <el-table-column :label="$t('Watch Time')" prop="total_watch_time">
                    <template #default="scope">
                        {{ formatDuration(scope.row.total_watch_time) }}
                    </template>
                </el-table-column>
            </template>

            <!-- Top Media columns -->
            <template v-if="type === 'videos'">
                <el-table-column :label="$t('ID')" width="96">
                    <template #default="scope">
                        <router-link :to="{ name: 'analytics.video', params: { id: scope.row.media_id } }" class="fplayer-table-title-link">
                            #{{ scope.row.media_id }}
                        </router-link>
                    </template>
                </el-table-column>
                <el-table-column :label="$t('Media')" min-width="200">
                    <template #default="scope">
                        <router-link :to="{ name: 'analytics.video', params: { id: scope.row.media_id } }" class="fplayer-table-title-link">
                            <div class="fplayer-analytics-top-videos-video">
                                <img
                                    v-if="scope.row.thumbnail"
                                    :src="scope.row.thumbnail"
                                    alt=""
                                    class="fplayer-analytics-top-videos-poster"
                                />
                                <i v-else><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
  <path d="M5.2 6.39082C5.2 5.73322 5.734 5.19922 6.3916 5.19922H25.6084C26.266 5.19922 26.8 5.73322 26.8 6.39082V25.6076C26.7997 25.9236 26.674 26.2265 26.4506 26.4499C26.2272 26.6733 25.9243 26.7989 25.6084 26.7992H6.3916C6.07566 26.7989 5.77276 26.6733 5.54936 26.4499C5.32596 26.2265 5.20031 25.9236 5.2 25.6076V6.39082ZM7.6 7.59922V24.3992H24.4V7.59922H7.6ZM14.3464 11.6972L20.2012 15.5996C20.267 15.6434 20.321 15.7028 20.3584 15.7726C20.3957 15.8423 20.4153 15.9201 20.4153 15.9992C20.4153 16.0783 20.3957 16.1562 20.3584 16.2259C20.321 16.2956 20.267 16.355 20.2012 16.3988L14.3452 20.3012C14.273 20.3491 14.1892 20.3765 14.1026 20.3806C14.0161 20.3847 13.9301 20.3653 13.8537 20.3244C13.7773 20.2836 13.7134 20.2228 13.6687 20.1486C13.624 20.0744 13.6003 19.9894 13.6 19.9028V12.0956C13.6002 12.0088 13.6239 11.9236 13.6686 11.8492C13.7133 11.7748 13.7774 11.7139 13.854 11.6731C13.9306 11.6322 14.0168 11.6128 14.1035 11.6171C14.1902 11.6213 14.2742 11.649 14.3464 11.6972V11.6972Z" fill="#0E121B"/>
</svg></i>
                                <span class="fplayer-table-title-link-name">{{ scope.row.title || 'Media #' + scope.row.media_id }}</span>
                            </div>
                        </router-link>
                    </template>
                </el-table-column>
                <el-table-column prop="views" :label="$t('Views')" width="100">
                    <template #default="scope">
                        {{ formatPlays(scope.row.views) }}
                    </template>
                </el-table-column>
                <el-table-column :label="$t('Avg Watch Time')" width="150">
                    <template #default="scope">
                        {{ formatDuration(scope.row.average_watch_time) }}
                    </template>
                </el-table-column>
                <el-table-column :label="$t('Completion Rate')" min-width="180">
                    <template #default="scope">
                        <CompletionRateProgressBar
                            :percentage="scope.row.completion_rate ?? 0"
                            :show-label="true"
                        />
                    </template>
                </el-table-column>
            </template>
        </el-table>
        </Transition>
    </el-card>
</template>

<script setup>
import { computed, getCurrentInstance } from 'vue';
import { useRouter } from 'vue-router';
import { formatDuration } from '../helpers/time';
import CompletionRateProgressBar from './CompletionRateProgressBar.vue';
import AnalyticsCardTitle from './AnalyticsCardTitle.vue';

const router = useRouter();
const instance = getCurrentInstance();
const $t = instance?.proxy?.$t || ((str) => str);

const props = defineProps({
    type: {
        type: String,
        required: true,
        validator: (v) => ['users', 'videos'].includes(v)
    },
    title: {
        type: String,
        required: true
    },
    helpText: {
        type: String,
        required: true
    },
    data: {
        type: Array,
        required: true,
        default: () => []
    },
    loading: {
        type: Boolean,
        required: true
    },
    skeletonRows: {
        type: Number,
        default: 5
    },
    emptyMessage: {
        type: String,
        default: ''
    }
});

const defaultEmptyMessages = computed(() => ({
    users: $t('No top users data available'),
    videos: $t('No top media data available')
}));

const effectiveEmptyMessage = computed(() =>
    props.emptyMessage || defaultEmptyMessages.value[props.type] || ''
);

function formatPlays(n) {
    if (n == null || isNaN(Number(n))) return '0';
    return Number(n).toLocaleString();
}

function handleRowClick(row) {
    if (props.type === 'users') {
        router.push({ name: 'analytics.user', params: { id: row.user_id } });
    } else if (props.type === 'videos') {
        router.push({ name: 'analytics.video', params: { id: row.media_id } });
    }
}
</script>

<style scoped>
.fplayer-list-table :deep(.el-table__row) {
    cursor: pointer;
}

.fplayer-analytics-top-videos-video {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.fplayer-analytics-top-videos-poster {
    width: 40px;
    height: 28px;
    object-fit: cover;
    border-radius: 4px;
    flex-shrink: 0;
}

.fplayer-fade-enter-active,
.fplayer-fade-leave-active {
    transition: opacity 0.18s ease;
}

.fplayer-fade-enter-from,
.fplayer-fade-leave-to {
    opacity: 0;
}
</style>
