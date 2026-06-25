<template>
    <div class="fplayer-analytics-user">
        <div class="fplayer-admin-page-header">
            <div class="fplayer-analytics-header-left">
                <div class="back-button">
                    <el-button
                        class="fplayer-secondary-btn"
                        :icon="ArrowLeft"
                        @click="goBack"
                        circle
                    />
                </div>
                <h1 class="fplayer-analytics-user-title">
                    {{ $t('Media Analytics by') }}
                    <a
                        :href="user?.author_url || '#'"
                        class="fplayer-analytics-user-title-link"
                        target="_blank"
                        rel="noopener"
                    >
                        {{ user?.display_name || `User #${userId}` }}
                    </a>
                </h1>
            </div>
            <date-range-picker
                v-if="!userNotFound"
                v-model="dateRange"
                :refreshing="isRefreshing"
                @change="handleDateChange"
                @refresh="handleRefresh"
            />
        </div>

        <div v-if="userNotFound" class="fplayer-analytics-not-found">
            <el-empty :description="$t('User not found')" :image-size="120">
                <el-button type="primary" class="fplayer-primary-btn" @click="goBackToAnalytics">{{ $t('Back to analytics') }}</el-button>
            </el-empty>
        </div>

        <template v-else>
            <div class="fplayer-analytics-stats-cards fplayer-analytics-row" v-loading="loading.stats">
                <KPICard
                    :title="$t('Total Views')"
                    :value="stats.views ?? 0"
                    :change="stats?.views_change"
                    :change-type="trendType(stats?.views_is_positive)"
                />
                <KPICard
                    :title="$t('Total Watch Time')"
                    :value="formatDuration(stats.total_watch_time)"
                    :change="stats?.total_watch_time_change"
                    :change-type="trendType(stats?.total_watch_time_is_positive)"
                />
                <KPICard
                    :title="$t('Avg Watch Time')"
                    :value="formatDuration(stats.average_watch_time)"
                    :change="stats?.average_watch_time_change"
                    :change-type="trendType(stats?.average_watch_time_is_positive)"
                />
                <KPICard
                    :title="$t('Completion Rate')"
                    :value="formatCompletionRate(stats.completion_rate)"
                    :change="stats?.completion_rate_change"
                    :change-type="trendType(stats?.completion_rate_is_positive)"
                />
            </div>

            <el-row :gutter="20" class="fplayer-analytics-row">
                <el-col :xs="24" :md="14">
                    <el-card class="fplayer-analytics-card fplayer-analytics-performance-card">
                        <template #header>
                            <AnalyticsCardTitle
                                :title="$t('Performance Over Time')"
                                :help-text="$t('Shows how views or watch time change over time.')"
                            />
                            <el-select
                                v-model="performanceMetric"
                                size="default"
                                class="fplayer-analytics-performance-select"
                            >
                                <el-option :label="$t('Views')" value="plays" />
                                <el-option :label="$t('Watch Time')" value="watch_time" />
                            </el-select>
                        </template>
                        <div v-loading="loading.performance">
                            <performance-over-time-chart
                                :data="performanceOverTimeData"
                                :metric="performanceMetric"
                            />
                        </div>
                    </el-card>
                </el-col>
                <el-col :xs="24" :md="10">
                    <el-card class="fplayer-analytics-card">
                        <template #header>
                            <AnalyticsCardTitle
                                :title="$t('User Retention')"
                                :help-text="$t('Shows how much of the watched media this user typically watches before dropping off.')"
                            />
                        </template>
                        <div v-loading="loading.retention">
                            <div v-if="retentionChartData.length > 0" class="fplayer-analytics-retention-chart">
                                <retention-chart :data="retentionChartPayload" />
                            </div>
                            <div v-else class="fplayer-analytics-no-retention-data">
                                <el-empty
                                    :description="$t('No retention data for this user yet')"
                                    :image-size="120"
                                >
                                    <template #description>
                                        <p>{{ $t('Retention will appear after views are collected') }}</p>
                                    </template>
                                </el-empty>
                            </div>
                        </div>
                    </el-card>
                </el-col>
            </el-row>

            <el-row :gutter="20" class="fplayer-analytics-row fplayer-list-table-container">
                <el-col :span="24">
                    <el-card class="fplayer-analytics-card">
                        <template #header>
                            <AnalyticsCardTitle
                                :title="$t('Top Watched Media')"
                                :help-text="$t('Lists the media this viewer watched most.')"
                            />
                        </template>
                        <el-table
                            v-loading="loading.topVideos"
                            :data="topVideos"
                            style="width: 100%"
                            class="fplayer-list-table"
                            @row-click="goToVideoAnalytics"
                        >
                            <el-table-column :label="$t('ID')" width="96">
                                <template #default="scope">
                                    <router-link :to="{ name: 'analytics.video', params: { id: scope.row.media_id } }">
                                        #{{ scope.row.media_id }}
                                    </router-link>
                                </template>
                            </el-table-column>
                            <el-table-column prop="title" :label="$t('Title')" min-width="200">
                                <template #default="scope">
                                    <router-link :to="{ name: 'analytics.video', params: { id: scope.row.media_id } }">
                                        {{ scope.row.title || 'Media #' + scope.row.media_id }}
                                    </router-link>
                                </template>
                            </el-table-column>
                            <el-table-column prop="views" :label="$t('Views')" width="100" />
                            <el-table-column prop="total_watch_time" :label="$t('Watch Time')" width="150">
                                <template #default="scope">
                                    {{ formatWatchTime(scope.row.total_watch_time) }}
                                </template>
                            </el-table-column>
                        </el-table>
                    </el-card>
                </el-col>
            </el-row>
        </template>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import DateRangePicker from './DateRangePicker.vue';
