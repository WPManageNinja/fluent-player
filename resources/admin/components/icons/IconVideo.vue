<template>
    <span class="fplayer-icon fplayer-icon-video" role="img" :aria-label="title" :title="title">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            :width="size"
            :height="size"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <title>{{ title }}</title>
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" />
            <path d="M10.2 8.6 16 12l-5.8 3.4V8.6Z" fill="currentColor" />
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
        default: 'Video'
    }
});
</script>
