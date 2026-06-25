<template>
    <div class="fplayer-analytics-video">
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
                <h1 class="fplayer-analytics-video-title">
                    <a
                        :href="videoViewUrl"
                        class="fplayer-analytics-video-title-link"
                        target="_blank"
                        rel="noopener"
                    >
                        {{ video?.settings?.title || `Media #${videoId}` }}
                    </a>
                </h1>
            </div>
            <date-range-picker
                v-if="!videoNotFound"
                v-model="dateRange"
                :refreshing="isRefreshing"
                @change="handleDateChange"
                @refresh="handleRefresh"
            />
        </div>

        <div v-if="videoNotFound" class="fplayer-analytics-not-found">
            <el-empty :description="$t('Media not found')" :image-size="120">
                <el-button type="primary" class="fplayer-primary-btn" @click="goBackToAnalytics">{{ $t('Back to analytics') }}</el-button>
            </el-empty>
        </div>

        <template v-else>
            <div class="fplayer-analytics-stats-cards fplayer-analytics-row" v-loading="loading.stats">
                <KPICard
                    :title="$t('Views')"
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
                    :title="$t('Average Watch Time')"
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
                <el-col :xs="24" :md="16">
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
                <el-col :xs="24" :md="8">
                    <el-card class="fplayer-analytics-card">
                        <template #header>
                            <AnalyticsCardTitle
                                :title="$t('Device Distribution')"
                                :help-text="$t('Shows how views are split by device type.')"
                            />
                        </template>
                        <div v-loading="loading.devices">
                            <device-chart :data="deviceData" />
                        </div>
                    </el-card>
                </el-col>
            </el-row>

            <el-row :gutter="20" class="fplayer-analytics-row">
                <el-col :xs="24" :md="12">
                    <el-card class="fplayer-analytics-card" v-loading="loading.location">
                        <template #header>
                            <AnalyticsCardTitle
                                :title="$t('Location Breakdown')"
                                :help-text="$t('Shows where your viewers are located.')"
                            />
                        </template>
                        <location-breakdown-chart :data="locationData" />
                    </el-card>
                </el-col>
                <el-col :xs="24" :md="12">
                    <el-card class="fplayer-analytics-card" v-loading="loading.retention">
                        <template #header>
                            <AnalyticsCardTitle
                                :title="$t('Audience Retention')"
                                :help-text="$t('Shows how viewer engagement changes throughout playback.')"
                            />
                        </template>
                        <div v-loading="loading.retention">
                            <div v-if="retentionChartData.length > 0" class="fplayer-analytics-retention-chart">
                                <retention-chart :data="retentionChartPayload" />
                            </div>
                            <div v-else class="fplayer-analytics-no-retention-data">
                                <el-empty
                                    :description="$t('No retention data available for this media yet')"
                                    :image-size="150"
                                >
                                    <template #description>
                                        <p>{{ $t('Retention data will be available after more views are collected') }}</p>
                                    </template>
                                </el-empty>
                            </div>
                        </div>
                    </el-card>
                </el-col>
            </el-row>

            <el-row :gutter="20" class="fplayer-analytics-row fplayer-list-table-container">
                <el-col :span="24">
                    <AnalyticsTopTable
                        type="users"
                        :title="$t('Top Viewers')"
                        :help-text="$t('Lists viewers with the most views and watch time.')"
                        :data="topUsers"
                        :loading="loading.topUsers"
                    />
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
import PerformanceOverTimeChart from './PerformanceOverTimeChart.vue';
import DeviceChart from './DeviceChart.vue';
import RetentionChart from './RetentionChart.vue';
import LocationBreakdownChart from './LocationBreakdownChart.vue';
import AnalyticsTopTable from './AnalyticsTopTable.vue';
import KPICard from './KPICard.vue';
import { ArrowLeft } from '@element-plus/icons-vue';
import Rest from '@/utils/http/Rest';
import { formatDuration, getDefaultDateRange, formatDate, formatCompletionRate } from '../helpers/time';

const router = useRouter();
const route = useRoute();

const videoId = computed(() => route.params.id);

const videoViewUrl = computed(() => {
    if (video.value?.view_url) return video.value.view_url;
    const id = videoId.value;
    if (!id) return '#';
    return `/wp-admin/post.php?post=${id}&action=edit`;
});

const dateRange = ref(getDefaultDateRange());
const performanceMetric = ref('watch_time');
const video = ref({});
const videoNotFound = ref(false);
const stats = ref({
    views: 0,
    average_watch_time: 0,
    total_watch_time: 0
});

const performanceOverTimeData = ref({ dates: [], series: [] });
const deviceData = ref([]);
const retentionData = ref({ data: [], duration: 0 });
const locationData = ref([]);
const topUsers = ref([]);

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
const loading = reactive({
    video: false,
    stats: false,
    performance: false,
    devices: false,
    retention: false,
    location: false,
    topUsers: false
});

