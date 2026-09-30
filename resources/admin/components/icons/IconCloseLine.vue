<template>
    <span class="fplayer-icon fplayer-icon-close-line" :title="$t(title)">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            :width="size"
            :height="size"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
        >
            <title>{{ $t(title) }}</title>
            <path
                d="M4.773 3.7125L8.4855 0L9.546 1.0605L5.8335 4.773L9.546 8.4855L8.4855 9.546L4.773 5.8335L1.0605 9.546L0 8.4855L3.7125 4.773L0 1.0605L1.0605 0L4.773 3.7125Z"
                fill="#525866"
            />
        </svg>
    </span>
</template>

<script setup>
import $t from '@/utils/translator/Translator';

defineProps({
    size: {
        type: Number,
        default: 10
    },
    title: {
        type: String,
        default: 'Close'
    }
});
</script>
