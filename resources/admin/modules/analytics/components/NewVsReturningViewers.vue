<template>
    <div class="fplayer-analytics-viewer-segmentation">
        <div class="fplayer-analytics-viewer-segmentation-card">
            <div
                v-if="!hasData"
                class="fplayer-analytics-chart-no-data"
            >
                <p>No viewer data available</p>
            </div>
            <template v-else>
                <div
                    class="fplayer-analytics-viewer-segmentation-item fplayer-analytics-viewer-segmentation-item--new"
                >
                    <div class="fplayer-analytics-viewer-segmentation-item-header">
                        <span class="fplayer-analytics-viewer-segmentation-item-label">New Viewers</span>
                        <span class="fplayer-analytics-viewer-segmentation-item-value">
                            {{ formatCount(data.new?.count) }}
                        </span>
                    </div>
                    <div class="fplayer-analytics-viewer-segmentation-progress">
                        <div
                            class="fplayer-analytics-viewer-segmentation-progress-fill fplayer-analytics-viewer-segmentation-progress-fill--new"
                            :style="{ width: formatPct(data.new?.percentage) }"
                        />
                    </div>
                    <div class="fplayer-analytics-viewer-segmentation-item-subtitle">
                        {{ formatPct(data.new?.percentage) }} of total
                    </div>
                </div>
                <div
                    class="fplayer-analytics-viewer-segmentation-item fplayer-analytics-viewer-segmentation-item--returning"
                >
                    <div class="fplayer-analytics-viewer-segmentation-item-header">
                        <span class="fplayer-analytics-viewer-segmentation-item-label">Returning Viewers</span>
                        <span class="fplayer-analytics-viewer-segmentation-item-value">
                            {{ formatCount(data.returning?.count) }}
                        </span>
                    </div>
                    <div class="fplayer-analytics-viewer-segmentation-progress">
                        <div
                            class="fplayer-analytics-viewer-segmentation-progress-fill fplayer-analytics-viewer-segmentation-progress-fill--returning"
                            :style="{ width: formatPct(data.returning?.percentage) }"
                        />
                    </div>
                    <div class="fplayer-analytics-viewer-segmentation-item-subtitle">
                        {{ formatPct(data.returning?.percentage) }} of total
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    data: {
        type: Object,
        default: () => ({ new: { count: 0, percentage: 0 }, returning: { count: 0, percentage: 0 } })
    }
});

const hasData = computed(() => {
    const d = props.data;
    if (!d) return false;
    const total = (d.new?.count ?? 0) + (d.returning?.count ?? 0);
    return total > 0;
});

function formatCount(n) {
    if (n == null || isNaN(Number(n))) return '0';
    return Number(n).toLocaleString();
}

function formatPct(n) {
    if (n == null || isNaN(Number(n))) return '0%';
    return `${Number(n).toFixed(0)}%`;
}
</script>