const isRefreshing = computed(() =>
    loading.video || loading.stats || loading.performance || loading.devices || loading.retention || loading.location || loading.topUsers
);

function scrollToTop() {
    nextTick(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function goBack() {
    router.back();
}

function goBackToAnalytics() {
    router.push({ name: 'analytics.dashboard' });
}

function fetchData() {
    fetchVideo().then((found) => {
        if (found) {
            fetchStats();
            fetchPerformanceOverTime();
            fetchDeviceData();
            fetchRetention();
            fetchLocationBreakdown();
            fetchTopUsers();
        }
    });
}

function fetchVideo() {
    loading.video = true;
    videoNotFound.value = false;
    video.value = {};
    return Rest.get(`media/${videoId.value}`)
        .then((response) => {
            const media = response?.media ?? response?.data?.media ?? response ?? {};
            video.value = media;
            const mediaId = media?.id ?? media?.ID;
            if (mediaId == null || mediaId === '') {
                videoNotFound.value = true;
                video.value = {};
                return false;
            }
            return true;
        })
        .catch((err) => {
            console.error(err?.response?.responseJSON?.message ?? err?.message ?? 'Failed to load video details');
            videoNotFound.value = true;
            video.value = {};
            return false;
        })
        .finally(() => {
            loading.video = false;
        });
}

function fetchStats() {
    loading.stats = true;
    Rest.get(`analytics/video/${videoId.value}/stats`, {
        start_date: formatDate(dateRange.value.startDate),
        end_date: formatDate(dateRange.value.endDate)
    })
        .then((response) => {
            stats.value = response?.data ?? response ?? {};
        })
        .catch((err) => {
            console.error(err?.response?.responseJSON?.message ?? err?.message ?? 'Failed to load video stats');
        })
        .finally(() => {
            loading.stats = false;
        });
}

function fetchPerformanceOverTime() {
    loading.performance = true;
    Rest.get(`analytics/performance-over-time/video/${videoId.value}`, {
        start_date: formatDate(dateRange.value.startDate),
        end_date: formatDate(dateRange.value.endDate),
        metric: performanceMetric.value
    })
        .then((response) => {
            const raw = response?.data ?? response;
            const dates = raw?.dates ?? [];
            const series = raw?.series ?? [];
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

function fetchDeviceData() {
    loading.devices = true;
    Rest.get(`analytics/video/${videoId.value}/devices`, {
        start_date: formatDate(dateRange.value.startDate),
        end_date: formatDate(dateRange.value.endDate)
    })
        .then((response) => {
            deviceData.value = response?.data?.data ?? response?.data ?? [];
        })
        .catch((err) => {
            console.error(err?.response?.responseJSON?.message ?? err?.message ?? 'Failed to load device data');
        })
        .finally(() => {
            loading.devices = false;
        });
}

function fetchRetention() {
    loading.retention = true;
    Rest.get(`analytics/video/${videoId.value}/retention`, {
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
        })
        .finally(() => {
            loading.retention = false;
        });
}

function fetchLocationBreakdown() {
    loading.location = true;
    Rest.get(`analytics/video/${videoId.value}/location-breakdown`, {
        start_date: formatDate(dateRange.value.startDate),
        end_date: formatDate(dateRange.value.endDate)
    })
        .then((response) => {
            locationData.value = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
        })
        .catch((err) => {
            console.error(err?.response?.responseJSON?.message ?? err?.message ?? 'Failed to load location data');
        })
        .finally(() => {
            loading.location = false;
        });
}

function fetchTopUsers() {
    loading.topUsers = true;
    Rest.get(`analytics/video/${videoId.value}/top-users`, {
        start_date: formatDate(dateRange.value.startDate),
        end_date: formatDate(dateRange.value.endDate),
        limit: 10
    })
        .then((response) => {
            const raw = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
            topUsers.value = raw.slice(0, 10);
        })
        .catch((err) => {
            console.error(err?.response?.responseJSON?.message ?? err?.message ?? 'Failed to load top users');
        })
        .finally(() => {
            loading.topUsers = false;
        });
}

function trendType(isPositive) {
    if (isPositive === true) return 'positive';
    if (isPositive === false) return 'negative';
    return 'neutral';
}

function handleDateChange(newDateRange) {
    dateRange.value = newDateRange;
    fetchData();
}

function handleRefresh() {
    fetchData();
}

onMounted(() => {
    scrollToTop();
    fetchData();
});

watch(() => route.params.id, () => {
    video.value = {};
    videoNotFound.value = false;
    scrollToTop();
    fetchData();
});

watch(performanceMetric, () => {
    fetchPerformanceOverTime();
});
</script>
