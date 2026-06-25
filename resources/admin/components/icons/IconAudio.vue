<template>
    <span class="fplayer-icon fplayer-icon-audio" role="img" :aria-label="title" :title="title">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            :width="size"
            :height="size"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <title>{{ title }}</title>
            <rect x="3.5" y="8" width="2.2" height="8" rx="1.1" fill="#525866" />
            <rect x="8.4" y="4.5" width="2.2" height="15" rx="1.1" fill="#525866" />
            <rect x="13.3" y="7" width="2.2" height="10" rx="1.1" fill="#525866" />
            <rect x="18.2" y="9.5" width="2.2" height="5" rx="1.1" fill="#525866" />
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
        default: 'Audio'
    }
});
</script>
