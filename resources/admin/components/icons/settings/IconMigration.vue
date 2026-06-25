<template>
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
    >
        <path d="M12 3v6m0 0l3-3m-3 3l-3-3" />
        <path d="M12 21v-6m0 0l3 3m-3-3l-3 3" />
        <path d="M3 12h6m0 0l-3-3m3 3l-3 3" />
        <path d="M21 12h-6m0 0l3-3m-3 3l3 3" />
    </svg>
</template>

<script setup>
    defineProps({
        size: {
            type: [Number, String],
            default: 20,
        },
    });
</script>
