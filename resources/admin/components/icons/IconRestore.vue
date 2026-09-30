<template>
    <span class="fplayer-icon fplayer-icon-restore" :title="title">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            :width="size"
            :height="size"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#525866"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            <title>{{ title }}</title>
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
        </svg>
    </span>
</template>

<script setup>
defineProps({
    size: {
        type: Number,
        default: 24
    },
    title: {
        type: String,
        default: 'Restore'
    }
});
</script>
