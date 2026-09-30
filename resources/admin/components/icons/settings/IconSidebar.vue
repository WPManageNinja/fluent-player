<template>
    <span class="fplayer-icon fplayer-icon-sidebar" :title="$t(title)">
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
                d="M3.125 4.375C3.125 3.68464 3.68464 3.125 4.375 3.125H15.625C16.3154 3.125 16.875 3.68464 16.875 4.375V15.625C16.875 16.3154 16.3154 16.875 15.625 16.875H4.375C3.68464 16.875 3.125 16.3154 3.125 15.625V4.375Z"
                stroke="currentColor"
                stroke-width="1.25"
            />
            <path
                d="M7.5 3.125V16.875"
                stroke="currentColor"
                stroke-width="1.25"
            />
        </svg>
    </span>
</template>

<script setup>
import $t from '@/utils/translator/Translator';

defineProps({
    size: {
        type: Number,
        default: 20
    },
    title: {
        type: String,
        default: 'Sidebar'
    }
});
</script>
