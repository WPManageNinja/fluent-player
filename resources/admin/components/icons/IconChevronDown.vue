<template>
    <span class="fplayer-icon fplayer-icon-chevron-down" :title="$t(title)">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            :width="size"
            :height="size"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            <title>{{ $t(title) }}</title>
            <path d="m6 9 6 6 6-6" />
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
        default: 14
    },
    title: {
        type: String,
        default: 'More'
    }
});
</script>
