<template>
    <div
        class="fplayer-analytics-device-chart"
        :class="{ 'fplayer-analytics-device-chart--no-data': !hasData }"
    >
        <div v-if="!hasData" class="fplayer-analytics-chart-no-data">
            <p>No device data available</p>
        </div>
        <div
            v-else
            ref="chartContainer"
            class="fplayer-analytics-device-chart-container chart-container"
        />
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import echarts from '../helpers/echarts';

const props = defineProps({
    data: {
        type: Array,
        default: () => []
    },
    centerText: {
        type: String,
        default: ''
    }
});

const chartContainer = ref(null);
let chart = null;

const hasData = computed(() => props.data && props.data.length > 0);

// Match design: Desktop orange-yellow, Mobile green, Tablet purple
const deviceColors = {
    desktop: '#F6B51E',
    mobile: '#1FC16B',
    tablet: '#47C2FF',
    default: '#6b7280'
};

function getColor(deviceType) {
    const key = String(deviceType || '').toLowerCase();
    if (key.includes('desktop') || key.includes('laptop')) return deviceColors.desktop;
    if (key.includes('mobile') || key.includes('android') || key.includes('iphone')) return deviceColors.mobile;
    if (key.includes('tablet') || key.includes('ipad')) return deviceColors.tablet;
    return deviceColors.default;
}

function renderChart() {
    if (!hasData.value || !chartContainer.value) return;

    if (!chart) {
        chart = echarts.init(chartContainer.value);
    }

    const total = props.data.reduce((sum, d) => sum + (Number(d.count) || 0), 0);
    const chartData = props.data.map((d) => ({
        name: formatDeviceName(d.device_type),
        value: Number(d.count) || 0,
        itemStyle: { color: getColor(d.device_type) }
    }));

    const centerLabel = total > 0
        ? `{totalLabel|Total Views}\n{totalValue|${total.toLocaleString()}}`
        : '{totalLabel|Total Views}\n{totalValue|0}';

    const option = {
        tooltip: {
            trigger: 'item',
            formatter: (params) => {
                if (!params) return '';
                const pct = total > 0 ? ((params.value / total) * 100).toFixed(1) : 0;
                return `${params.name}: ${params.value.toLocaleString()} (${pct}%)`;
            }
        },
        legend: {
            bottom: '0%',
            left: 'center',
            icon: 'circle',
            textStyle: {
                fontSize: 14,
                color: '#525866',
                fontWeight: 500
            },
            itemWidth: 12,
            itemHeight: 12,
            itemGap: 24
        },
        series: [
            {
                name: 'Devices',
                type: 'pie',
                radius: ['55%', '86%'],
                center: ['50%', '44%'],
                avoidLabelOverlap: false,
                padAngle: 3,
                itemStyle: {
                    borderRadius: 3,
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    hoverLayer: false,
                    label: {
                        show: true,
                        formatter: (params) => {
                            const pct = total > 0 ? ((params.value / total) * 100).toFixed(1) : 0;
                            const name = params.name || '';
                            const value = params.value.toLocaleString();
                            return `{deviceName|${name}}\n{value|${value}} ({pct|${pct}%})`;
                        },
                        rich: {
                            deviceName: { fontSize: 16, color: '#525866', fontWeight: 400 },
                            value: { fontSize: 24, color: '#0E121B', fontWeight: 500 },
                            pct: { fontSize: 14, color: '#0E121B', fontWeight: 500 }
                        }
                    }
                },
                labelLine: {
                    show: false
                },
                data: chartData
            },
            {
                type: 'pie',
                radius: ['55%', '86%'],
                center: ['50%', '44%'],
                silent: true,
                label: {
                    show: true,
                    position: 'center',
                    formatter: centerLabel,
                    rich: {
                        totalLabel: { fontSize: 16, color: '#525866', fontWeight: 400 },
                        totalValue: { fontSize: 24, color: '#0E121B', fontWeight: 500 }
                    }
                },
                labelLine: { show: false },
                data: [{ value: 0, itemStyle: { color: 'transparent', borderWidth: 0 } }]
            }
        ]
    };

    chart.setOption(option, true);
    let isOverPie = false;
    chart.off('mouseover');
    chart.off('mouseout');
    chart.off('globalout');
    chart.getZr().off('mousemove');
    const hideTotal = () => chart.setOption({ series: [{}, { label: { show: false } }] });
    const showTotal = () => chart.setOption({ series: [{}, { label: { show: true } }] });
    chart.on('mouseover', (params) => {
        if (params.seriesIndex === 0) {
            isOverPie = true;
            hideTotal();
        }
    });
    chart.on('mouseout', (params) => {
        if (params.seriesIndex === 0) {
            isOverPie = false;
            showTotal();
        }
    });
    chart.on('globalout', () => {
        isOverPie = false;
        showTotal();
    });
    chart.getZr().on('mousemove', (e) => {
        const chartHeight = chart.getHeight();
        const chartWidth = chart.getWidth();
        const y = e.offsetY;
        const x = e.offsetX;
        const legendAtBottom = y >= chartHeight * 0.7 && x >= 0 && x <= chartWidth;
        if (legendAtBottom) {
            hideTotal();
        } else if (!isOverPie) {
            showTotal();
        }
    });
}

function formatDeviceName(type) {
    if (!type) return 'Unknown';
    const s = String(type).toLowerCase();
    if (s.includes('desktop') || s === 'windows' || s === 'mac' || s === 'laptop') return 'Desktop';
    if (s.includes('mobile') || s.includes('android') || s.includes('iphone')) return 'Mobile';
    if (s.includes('tablet') || s.includes('ipad')) return 'Tablet';
    return String(type).charAt(0).toUpperCase() + String(type).slice(1).toLowerCase();
}

watch(
    () => [props.data, props.centerText],
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
