<template>
    <span class="fplayer-icon fplayer-icon-search" :title="$t(title)">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            :width="size"
            :height="size"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
        >
            <title>{{ $t(title) }}</title>
            <path
                d="M12.0232 10.9627L15.2355 14.1742L14.1742 15.2355L10.9627 12.0232C9.7678 12.9812 8.2815 13.5022 6.75 13.5C3.024 13.5 0 10.476 0 6.75C0 3.024 3.024 0 6.75 0C10.476 0 13.5 3.024 13.5 6.75C13.5022 8.2815 12.9812 9.7678 12.0232 10.9627ZM10.5187 10.4062C11.4706 9.42741 12.0021 8.11532 12 6.75C12 3.849 9.65025 1.5 6.75 1.5C3.849 1.5 1.5 3.849 1.5 6.75C1.5 9.65025 3.849 12 6.75 12C8.11532 12.0021 9.42741 11.4706 10.4062 10.5187L10.5187 10.4062V10.4062Z"
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
        default: 16
    },
    title: {
        type: String,
        default: 'Search'
    }
});
</script>