import AnalyticsCardTitle from './AnalyticsCardTitle.vue';
import KPICard from './KPICard.vue';
import PerformanceOverTimeChart from './PerformanceOverTimeChart.vue';
import RetentionChart from './RetentionChart.vue';
import { ArrowLeft } from '@element-plus/icons-vue';
import Rest from '@/utils/http/Rest';
import { formatDuration, getDefaultDateRange, formatDate, formatCompletionRate } from '../helpers/time';

const router = useRouter();
const route = useRoute();

const userId = computed(() => route.params.id);

const dateRange = ref(getDefaultDateRange());
const performanceMetric = ref('watch_time');
const user = ref({});
const userNotFound = ref(false);
const stats = ref({});
const performanceOverTimeData = ref({ dates: [], series: [] });
const retentionData = ref({ data: [], duration: 0 });
const topVideos = ref([]);
const loading = reactive({
    user: false,
    stats: false,
    performance: false,
    retention: false,
    topVideos: false
});

const retentionChartData = computed(() => {
    const d = retentionData.value;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.data)) return d.data;
    return [];
});
const retentionChartPayload = computed(() => ({
    data: retentionChartData.value,
    duration: retentionData.value?.duration ?? 0
}));

const isRefreshing = computed(() =>
    loading.user || loading.stats || loading.performance || loading.retention || loading.topVideos
);

function trendType(isPositive) {
    if (isPositive === true) return 'positive';
    if (isPositive === false) return 'negative';
    return 'neutral';
}

