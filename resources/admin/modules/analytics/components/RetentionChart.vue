<template>
    <div
        class="fplayer-analytics-retention-chart retention-chart"
        :class="{ 'fplayer-analytics-retention-chart--no-data': !hasData }"
    >
        <div v-if="!hasData" class="fplayer-analytics-chart-no-data no-retention-data">
            <p>{{ $t('No retention data available') }}</p>
        </div>
        <div
            v-else
            ref="chartContainer"
            class="fplayer-analytics-retention-chart-container chart-container"
        />
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import echarts from '../helpers/echarts';

const props = defineProps({
    data: {
        type: Object,
        default: () => ({ data: [], duration: 0})
    }
});

const chartContainer = ref(null);
let chart = null;

const chartData = computed(() => {
    const d = props.data;
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.data)) return d.data;
    return [];
});
const duration = computed(() => {
    const d = props.data;
    if (d && typeof d.duration === 'number' && d.duration > 0) return d.duration;
    const data = chartData.value;
    const seconds = data.map((row) => row.time_seconds).filter((n) => n != null && !isNaN(n));
    return seconds.length ? Math.max(...seconds) : 0;
});
const hasData = computed(() => chartData.value.length > 0);

function formatTimeLabel(seconds) {
    const n = Number(seconds);
    if (n == null || isNaN(n)) return String(seconds);
    if (n >= 60) return Math.round(n / 60) + 'm';
    return n + 's';
}

function renderChart() {
    if (!hasData.value || !chartContainer.value) return;

    if (!chart) {
        chart = echarts.init(chartContainer.value);
    }

    const data = chartData.value;
    const durationVal = duration.value;
    const seriesData = data.map((d) => [
        d.time_seconds ?? (d.time / 100) * durationVal,
        d.retention ?? 0
    ]);
    const xMax = durationVal > 0 ? durationVal : Math.max(...seriesData.map((p) => p[0]), 1);

    const option = {
        tooltip: {
            trigger: 'item',
            showDelay: 0,
            confine: true,
            z: 9999,
            backgroundColor: '#ffffff',
            borderColor: '#E1E4EA',
            borderWidth: 1,
            borderRadius: 6,
            padding: [4, 10],
            boxShadow: '0 12px 24px 0 rgba(14, 18, 27, 0.06), 0 1px 2px 0 rgba(14, 18, 27, 0.03)',
            textStyle: { fontSize: 14, color: '#0E121B', fontWeight: 400 },
            position: (point, params, dom, rect, size) => {
                const [x, y] = point;
                const gap = 8;
                const tipW = Math.max(0, (size?.contentSize?.[0]) ?? 80);
                const tipH = Math.max(0, (size?.contentSize?.[1]) ?? 32);
                // Bounds: chart container (point is container-relative in ECharts)
                const rectW = chart?.getWidth?.() ?? chartContainer.value?.offsetWidth ?? 0;
                const rectH = chart?.getHeight?.() ?? chartContainer.value?.offsetHeight ?? 0;
                // Default: above point, centered (original behavior)
                let left = x - tipW / 2;
                let top = y - tipH - gap;
                if (rectW > 0 && rectH > 0) {
                    if (left < 0) left = 0;
                    if (left + tipW > rectW) left = rectW - tipW;
                    if (top < 0) top = y + gap;
                    if (top + tipH > rectH) top = Math.max(0, y - tipH - gap);
                }
                return [left, top];
            },
            formatter: (params) => {
                if (!params || params.data == null) return '';
                const point = params.data;
                return `Time ${formatTimeLabel(point[0])}, Retention ${point[1]}%`;
            },
        },
        grid: {
            left: 0,
            right: 8,
            top: 8,
            bottom: 8,
            containLabel: true
        },
        xAxis: {
            type: 'value',
            min: 0,
            max: xMax,
            nameLocation: 'middle',
            nameGap: 'auto',
            nameTextStyle: { fontSize: 12, color: '#99A0AE', fontWeight: 400 },
            axisLine: { lineStyle: { color: '#e5e7eb', width: 0 } },
            axisLabel: {
                fontSize: 12,
                color: '#9ca3af',
                margin: 12,
                formatter: (v) => formatTimeLabel(v)
            },
            axisTick: { show: false},
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            min: 0,
            max: 100,
            axisLine: { show: false },
            name: 'Retention (%)',
            nameTextStyle: { fontSize: 12, color: '#99A0AE', fontWeight: 400 },
            axisLabel: {
                fontSize: 12,
                color: '#9ca3af',
                margin: 40,
                formatter: '{value}'
            },
            axisTick: { show: false},
            splitLine: { show: true, lineStyle: { type: 'dashed', color: '#D6DAE1', width: 1 } }
        },
        series: [
            {
                name: 'Retention',
                type: 'line',
                smooth: true,
                showSymbol: true,
                symbol: 'circle',
                symbolSize: 12,
                data: seriesData,
                itemStyle: { color: '#335CFF' },
                lineStyle: { width: 2, color: '#335CFF' },
                emphasis: {
                    focus: 'self',
                    scale: false,
                    itemStyle: { color: '#335CFF', borderColor: '#fff', borderWidth: 2 },
                    symbolSize: 14
                }
            }
        ]
    };

    chart.setOption(option, true);
    function clearHoverLine() {
        chart.setOption({ graphic: [] }, { replaceMerge: ['graphic'] });
    }
    chart.off('mouseover');
    chart.off('mouseout');
    chart.getZr().off('globalout', clearHoverLine);
    chart.getZr().on('globalout', clearHoverLine);

    chart.on('mouseover', { seriesIndex: 0 }, (params) => {
        if (params.componentType !== 'series' || params.data == null) return;
        const xValue = params.data[0];
        const yValue = params.data[1];
        try {
            const pointPixel = chart.convertToPixel('grid', [xValue, yValue]);
            const bottomPixel = chart.convertToPixel('grid', [xValue, 0]);
            if (pointPixel && bottomPixel && pointPixel[0] != null) {
                const x = pointPixel[0];
                const yStart = pointPixel[1];
                const yEnd = Math.min(bottomPixel[1], yStart + 100);
                const totalLen = yEnd - yStart;
                const segments = 70;
                const step = totalLen / segments;
                const graphicLines = [];
                for (let i = 0; i < segments; i++) {
                    const t = (i + 0.5) / segments;
                    const opacity = 1 - t * t * t;
                    graphicLines.push({
                        type: 'line',
                        shape: {
                            x1: x,
                            y1: yStart + i * step,
                            x2: x,
                            y2: yStart + (i + 1) * step
                        },
                        style: {
                            stroke: '#325BFC',
                            lineWidth: 2,
                            opacity
                        },
                        z: 10,
                        silent: true
                    });
                }
                chart.setOption({ graphic: graphicLines }, { replaceMerge: ['graphic'] });
            }
        } catch (_) {}
    });
    chart.on('mouseout', { seriesIndex: 0 }, () => clearHoverLine());
}

watch(
    () => props.data,
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