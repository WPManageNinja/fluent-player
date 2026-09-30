<script setup>
const props = defineProps({
    settings: {
        type: Object,
        required: true
    }
});
</script>

<template>
    <div class="fplayer-settings-section fplayer-youtube-settings-page">
	    <div class="fplayer-form-item">
		    <el-switch id="fp-yt-privacy-mode" class="fplayer-switch" v-model="props.settings.privacy_mode" />
		    <div class="fplayer-form-label-wrapper">
			    <label for="fp-yt-privacy-mode" class="fplayer-form-label">{{ $t('Privacy-Enhanced Mode') }}</label>
			    <p class="fplayer-form-help">{{ $t("When enabled, YouTube won't store information about visitors on your website unless they play the video") }}</p>
		    </div>
	    </div>

	    <div class="fplayer-form-item">
		    <el-switch id="fp-yt-subscribe-button" class="fplayer-switch" v-model="props.settings.show_subscribe_button" />
		    <div class="fplayer-form-label-wrapper">
			    <label for="fp-yt-subscribe-button" class="fplayer-form-label">{{ $t('Show Subscribe Button') }}</label>
			    <p class="fplayer-form-help">{{ $t('Display a YouTube subscribe button below YouTube videos') }}</p>
		    </div>
	    </div>
    </div>
</template>