function scrollToTop() {
    nextTick(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function goBack() {
    router.push({ name: 'analytics.dashboard' });
}

function goBackToAnalytics() {
    router.push({ name: 'analytics.dashboard' });
}

function handleRefresh() {
    fetchData();
}

function fetchData() {
    fetchUser().then((found) => {
        if (found) {
            fetchStats();
            fetchPerformanceOverTime();
            fetchRetention();
            fetchTopVideos();
        }
    });
}

function fetchUser() {
    loading.user = true;
    userNotFound.value = false;
    user.value = {};
    return Rest.get(`analytics/user/${userId.value}`)
        .then((response) => {
            const data = response?.data ?? response ?? {};
            user.value = data;
            if (!data?.id && !data?.user_id) {
                userNotFound.value = true;
                user.value = {};
                return false;
            }
            return true;
        })
        .catch((err) => {
            console.error(err?.response?.responseJSON?.message ?? err?.message ?? 'Failed to load user details');
            userNotFound.value = true;
            user.value = {};
            return false;
        })
        .finally(() => {
            loading.user = false;
        });
}

function fetchStats() {
    loading.stats = true;
    Rest.get(`analytics/user/${userId.value}/stats`, {
        start_date: formatDate(dateRange.value.startDate),
        end_date: formatDate(dateRange.value.endDate)
    })
        .then((response) => {
            stats.value = response?.data ?? response ?? {};
        })
        .catch((err) => {
            console.error(err?.response?.responseJSON?.message ?? err?.message ?? 'Failed to load user stats');
        })
        .finally(() => {
            loading.stats = false;
        });
}

function fetchTopVideos() {
    loading.topVideos = true;
    Rest.get(`analytics/user/${userId.value}/top-videos`, {
        start_date: formatDate(dateRange.value.startDate),
        end_date: formatDate(dateRange.value.endDate),
        limit: 10
    })
        .then((response) => {
            const raw = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
            topVideos.value = raw.slice(0, 10);
        })
        .catch((err) => {
            console.error(err?.response?.responseJSON?.message ?? err?.message ?? 'Failed to load top videos');
        })
        .finally(() => {
            loading.topVideos = false;
        });
}

function fetchPerformanceOverTime() {
    loading.performance = true;
    Rest.get(`analytics/performance-over-time/user/${userId.value}`, {
        start_date: formatDate(dateRange.value.startDate),
        end_date: formatDate(dateRange.value.endDate),
        metric: performanceMetric.value
    })
        .then((response) => {
            const raw = response?.data ?? response;
            const payload = raw?.data ?? raw;
            const dates = payload?.dates ?? [];
            const series = payload?.series ?? [];
            if (Array.isArray(dates) && Array.isArray(series)) {
                performanceOverTimeData.value = { dates, series };
            } else {
                performanceOverTimeData.value = { dates: [], series: [] };
            }
        })
        .catch((err) => {
            console.error(err?.response?.responseJSON?.message ?? err?.message ?? 'Failed to load performance data');
            performanceOverTimeData.value = { dates: [], series: [] };
        })
        .finally(() => {
            loading.performance = false;
        });
}

function fetchRetention() {
    loading.retention = true;
    Rest.get(`analytics/user/${userId.value}/retention`, {
        start_date: formatDate(dateRange.value.startDate),
        end_date: formatDate(dateRange.value.endDate)
    })
        .then((response) => {
            const raw = response?.data ?? response;
            const dataArray = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
            const duration = raw?.duration ?? response?.duration ?? 0;
            retentionData.value = { data: dataArray, duration };
        })
        .catch((err) => {
            console.error(err?.response?.responseJSON?.message ?? err?.message ?? 'Failed to load retention data');
            retentionData.value = { data: [], duration: 0 };
        })
        .finally(() => {
            loading.retention = false;
        });
}

function goToVideoAnalytics(row) {
    router.push({ name: 'analytics.video', params: { id: row.media_id } });
}

function handleDateChange(newDateRange) {
    dateRange.value = newDateRange;
    fetchData();
}

function formatWatchTime(seconds) {
    return formatDuration(seconds);
}

onMounted(() => {
    scrollToTop();
    fetchData();
});

watch(() => route.params.id, () => {
    user.value = {};
    userNotFound.value = false;
    scrollToTop();
    fetchData();
});

watch(performanceMetric, () => {
    fetchPerformanceOverTime();
});
</script>
