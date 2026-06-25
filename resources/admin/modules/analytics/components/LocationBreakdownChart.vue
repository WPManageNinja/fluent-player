<template>
    <div
        class="fplayer-analytics-location-chart"
        :class="{ 'fplayer-analytics-location-chart--no-data': !hasData }"
    >
        <div v-if="!hasData" class="fplayer-analytics-chart-no-data">
            <p>No location data available</p>
        </div>
        <div v-else class="fplayer-analytics-location-chart-wrap">
            <div class="fplayer-analytics-location-map-actions">
                <button
                    type="button"
                    class="fplayer-analytics-location-zoom-btn"
                    aria-label="Zoom in"
                    @click="zoomIn"
                >
                    +
                </button>
                <button
                    type="button"
                    class="fplayer-analytics-location-zoom-btn"
                    aria-label="Zoom out"
                    @click="zoomOut"
                >
                    −
                </button>
                <button
                    type="button"
                    class="fplayer-analytics-location-zoom-btn"
                    aria-label="Reset map"
                    @click="resetChart"
                >
                    ↺
                </button>
            </div>
            <div
                ref="chartContainer"
                class="fplayer-analytics-location-chart-container chart-container"
            />
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import echarts from '../helpers/echarts';

let worldGeoJsonPromise = null;
function getWorldGeoJson() {
    if (!worldGeoJsonPromise) {
        worldGeoJsonPromise = import('../data/world.geo.json')
            .then((m) => m.default)
            .catch((err) => {
                worldGeoJsonPromise = null; // Allow retry on next call
                throw err;
            });
    }
    return worldGeoJsonPromise;
}

const ZOOM_LEVEL = 1.2;
const MIN_ZOOM = 1.2;
const MAX_ZOOM = 20;
const ZOOM_INTERVAL = 0.5;

const props = defineProps({
    data: {
        type: Array,
        default: () => []
    }
});

const chartContainer = ref(null);
const currentVisualMapRange = ref([0, 50]);
const zoomLevel = ref(ZOOM_LEVEL);
let chart = null;

const countryMapping = {
    'United States': 'United States of America',
    'United States (US)': 'United States of America',
    'United Kingdom': 'United Kingdom',
    'United Kingdom (UK)': 'United Kingdom',
    'United Kingdom (GB)': 'United Kingdom',
    UAE: 'United Arab Emirates',
    'Hong Kong': 'China',
    Taiwan: 'Taiwan'
};

function normalizeCountryName(apiName) {
    if (!apiName || typeof apiName !== 'string') return '';
    const trimmed = apiName.trim();
    if (countryMapping[trimmed]) return countryMapping[trimmed];
    const cleanName = trimmed.replace(/\s*\([A-Z]{2,3}\)\s*$/, '').trim();
    return countryMapping[cleanName] || cleanName;
}

const hasData = computed(() => props.data && props.data.length > 0);

const mapData = computed(() =>
    (props.data || []).map((d) => ({
        name: normalizeCountryName(d.country || 'Unknown'),
        value: Number(d.count) || 0
    }))
);

const maxValue = computed(() => {
    const values = mapData.value.map((d) => d.value);
    return values.length ? Math.max(...values) : 50;
});

const COLOR_ACTIVE = '#1A7EFB';
const COLOR_INACTIVE = '#CACFD8';

function getColor(value) {
    if (value == null || value <= 0 || isNaN(value)) {
        return COLOR_INACTIVE;
    }
    const max = Math.max(1, maxValue.value);
    const intensity = Math.log(value + 1) / Math.log(max + 1);
    return `rgba(26, 126, 251, ${intensity})`;
}

const coloredData = computed(() => {
    const [minRange, maxRange] = currentVisualMapRange.value;
    const minR = Math.round(minRange);
    const maxR = Math.round(maxRange);
    return mapData.value.map((item) => {
        const value = item.value || 0;
        const isInRange = value >= minR && value <= maxR;
        return {
            ...item,
            itemStyle: {
                color: isInRange ? getColor(value) : COLOR_INACTIVE
            },
            emphasis: {
                itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' }
            }
        };
    });
});

