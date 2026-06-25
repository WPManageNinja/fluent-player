<template>
    <div
        class="fplayer-analytics-completion-progress"
        :class="progressModifierClass"
    >
        <div class="fplayer-analytics-completion-progress-bar">
            <div
                class="fplayer-analytics-completion-progress-fill"
                :style="{ width: clampedWidth }"
            />
        </div>
        <span v-if="showLabel" class="fplayer-analytics-completion-progress-label">
            {{ labelText }}
        </span>
    </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    percentage: {
        type: [Number, String],
        default: 0
    },
    showLabel: {
        type: Boolean,
        default: true
    }
});

const pct = computed(() => {
    const n = Number(props.percentage);
    return isNaN(n) ? 0 : Math.min(100, Math.max(0, n));
});

const clampedWidth = computed(() => `${pct.value}%`);

const labelText = computed(() => `${Math.round(pct.value)}%`);

const progressModifierClass = computed(() => {
    const p = pct.value;
    if (p >= 70) return 'fplayer-analytics-completion-progress--high';
    if (p >= 40) return 'fplayer-analytics-completion-progress--medium';
    return 'fplayer-analytics-completion-progress--low';
});
</script>
