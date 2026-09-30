<template>
    <span class="fplayer-icon fplayer-icon-gumlet" :title="$t(title)">
        <svg :width="size" :height="size" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" :aria-label="$t(title)">
            <rect width="40" height="40" rx="9" fill="#5C2AD2"/>
            <path d="M20.6 9.4c3.1 0 5.9 1.2 7.9 3.2l-2.9 3c-1.3-1.3-3.1-2.1-5-2.1-3.9 0-7 3.1-7 7s3.1 7 7 7c2.9 0 5.4-1.8 6.5-4.3h-6.5v-4.1h11.2c.1.6.2 1.3.2 2 0 6.5-5 11.5-11.4 11.5-6.3 0-11.5-5.1-11.5-11.6 0-6.4 5.1-11.5 11.5-11.5z" fill="#fff"/>
        </svg>
    </span>
</template>

<script setup>
import { getCurrentInstance } from 'vue';

const instance = getCurrentInstance();
const $t = instance?.proxy?.$t || ((str) => str);

defineProps({
    size: {
        type: Number,
        default: 24
    },
    title: {
        type: String,
        default: 'Gumlet'
    }
});
</script>
