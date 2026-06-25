<template>
  <div class="fplayer-analytics-kpi-card">
    <div class="fplayer-analytics-kpi-title">{{ title }}</div>
    <div class="fplayer-analytics-kpi-value-row">
      <div class="fplayer-analytics-kpi-value">{{ formattedValue }}</div>
      <div
        v-if="change !== null && change !== undefined"
        class="fplayer-analytics-kpi-trend"
        :class="trendClass"
      >
        <span class="fplayer-analytics-kpi-trend-icon" aria-hidden="true">
          <template v-if="changeType === 'positive'">
            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="10" viewBox="0 0 19 10" fill="none">
  <path d="M17.4167 0.75L10.8595 7.30719C10.5295 7.6372 10.3645 7.80221 10.1742 7.86403C10.0068 7.91842 9.82652 7.91842 9.65915 7.86403C9.46888 7.80221 9.30387 7.6372 8.97386 7.30719L6.69281 5.02614C6.36279 4.69613 6.19779 4.53112 6.00751 4.4693C5.84014 4.41492 5.65985 4.41492 5.49248 4.4693C5.30221 4.53112 5.1372 4.69613 4.80719 5.02614L0.75 9.08333M17.4167 0.75H11.5833M17.4167 0.75V6.58333" stroke="#23A682" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
          </template>
          <template v-else-if="changeType === 'negative'"><svg xmlns="http://www.w3.org/2000/svg" width="19" height="10" viewBox="0 0 19 10" fill="none">
  <path d="M17.4167 9.08333L10.8595 2.52614C10.5295 2.19613 10.3645 2.03112 10.1742 1.9693C10.0068 1.91492 9.82652 1.91492 9.65915 1.9693C9.46888 2.03112 9.30387 2.19613 8.97386 2.52614L6.69281 4.80719C6.36279 5.1372 6.19779 5.30221 6.00751 5.36403C5.84014 5.41842 5.65985 5.41842 5.49248 5.36403C5.30221 5.30221 5.1372 5.1372 4.80719 4.80719L0.75 0.75M17.4167 9.08333H11.5833M17.4167 9.08333V3.25" stroke="#FB3748" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg></template>
          <template v-else>−</template>
        </span>
        <span class="fplayer-analytics-kpi-trend-value">{{ trendLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [Number, String],
    default: 0
  },
  change: {
    type: Number,
    default: null
  },
  changeType: {
    type: String,
    validator: (v) => ['positive', 'negative', 'neutral'].includes(v),
    default: 'neutral'
  }
});

const formattedValue = computed(() => {
  const v = props.value;
  if (v === null || v === undefined) return '0';
  if (typeof v === 'string') return v;
  const n = Number(v);
  if (isNaN(n)) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(Math.round(n));
});

const trendClass = computed(() => {
  if (props.changeType === 'positive') return 'fplayer-analytics-kpi-trend--positive';
  if (props.changeType === 'negative') return 'fplayer-analytics-kpi-trend--negative';
  return 'fplayer-analytics-kpi-trend--neutral';
});

const trendLabel = computed(() => {
  const c = props.change;
  if (c === null || c === undefined) return '';
  const n = Math.abs(Number(c));
  if (isNaN(n)) return '';
  const rounded = Math.round(n * 10) / 10;
  if (Math.round(rounded) === rounded) return `${Math.round(rounded)}%`;
  return `${rounded.toFixed(1)}%`;
});
</script>
