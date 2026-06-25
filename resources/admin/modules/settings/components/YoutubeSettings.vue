<script setup>
import { ElForm, ElSwitch } from 'element-plus';
import { watch, reactive } from 'vue';

const props = defineProps({
    settings: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['update:settings']);

// Create local reactive copy
const localSettings = reactive({
    privacy_mode: props.settings.privacy_mode || false,
    show_subscribe_button: props.settings.show_subscribe_button || false,
});

// Watch for changes and emit updates
watch(localSettings, (newSettings) => {
    emit('update:settings', {
        ...props.settings,
        ...newSettings
    });
}, { deep: true });

// Watch for prop changes to sync local state
watch(() => props.settings, (newSettings) => {
    if (newSettings.privacy_mode !== undefined) {
        localSettings.privacy_mode = newSettings.privacy_mode;
    }
    if (newSettings.show_subscribe_button !== undefined) {
        localSettings.show_subscribe_button = newSettings.show_subscribe_button;
    }
}, { deep: true, immediate: true });
</script>

<template>
    <div class="fplayer-settings-section fplayer-youtube-settings-page">
	    <div class="fplayer-form-item">
		    <ElSwitch class="fplayer-switch" v-model="localSettings.privacy_mode" aria-label="Privacy-Enhanced Mode" />
		    <div class="fplayer-form-label-wrapper">
			    <label class="fplayer-form-label">Privacy-Enhanced Mode</label>
			    <p class="fplayer-form-help">When enabled, YouTube won't store information about visitors on your website unless they play the video</p>
		    </div>
	    </div>

	    <div class="fplayer-form-item">
		    <ElSwitch class="fplayer-switch" v-model="localSettings.show_subscribe_button" aria-label="Show Subscribe Button" />
		    <div class="fplayer-form-label-wrapper">
			    <label class="fplayer-form-label">Show Subscribe Button</label>
			    <p class="fplayer-form-help">Display a YouTube subscribe button below YouTube videos</p>
		    </div>
	    </div>
    </div>
</template>
