<template>
    <span class="fplayer-icon fplayer-icon-copy" :title="$t(title)">
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
                d="M7.5 2.5H15.625C16.6605 2.5 17.5 3.33947 17.5 4.375V12.5C17.5 13.5355 16.6605 14.375 15.625 14.375H13.75V15.625C13.75 16.6605 12.9105 17.5 11.875 17.5H4.375C3.33947 17.5 2.5 16.6605 2.5 15.625V7.5C2.5 6.46447 3.33947 5.625 4.375 5.625H6.25V4.375C6.25 3.33947 7.08947 2.5 7.5 2.5ZM4.375 6.875C4.02982 6.875 3.75 7.15482 3.75 7.5V15.625C3.75 15.9702 4.02982 16.25 4.375 16.25H11.875C12.2202 16.25 12.5 15.9702 12.5 15.625V14.375H7.5C6.46447 14.375 5.625 13.5355 5.625 12.5V6.875H4.375ZM7.5 3.75C7.15482 3.75 6.875 4.02982 6.875 4.375V12.5C6.875 12.8452 7.15482 13.125 7.5 13.125H15.625C15.9702 13.125 16.25 12.8452 16.25 12.5V4.375C16.25 4.02982 15.9702 3.75 15.625 3.75H7.5Z"
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
        default: 24
    },
    title: {
        type: String,
        default: 'Copy'
    }
});
</script>
