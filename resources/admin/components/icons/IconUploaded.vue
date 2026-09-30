<template>
    <span class="fplayer-icon fplayer-icon-uploaded" :title="$t(title)">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            :width="size"
            :height="size"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <title>{{ $t(title) }}</title>
            <path
                d="M4.8 18.2999H19.2V11.9999H21V19.1999C21 19.4386 20.9052 19.6675 20.7364 19.8363C20.5676 20.0051 20.3387 20.0999 20.1 20.0999H3.9C3.66131 20.0999 3.43239 20.0051 3.2636 19.8363C3.09482 19.6675 3 19.4386 3 19.1999V11.9999H4.8V18.2999ZM12.9 9.2999V15.5999H11.1V9.2999H6.6L12 3.8999L17.4 9.2999H12.9Z"
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
        default: 'Uploaded'
    }
});
</script>
