<template>
    <div class="fplayer-analytics-content">
        <div class="fplayer-admin-page-header">
            <h1>{{ $t('Media Analytics') }}</h1>
            <date-range-picker
                v-model="dateRange"
                :refreshing="loading.stats"
                @change="handleDateChange"
                @refresh="handleRefresh"
            />
        </div>

        <div class="fplayer-analytics-stats-cards fplayer-analytics-row">
            <KPICard
                :title="$t('Views')"
                :value="stats?.total_plays ?? 0"
                :change="stats?.total_plays_change"
                :change-type="trendType(stats?.total_plays_is_positive)"
            />
            <KPICard
                :title="$t('Unique Viewers')"
                :value="stats?.unique_viewers ?? 0"
                :change="stats?.unique_viewers_change"
                :change-type="trendType(stats?.unique_viewers_is_positive)"
            />
            <KPICard
                :title="$t('Avg Watch Time')"
                :value="formatDuration(stats?.avg_watch_time)"
                :change="stats?.avg_watch_time_change"
                :change-type="trendType(stats?.avg_watch_time_is_positive)"
            />
            <KPICard
                :title="$t('Completion Rate')"
                :value="formatCompletionRate(stats?.completion_rate)"
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
                            :aria-label="$t('Performance metric')"
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
                    <div v-loading="loading.device">
                        <device-chart :data="deviceData" />
                    </div>
                </el-card>
            </el-col>
        </el-row>

        <el-row :gutter="20" class="fplayer-analytics-row">
            <el-col :xs="24" :md="12">
                <el-card class="fplayer-analytics-card">
                    <template #header>
                        <AnalyticsCardTitle
                            :title="$t('Location Breakdown')"
                            :help-text="$t('Shows where your viewers are located.')"
                        />
                    </template>
                    <div v-loading="loading.location">
                        <location-breakdown-chart :data="locationData" />
                    </div>
                </el-card>
            </el-col>
            <el-col :xs="24" :md="12">
                <el-card class="fplayer-analytics-card">
                    <template #header>
                        <AnalyticsCardTitle
                            :title="$t('Audience Retention')"
                            :help-text="$t('Shows how viewer engagement changes throughout playback.')"
                        />
                    </template>
                    <div v-loading="loading.retention">
                        <retention-chart :data="retentionData" />
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

        <el-row :gutter="20" class="fplayer-analytics-row">
            <el-col :xs="24" :md="16" class="fplayer-list-table-container">
                <AnalyticsTopTable
                    type="videos"
                    :title="$t('Top Media')"
                    :help-text="$t('Lists media with the most views and watch time.')"
                    :data="topVideos"
                    :loading="loading.topVideos"
                />
            </el-col>
            <el-col :xs="24" :md="8">
                <el-card class="fplayer-analytics-card" :class="{ 'fplayer-no-data': !newReturningData.new.count && !newReturningData.returning.count }">
                    <template #header>
                        <AnalyticsCardTitle
                            :title="$t('New vs Returning Viewers')"
                            :help-text="$t('Compares first-time viewers with viewers who watched before.')"
                        />
                    </template>
                    <new-vs-returning-viewers :data="newReturningData" />
                </el-card>
            </el-col>
        </el-row>
    </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, nextTick, getCurrentInstance } from 'vue';
import Rest from '@/utils/http/Rest';
import DateRangePicker from './DateRangePicker.vue';
import AnalyticsCardTitle from './AnalyticsCardTitle.vue';
import KPICard from './KPICard.vue';
import PerformanceOverTimeChart from './PerformanceOverTimeChart.vue';
import LocationBreakdownChart from './LocationBreakdownChart.vue';
import NewVsReturningViewers from './NewVsReturningViewers.vue';
import DeviceChart from './DeviceChart.vue';
import RetentionChart from './RetentionChart.vue';
import AnalyticsTopTable from './AnalyticsTopTable.vue';
import { getDefaultDateRange, formatDate, formatDuration, formatCompletionRate } from '../helpers/time';

const instance = getCurrentInstance();
const $t = instance?.proxy?.$t || ((str) => str);

const dateRange = ref(getDefaultDateRange());
const performanceMetric = ref('plays');
const stats = ref({});
const topVideos = ref([]);
const topUsers = ref([]);
const performanceOverTimeData = ref({ dates: [], series: [] });
const locationData = ref([]);
const newReturningData = ref({ new: { count: 0, percentage: 0 }, returning: { count: 0, percentage: 0 } });
const deviceData = ref([]);
const retentionData = ref([]);
const loading = reactive({
    stats: false,
    topVideos: false,
    topUsers: false,
    performance: false,
    location: false,
    newReturning: false,
    device: false,
    retention: false
});

