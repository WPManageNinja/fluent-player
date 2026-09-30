<script setup>
const props = defineProps({
    settings: {
        type: Object,
        required: true
    }
});
</script>

<template>
    <div class="fplayer-settings-section fplayer-vimeo-settings-page">
	    <div class="fplayer-form-item">
		    <el-switch id="fp-vimeo-privacy-mode" class="fplayer-switch" v-model="props.settings.privacy_mode" />
		    <div class="fplayer-form-label-wrapper">
			    <label for="fp-vimeo-privacy-mode" class="fplayer-form-label">{{ $t('Privacy-Enhanced Mode') }}</label>
			    <p class="fplayer-form-help">{{ $t("Enabled by default. Vimeo won't set cookies or track visitors unless they play the video. Turn this off to allow Vimeo analytics and cookies.") }}</p>
		    </div>
	    </div>
    </div>
</template>
