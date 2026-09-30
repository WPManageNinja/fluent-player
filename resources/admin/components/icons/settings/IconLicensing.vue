<template>
    <span class="fplayer-icon fplayer-icon-licensing" :title="$t(title)">
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
                d="M12.5 2.5a5 5 0 0 0-4.83 6.273L2.72 13.72a.75.75 0 0 0-.22.53V16.5a1 1 0 0 0 1 1h2.25a.75.75 0 0 0 .75-.75v-1h1a.75.75 0 0 0 .75-.75v-1h1a.75.75 0 0 0 .53-.22l.448-.448A5 5 0 1 0 12.5 2.5Zm1.25 4.25a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
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
        default: 'Licensing'
    }
});
</script>
