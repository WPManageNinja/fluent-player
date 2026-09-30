<template>
    <span class="fplayer-icon fplayer-icon-delete" :title="$t(title)">
	    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
		    <title>{{ $t(title) }}</title>
	        <path d="M22.0612 6.84699C21.8197 5.92316 21.1081 5.19559 20.2046 4.94867C18.5669 4.5 12 4.5 12 4.5C12 4.5 5.43315 4.5 3.79544 4.94867C2.89193 5.19563 2.18033 5.92316 1.93882 6.84699C1.5 8.52148 1.5 12.0152 1.5 12.0152C1.5 12.0152 1.5 15.5088 1.93882 17.1833C2.18033 18.1071 2.89193 18.8044 3.79544 19.0513C5.43315 19.5 12 19.5 12 19.5C12 19.5 18.5669 19.5 20.2046 19.0513C21.1081 18.8044 21.8197 18.1071 22.0612 17.1833C22.5 15.5088 22.5 12.0152 22.5 12.0152C22.5 12.0152 22.5 8.52148 22.0612 6.84699ZM9.85226 15.1871V8.84316L15.3409 12.0152L9.85226 15.1871Z" fill="#FF0000"/>
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
		default: 'Youtube'
	}
});
</script>
