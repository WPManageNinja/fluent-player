<template>
    <div class="fplayer-date-range-picker">
        <el-date-picker
            ref="datePickerRef"
            v-model="dateRangeModel"
            v-model:visible="pickerOpen"
            type="daterange"
            range-separator=" - "
            :start-placeholder="$t('Start date')"
            :end-placeholder="$t('End date')"
            :shortcuts="dateShortcuts"
            :disabled-date="disableFutureDate"
            format="MMM DD YYYY"
            popper-class="fplayer-date-picker-panel"
            :clearable="false"
            @change="handleChange"
        />
        <el-button
            class="fplayer-date-range-picker-refresh fplayer-secondary-btn"
            :class="{ 'fplayer-date-range-picker-refresh--loading': props.refreshing }"
            :loading="props.refreshing"
            :disabled="props.refreshing"
            @click="handleRefresh"
        >
            <el-icon v-if="!props.refreshing"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
  <path d="M16.9444 10.0001C16.9444 13.8354 13.8353 16.9446 9.99999 16.9446C6.16471 16.9446 3.05554 13.8354 3.05554 10.0001C3.05554 6.1648 6.16471 3.05566 9.99999 3.05566V4.44455C6.93172 4.44455 4.44443 6.93186 4.44443 10.0001C4.44443 13.0684 6.93172 15.5557 9.99999 15.5557C13.0683 15.5557 15.5555 13.0684 15.5555 10.0001C15.5555 8.09054 14.5921 6.40599 13.1248 5.40602L13.125 7.22233H11.7361V3.05566H15.9028V4.44455L14.1672 4.44448C15.8537 5.71146 16.9444 7.72839 16.9444 10.0001Z" fill="#525866"/>
</svg></el-icon>
<span>{{ $t('Refresh') }}</span>
        </el-button>
    </div>
</template>

<script setup>
import { computed, onMounted, ref, nextTick, getCurrentInstance } from 'vue';
import { getDefaultDateRange } from '../helpers/time';

const instance = getCurrentInstance();

const DATE_RANGE_STORAGE_KEY = 'analytics_date_range';
const datePickerRef = ref(null);
const pickerOpen = ref(false);

const props = defineProps({
    modelValue: {
        type: Object,
        default: () => getDefaultDateRange()
    },
    refreshing: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:modelValue', 'change', 'refresh']);

function getSavedDateRange() {
    try {
        const savedRange = localStorage.getItem(DATE_RANGE_STORAGE_KEY);
        if (savedRange) {
            const parsed = JSON.parse(savedRange);
            return {
                startDate: new Date(parsed.startDate),
                endDate: new Date(parsed.endDate)
            };
        }
    } catch (e) {
        console.error('Error loading saved date range:', e);
    }
    return null;
}

// Save date range to localStorage
function saveDateRange(range) {
    try {
        localStorage.setItem(DATE_RANGE_STORAGE_KEY, JSON.stringify({
            startDate: range.startDate.toISOString(),
            endDate: range.endDate.toISOString()
        }));
    } catch (e) {
        console.error('Error saving date range:', e);
    }
}

const dateRangeModel = computed({
    get: () => [props.modelValue.startDate, props.modelValue.endDate],
    set: (val) => {
        if (val && val.length === 2) {
            const newValue = {
                startDate: val[0],
                endDate: val[1]
            };
            emit('update:modelValue', newValue);
        }
    }
});

const dateShortcuts = computed(() => {
    const t = instance?.proxy?.$t ?? ((s) => s);
    return [
        {
            text: t('Last week'),
            value: () => {
                const end = new Date();
                const start = new Date();
                start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
                return [start, end];
            }
        },
        {
            text: t('Last month'),
            value: () => {
                const end = new Date();
                const start = new Date();
                start.setTime(start.getTime() - 3600 * 1000 * 24 * 30);
                return [start, end];
            }
        },
        {
            text: t('Last 3 months'),
            value: () => {
                const end = new Date();
                const start = new Date();
                start.setTime(start.getTime() - 3600 * 1000 * 24 * 90);
                return [start, end];
            }
        },
        {
            text: t('Last 6 months'),
            value: () => {
                const end = new Date();
                const start = new Date();
                start.setTime(start.getTime() - 3600 * 1000 * 24 * 180);
                return [start, end];
            }
        },
        {
            text: t('Last year'),
            value: () => {
                const end = new Date();
                const start = new Date();
                start.setTime(start.getTime() - 3600 * 1000 * 24 * 365);
                return [start, end];
            }
        }
    ];
});

function disableFutureDate(date) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return date.getTime() >= tomorrow.getTime();
}

function handleChange(val) {
    if (val && val.length === 2) {
        const newValue = {
            startDate: val[0] instanceof Date ? val[0] : new Date(val[0]),
            endDate: val[1] instanceof Date ? val[1] : new Date(val[1])
        };
        emit('update:modelValue', newValue);
        emit('change', newValue);
        saveDateRange(newValue);
    } else {
        // If the date range is cleared, emit change with default values
        const defaultValue = getDefaultDateRange();
        emit('update:modelValue', defaultValue);
        emit('change', defaultValue);
        saveDateRange(defaultValue);
    }
}

function handleRefresh() {
    emit('refresh');
}

onMounted(() => {
    const savedRange = getSavedDateRange();
    if (savedRange) {
        emit('update:modelValue', savedRange);
        saveDateRange(savedRange);
    }
    // Ensure picker doesn't open on mount
    nextTick(() => {
        pickerOpen.value = false;
        if (datePickerRef.value && typeof datePickerRef.value.close === 'function') {
            datePickerRef.value.close();
        }
    });
});
</script>