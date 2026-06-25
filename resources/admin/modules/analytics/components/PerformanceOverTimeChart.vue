<template>
    <div
        class="fplayer-analytics-performance-chart"
        :class="{ 'fplayer-analytics-performance-chart--no-data': !hasData }"
    >
        <div v-if="!hasData" class="fplayer-analytics-chart-no-data">
            <p>No performance data available</p>
        </div>
        <template v-else>
            <div
                ref="chartContainer"
                class="fplayer-analytics-performance-chart-container chart-container"
            />
        </template>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import echarts from '../helpers/echarts';

const props = defineProps({
    data: {
        type: [Object, Array],
        default: () => ({ dates: [], series: [] })
    },
    metric: {
        type: String,
        validator: (v) => ['plays', 'watch_time'].includes(v),
        default: 'plays'
    }
});

const chartContainer = ref(null);
let chart = null;

const normalizedData = computed(() => {
    const d = props.data;
    if (!d) return { dates: [], series: [] };
    if (Array.isArray(d)) {
        const dates = d.map((row) => row.date != null ? String(row.date).trim() : '');
        const isWatchTime = props.metric === 'watch_time';
        const values = d.map((row) => (isWatchTime ? row.watch_time ?? 0 : row.plays ?? 0));
        const name = isWatchTime ? 'Watch Time' : 'Views';
        return {
            dates,
            series: [{ name, data: values }]
        };
    }
    return {
        dates: d.dates || [],
        series: d.series || []
    };
});

const hasData = computed(() => {
    const { dates, series } = normalizedData.value;
    if (!series || series.length === 0 || !dates || dates.length === 0) return false;
    const hasAnyValue = series.some((s) => (s.data || []).some((v) => Number(v) > 0));
    return hasAnyValue;
});

const monthLabels = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
    '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
};

// Colors keyed by provider_key so the same provider always gets the same color
const providerColors = {
    vimeo: '#717784',
    youtube: '#FB3748',
    bunnycdn: '#FA7319',
    bunny_storage: '#F6B51E',
    wordpress: '#1FC16B'
};
const providerRgb = {
    vimeo: [120, 144, 156],
    youtube: [239, 107, 107],
    bunnycdn: [255, 183, 77],
    bunny_storage: [255, 213, 79],
    wordpress: [104, 217, 162]
};
const seriesColors = Object.values(providerColors);
const seriesRgb = Object.values(providerRgb);

function formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const parts = String(dateStr).trim().split('-');
    const month = parts[1] ? (monthLabels[parts[1]] || parts[1]) : '';
    if (parts.length >= 3 && parts[2]) {
        const day = parseInt(parts[2], 10);
        return Number.isNaN(day) ? dateStr : `${month} ${day}`;
    }
    if (parts.length >= 2) {
        const year = parts[0] ? parts[0].slice(-2) : '';
        return year ? `${month} ${year}` : month;
    }
    return dateStr;
}

function formatTooltipValue(value, isWatchTime) {
    const num = Number(value);
    if (isWatchTime && num >= 3600) {
        const hours = Math.floor(num / 3600);
        const mins = Math.floor((num % 3600) / 60);
        return `${hours}h ${mins}m`;
    }
    if (isWatchTime) {
        const mins = Math.floor(num / 60);
        const secs = Math.floor(num % 60);
        return `${mins}m ${secs}s`;
    }
    return num.toLocaleString();
}

function formatYAxisLabel(value, isWatchTime) {
    const num = Number(value);
    if (isWatchTime) {
        if (num >= 3600) return Math.round(num / 3600) + 'h';
        if (num >= 60) return Math.round(num / 60) + 'm';
        return num + 's';
    }
    return num >= 1000 ? num / 1000 + 'k' : String(num);
}

function renderChart() {
    if (!hasData.value || !chartContainer.value) return;

    if (!chart) {
        chart = echarts.init(chartContainer.value);
    }

    const isWatchTime = props.metric === 'watch_time';
    const { dates, series } = normalizedData.value;
    const xLabels = dates.map(formatDateLabel);

    const echartsSeries = series.map((s, i) => {
        const providerKey = s.provider_key || s.providerKey;
        const color = providerKey && providerColors[providerKey]
            ? providerColors[providerKey]
            : seriesColors[i % seriesColors.length];
        const rgb = providerKey && providerRgb[providerKey]
            ? providerRgb[providerKey]
            : seriesRgb[i % seriesRgb.length];
        const areaGradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.35)` },
            { offset: 1, color: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.02)` }
        ]);
        return {
            name: s.name,
            type: 'line',
            smooth: true,
            showSymbol: false,
            symbol: 'circle',
            symbolSize: 12,
            data: s.data || [],
            lineStyle: { width: 2, color },
            itemStyle: { color, borderWidth: 0 },
            areaStyle: { color: areaGradient },
            emphasis: {
                focus: 'series',
                showSymbol: true,
                symbolSize: 12,
                itemStyle: { color, borderWidth: 0 }
            }
        };
    });

    const option = {
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            textStyle: { fontSize: 12, color: '#1f2937' },
            formatter: (params) => {
                if (!params || !params.length) return '';
                let html = `${params[0].name}<br/>`;
                params.forEach((p) => {
                    const val = p.value != null ? p.value : 0;
                    const formatted = formatTooltipValue(val, isWatchTime);
                    html += `${p.marker} ${p.seriesName}: ${formatted}<br/>`;
                });
                return html;
            }
        },
        legend: {
            data: series.map((s) => s.name),
            orient: 'horizontal',
            top: 4,
            left: 'center',
            icon: 'roundRect',
            itemWidth: 16,
            itemHeight: 16,
            itemGap: 24,
            textStyle: { 
                color: '#080808',
                fontSize: 14,
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: 16
            }
        },
        grid: {
            left: 0,
            right: 8,
            top: 44,
            bottom: 25,
            containLabel: true
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: xLabels,
            name: 'Timeline',
            nameLocation: 'middle',
            nameGap: 32,
            nameTextStyle: { fontSize: 12, color: '#99A0AE' },
            axisLine: { show: false },
            axisLabel: { fontSize: 12, color: '#99A0AE', fontWeight: 400, margin: 16 },
            axisTick: { show: false },
            splitLine: { show: true, lineStyle: { type: 'dashed', color: '#E1E4EA', width: 1 } }
        },
        yAxis: {
            type: 'value',
            name: '',
            axisLine: { show: false },
            axisLabel: {
                fontSize: 12,
                fontWeight: 400,
                color: '#525866',
                margin: 40,
                formatter: (value) => formatYAxisLabel(value, isWatchTime)
            },
            splitLine: { show: false }
        },
        series: echartsSeries
    };

    chart.setOption(option, true);
}

watch(
    () => [props.data, props.metric],
    () => {
        nextTick(() => {
            if (chart) {
                chart.dispose();
                chart = null;
            }
            renderChart();
        });
    },
    { deep: true }
);

function handleResize() {
    if (chart) chart.resize();
}

onMounted(() => {
    nextTick(renderChart);
    window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    if (chart) {
        chart.dispose();
        chart = null;
    }
});
</script>
