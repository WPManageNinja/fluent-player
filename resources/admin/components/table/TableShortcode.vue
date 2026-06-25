<template>
	<span class="fplayer-copy" :title="$t('Click to copy')" :data-clipboard-text="shortcode">
		{{ shortcode }}
	</span>
</template>

<script setup>
defineProps({
	shortcode: {
		type: String,
		required: true
	}
});
</script>

<style scoped>
.fplayer-copy {
	cursor: pointer;
}
</style>
