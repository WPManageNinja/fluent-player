<template>
    <span class="fplayer-icon fplayer-icon-export" :title="$t(title)">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            :width="size"
            :height="size"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            <title>{{ $t(title) }}</title>
            <path
                d="M3 2.5H13V6.5H17V17.5H3V2.5Z"
                fill="none"
            />
            <path
                d="M10 14V8M8 11L10 8L12 11"
                fill="none"
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
        default: 'Export'
    }
});
</script>
