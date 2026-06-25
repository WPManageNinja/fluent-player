<template>
    <span class="fplayer-icon fplayer-icon-settings-analytics" :title="$t(title)">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            :width="size"
            :height="size"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
        >
            <title>{{ $t(title) }}</title>
            <path
                d="M4.75 3.25V15.25H16.75V16.75H3.25V3.25H4.75ZM16.2197 5.71975L17.2802 6.78025L13 11.0605L10.75 8.81125L7.53025 12.0303L6.46975 10.9698L10.75 6.6895L13 8.93875L16.2197 5.71975Z"
                fill="currentColor"
            />
        </svg>
    </span>
</template>

<script setup>
import { getCurrentInstance } from 'vue';

const instance = getCurrentInstance();
const $t = instance?.proxy?.$t || ((str) => str);

defineProps({
    size: {
        type: Number,
        default: 20
    },
    title: {
        type: String,
        default: 'Analytics'
    }
});
</script>