async function registerWorldMap() {
    if (!echarts.getMap('world')) {
        const worldGeoJson = await getWorldGeoJson();
        echarts.registerMap('world', worldGeoJson);
    }
}

function getMapOption() {
    return {
        backgroundColor: '#f8f9fa',
        tooltip: {
            trigger: 'item',
            formatter: (params) => {
                const raw = params.value != null ? Number(params.value) : 0;
                const value = Number.isFinite(raw) ? raw : 0;
                return `<strong>${escapeHtml(params.name || '')}</strong><br/>Views: ${value.toLocaleString()}`;
            },
            borderRadius: 8,
            backgroundColor: '#ffffff',
            borderColor: '#c0c4ca',
            borderWidth: 1,
            textStyle: {
                color: '#565865'
            }
        },
        visualMap: {
            min: 0,
            max: maxValue.value,
            left: 'left',
            top: '2%',
            text: ['High', 'Low'],
            orient: 'horizontal',
            calculable: true,
            range: currentVisualMapRange.value,
            inRange: {
                color: ['#e8f0fe', COLOR_ACTIVE]
            },
            textStyle: {
                color: '#666'
            }
        },
        series: [
            {
                name: 'Views',
                type: 'map',
                map: 'world',
                roam: true,
                zoom: zoomLevel.value,
                label: { show: false },
                emphasis: {
                    label: {
                        show: true,
                        color: '#333',
                        fontWeight: 'bold'
                    },
                    itemStyle: {
                        areaColor: COLOR_ACTIVE,
                        shadowBlur: 10,
                        shadowColor: '#ccc'
                    }
                },
                itemStyle: {
                    borderColor: '#ddd',
                    borderWidth: 0.5
                },
                data: coloredData.value,
                select: { disabled: true },
                selectedMode: false
            }
        ]
    };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function zoomIn() {
    if (!chart || chart.isDisposed()) return;
    zoomLevel.value = Math.min(zoomLevel.value + ZOOM_INTERVAL, MAX_ZOOM);
    chart.setOption({ series: [{ zoom: zoomLevel.value }] });
}

function zoomOut() {
    if (!chart || chart.isDisposed()) return;
    zoomLevel.value = Math.max(zoomLevel.value - ZOOM_INTERVAL, MIN_ZOOM);
    chart.setOption({ series: [{ zoom: zoomLevel.value }] });
}

function resetChart() {
    if (!chart || chart.isDisposed()) return;
    zoomLevel.value = MIN_ZOOM;
    currentVisualMapRange.value = [0, maxValue.value];
    chart.clear();
    chart.setOption(getMapOption(), { notMerge: true });
}

function updateChart() {
    if (!chart || chart.isDisposed()) return;
    nextTick(() => {
        chart.clear();
        chart.setOption(getMapOption(), { notMerge: true });
    });
}

function initChartListeners() {
    if (!chart) return;
    chart.off('datarangeselected');
    chart.off('georoam');
    chart.on('datarangeselected', (params) => {
        if (params && params.selected) {
            currentVisualMapRange.value = params.selected;
            updateChart();
        }
    });
    chart.on('georoam', () => {
        const option = chart.getOption();
        if (option?.series?.[0]?.zoom != null) {
            let newZoom = option.series[0].zoom;
            if (newZoom < MIN_ZOOM || newZoom > MAX_ZOOM) {
                newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
                chart.setOption({ series: [{ zoom: newZoom }] }, false);
            }
            zoomLevel.value = newZoom;
        }
    });
}

async function renderChart() {
    if (!hasData.value || !chartContainer.value) return;

    await registerWorldMap();

    if (!chart) {
        chart = echarts.init(chartContainer.value);
    }

    const el = chartContainer.value;
    if (el.offsetWidth === 0 || el.offsetHeight === 0) {
        setTimeout(renderChart, 200);
        return;
    }

    zoomLevel.value = ZOOM_LEVEL;
    currentVisualMapRange.value = [0, maxValue.value];

    const option = getMapOption();
    chart.setOption(option, { notMerge: true });
    initChartListeners();
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
