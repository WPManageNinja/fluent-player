<template>
    <span class="fplayer-icon fplayer-icon-storage" :title="$t(title)">
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
                d="M3.25 16.75C3.05109 16.75 2.86032 16.671 2.71967 16.5303C2.57902 16.3897 2.5 16.1989 2.5 16V4C2.5 3.80109 2.57902 3.61032 2.71967 3.46967C2.86032 3.32902 3.05109 3.25 3.25 3.25H16.75C16.9489 3.25 17.1397 3.32902 17.2803 3.46967C17.421 3.61032 17.5 3.80109 17.5 4V16C17.5 16.1989 17.421 16.3897 17.2803 16.5303C17.1397 16.671 16.9489 16.75 16.75 16.75H3.25ZM12.25 8.5H4V15.25H12.25V8.5ZM16 8.5H13.75V15.25H16V8.5ZM16 4.75H4V7H16V4.75Z"
                fill="currentColor"
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
        default: 'Storage'
    }
});
</script>