function trendType(isPositive) {
    if (isPositive === true) return 'positive';
    if (isPositive === false) return 'negative';
    return 'neutral';
}

function fetchData() {
    fetchStats();
    fetchPerformanceOverTime();
    fetchDeviceData();
    fetchLocationBreakdown();
    fetchRetentionData();
    fetchTopUsers();
    fetchTopVideos();
    fetchNewReturningViewers();
}

function fetchStats() {
    loading.stats = true;
    Rest.get('analytics/stats', {
        start_date: formatDate(dateRange.value.startDate),
        end_date: formatDate(dateRange.value.endDate)
    })
        .then((response) => {
            stats.value = response ?? {};
        })
        .catch((err) => {
            console.error(err?.response?.responseJSON?.message ?? err?.message ?? $t('Failed to load analytics stats'));
        })
        .finally(() => {
            loading.stats = false;
        });
}

function fetchTopVideos() {
    loading.topVideos = true;
    Rest.get('analytics/top-videos', {
        start_date: formatDate(dateRange.value.startDate),
        end_date: formatDate(dateRange.value.endDate)
    })
        .then((response) => {
            topVideos.value = Array.isArray(response) ? response : [];
        })
        .catch((err) => {
            console.error(err?.response?.responseJSON?.message ?? err?.message ?? 'Failed to load top videos');
        })
        .finally(() => {
            loading.topVideos = false;
        });
}

function fetchTopUsers() {
    loading.topUsers = true;
    Rest.get('analytics/top-users', {
        start_date: formatDate(dateRange.value.startDate),
        end_date: formatDate(dateRange.value.endDate)
    })
        .then((response) => {
            topUsers.value = Array.isArray(response) ? response : [];
        })
        .catch((err) => {
            console.error(err?.response?.responseJSON?.message ?? err?.message ?? 'Failed to load top users');
        })
        .finally(() => {
            loading.topUsers = false;
        });
}

function fetchPerformanceOverTime() {
    loading.performance = true;
    Rest.get('analytics/performance-over-time', {
        start_date: formatDate(dateRange.value.startDate),
        end_date: formatDate(dateRange.value.endDate),
        metric: performanceMetric.value
    })
        .then((response) => {
            const raw = response?.data;
            if (raw && typeof raw === 'object' && Array.isArray(raw.dates) && Array.isArray(raw.series)) {
                performanceOverTimeData.value = raw;
            } else {
                performanceOverTimeData.value = { dates: [], series: [] };
            }
        })
        .catch((err) => {
            console.error(err?.response?.responseJSON?.message ?? err?.message ?? 'Failed to load performance data');
        })
        .finally(() => {
            loading.performance = false;
        });
}

function fetchLocationBreakdown() {
    loading.location = true;
    Rest.get('analytics/location-breakdown', {
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

function fetchDeviceData() {
    loading.device = true;
    Rest.get('analytics/devices', {
        start_date: formatDate(dateRange.value.startDate),
        end_date: formatDate(dateRange.value.endDate)
    })
        .then((response) => {
            deviceData.value = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
        })
        .catch((err) => {
            console.error(err?.response?.responseJSON?.message ?? err?.message ?? 'Failed to load device data');
        })
        .finally(() => {
            loading.device = false;
        });
}

function fetchRetentionData() {
    loading.retention = true;
    Rest.get('analytics/retention', {
        start_date: formatDate(dateRange.value.startDate),
        end_date: formatDate(dateRange.value.endDate)
    })
        .then((response) => {
            const data = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
            const duration = response?.duration ?? 0;
            retentionData.value = { data, duration };
        })
        .catch((err) => {
            console.error(err?.response?.responseJSON?.message ?? err?.message ?? 'Failed to load retention data');
        })
        .finally(() => {
            loading.retention = false;
        });
}

function fetchNewReturningViewers() {
    loading.newReturning = true;
    Rest.get('analytics/new-returning-viewers', {
        start_date: formatDate(dateRange.value.startDate),
        end_date: formatDate(dateRange.value.endDate)
    })
        .then((response) => {
            const payload = response?.data ?? response;
            newReturningData.value = payload && typeof payload === 'object' && ('new' in payload || 'returning' in payload)
                ? payload
                : { new: { count: 0, percentage: 0 }, returning: { count: 0, percentage: 0 } };
        })
        .catch((err) => {
            console.error(err?.response?.responseJSON?.message ?? err?.message ?? 'Failed to load viewer segmentation');
        })
        .finally(() => {
            loading.newReturning = false;
        });
}

function handleDateChange(newDateRange) {
    dateRange.value = newDateRange;
    fetchData();
}

function handleRefresh() {
    fetchData();
}

watch(performanceMetric, () => {
    fetchPerformanceOverTime();
});

onMounted(() => {
    nextTick(() => fetchData());
});
</script>
