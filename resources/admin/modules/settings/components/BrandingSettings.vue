<script setup>
import {watch, computed, getCurrentInstance} from 'vue';
import {ElInput, ElButton} from 'element-plus';

const instance = getCurrentInstance();
const $t = instance?.proxy?.$t || ((str) => str);
const assetUrl = window.fluentFrameworkAdmin?.asset_url || '';

const props = defineProps({
    settings: {
        type: Object,
        required: true
    }
});

// Logo position handling
const logoPositions = computed(() => [
    {value: 'top-left', label: $t('Top Left')},
    {value: 'top-right', label: $t('Top Right')},
    {value: 'bottom-left', label: $t('Bottom Left')},
    {value: 'bottom-right', label: $t('Bottom Right')},
]);

// Initialize defaults if missing — re-runs when settings load asynchronously
watch(() => props.settings, (s) => {
    if (!s) return;
    if (!s.logo_width) s.logo_width = 24;
    // Strip legacy `position-` prefix so UI button values match (player code re-adds the prefix on render)
    if (typeof s.logo_position === 'string' && s.logo_position.startsWith('position-')) {
        s.logo_position = s.logo_position.replace(/^position-/, '');
    }
    if (!s.logo_position) s.logo_position = 'top-right';
}, { immediate: true });

// Media library handler
const openMediaLibrary = () => {
    const mediaFrame = wp.media({
        title: $t('Select or Upload Logo'),
        button: {
            text: $t('Use this logo')
        },
        library: {
            type: 'image'
        },
        multiple: false
    });

    mediaFrame.on('select', function () {
        const attachment = mediaFrame.state().get('selection').first().toJSON();
        props.settings.logo_url = attachment.url;
    });

    mediaFrame.open();
};

// Computed for preview
const previewStyle = computed(() => {
    return {
        '--brand-color': props.settings.brand_color || '#DD1F13'
    };
});
</script>

<template>
    <div class="fplayer-branding-settings-page">
        <el-row :gutter="24">
            <!-- Left Column: Settings -->
            <el-col :span="24" :md="10">
                <!-- Brand Color Card -->
                <div class="fplayer-card">
                    <div class="fplayer-card-header">
                        <h3>{{ $t('Brand Color') }}</h3>
                    </div>
                    <div class="fplayer-card-body">
                        <div class="fplayer-form-group">
                            <label class="fplayer-form-group-label">{{ $t('Brand Color') }}</label>
                            <div class="color-picker-wrapper">
                                <ElColorPicker v-model="settings.brand_color" @active-change="(val) => settings.brand_color = val" />
                                <ElInput v-model="settings.brand_color" placeholder="#DD1F13" class="color-input" aria-label="Brand Color hex value" />
                            </div>
                            <p class="fplayer-form-group-help-text">{{ $t('This color will be used as the primary color for player controls') }}</p>
                        </div>

                        <div class="fplayer-form-group">
                            <label class="fplayer-form-group-label">{{ $t('Control Bar Color') }}</label>
                            <div class="color-picker-wrapper">
                                <ElColorPicker v-model="settings.control_bar_color" show-alpha @active-change="(val) => settings.control_bar_color = val" />
                                <ElInput v-model="settings.control_bar_color" placeholder="#171717A6" class="color-input" aria-label="Control Bar Color hex value" />
                            </div>
                            <p class="fplayer-form-group-help-text">{{ $t('Background color for the player control bar (leave empty for default)') }}</p>
                        </div>
                    </div>
                </div>

                <!-- Player Logo Card -->
                <div class="fplayer-card">
                    <div class="fplayer-card-header">
                        <h3>{{ $t('Player Logo') }}</h3>
                    </div>
                    <div class="fplayer-card-body">

                        <!-- Logo Image -->
                        <div class="fplayer-form-group">
                            <label class="fplayer-form-group-label">{{ $t('Logo Image') }}</label>
                            <div class="fplayer-logo-upload-area">
                                <ElButton class="fplayer-logo-upload-button" @click="openMediaLibrary">
	                                <el-icon><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
		                                <path d="M3.5 10.5V15.75H16.5V10.5H17V16C17 16.0663 16.9736 16.1299 16.9268 16.1768C16.8799 16.2236 16.8163 16.25 16.75 16.25H3.25C3.18369 16.25 3.12013 16.2236 3.07324 16.1768C3.02636 16.1299 3 16.0663 3 16V10.5H3.5ZM13.293 7.25H10.25V12.5H9.75V7.25H6.70703L10 3.95703L13.293 7.25Z" fill="#565865" stroke="#565865"/></svg>
	                                </el-icon>
                                    {{ settings.logo_url ? $t('Change Logo') : $t('Upload') }}
                                </ElButton>
                                <ElButton v-if="settings.logo_url" @click="settings.logo_url = ''" type="danger" plain size="small" style="margin-left: 10px;">
                                    {{ $t('Remove') }}
                                </ElButton>
                            </div>
                             <div v-if="settings.logo_url" class="fplayer-logo-thumbnail">
                                <img :src="settings.logo_url" alt="Logo Preview" />
                            </div>
                            <p class="fplayer-form-group-help-text">{{ $t('PNG/JPEG, min 24x24px. Shown on branded content.') }}</p>
                        </div>

                        <!-- Logo Link -->
                        <div class="fplayer-form-group" v-if="settings.logo_url">
                            <label class="fplayer-form-group-label">Logo Link <span class="optional">(Optional)</span></label>
                            <ElInput v-model="settings.logo_link" placeholder="https://yourwebsite.com" />
                            <p class="fplayer-form-group-help-text">URL to navigate to when the logo is clicked</p>
                        </div>

                        <!-- Logo Position -->
                        <div class="fplayer-form-group" v-if="settings.logo_url">
                            <label class="fplayer-form-group-label">Logo Position</label>
                            <div class="fplayer-logo-position-grid">
                                <button
                                    v-for="pos in logoPositions"
                                    :key="pos.value"
                                    type="button"
                                    class="fplayer-logo-position-grid-item"
                                    :class="{ 'active': settings.logo_position === pos.value }"
                                    :aria-pressed="settings.logo_position === pos.value"
                                    @click="settings.logo_position = pos.value"
                                >
                                    <div class="pos-preview">
                                        <span class="dot" :class="pos.value"></span>
                                    </div>
                                    <span class="pos-label">{{ pos.value.replace('position-', '').replace('-', ' ') }}</span>
                                </button>
                            </div>
                        </div>

                         <!-- Logo Width (Only show if logo uploaded) -->
                        <div class="fplayer-form-group" v-if="settings.logo_url">
                            <label class="fplayer-form-group-label">Logo Width (px)</label>
	                        <el-input
		                        v-model="settings.logo_width"
		                        type="number"
		                        :min="20"
		                        :max="500"
	                        />
                        </div>
                    </div>
                </div>
            </el-col>

            <!-- Right Column: Preview & Tips -->
            <el-col :span="24" :md="14">
	            <div class="fplayer-card fplayer-branding-sticky-card">
		            <div class="fplayer-card-header">
			            <h3>Live Interactive Preview</h3>
		            </div>
		            <div class="fplayer-card-body">
			            <div class="fplayer-branding-preview-frame">
				            <div class="fplayer-branding-preview-controls">
					            <el-icon>
						            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
							            <circle cx="6" cy="6" r="6" fill="#EC6A5E"/>
							            <circle cx="6" cy="6" r="5.5" stroke="#1F1F1F" stroke-opacity="0.06" />
						            </svg>
					            </el-icon>
					            <el-icon>
						            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
							            <circle cx="6" cy="6" r="6" fill="#F4BF4F"/>
							            <circle cx="6" cy="6" r="5.5" stroke="#1F1F1F" stroke-opacity="0.06" />
						            </svg>
					            </el-icon>
					            <el-icon>
						            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
							            <circle cx="6" cy="6" r="6" fill="#61C554"/>
							            <circle cx="6" cy="6" r="5.5" stroke="#1F1F1F" stroke-opacity="0.06"/>
						            </svg>
					            </el-icon>
				            </div>
				            <div class="fplayer-branding-preview-video">
					            <img :src="assetUrl + 'images/preview-bg.jpg'" class="fplayer-branding-preview-video-image" alt="Video Background" />

					            <!-- Logo Overlay -->
					            <div v-if="settings.logo_url" class="fplayer-branding-preview-video-logo" :class="settings.logo_position">
						            <div class="fplayer-branding-preview-video-logo-wrapper" :style="{ width: settings.logo_width + 'px' }">
							            <a
								            :href="settings.logo_link || '#'"
								            :target="settings.logo_link ? '_blank' : undefined"
								            :rel="settings.logo_link ? 'noopener noreferrer' : undefined"
								            @click="!settings.logo_link && $event.preventDefault()"
							            >
								            <img :src="settings.logo_url" alt="Logo" />
							            </a>
						            </div>
					            </div>

					            <!-- Big Play Button - white/glass background with brand-colored icon -->
					            <el-button class="fplayer-branding-preview-video-play-button" style="background-color: rgba(255, 255, 255, 0.85);" aria-hidden="true" tabindex="-1">
						            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32">
							            <path d="M10.6667 6.6548C10.6667 6.10764 11.2894 5.79346 11.7295 6.11862L24.377 15.4634C24.7377 15.7298 24.7377 16.2692 24.3771 16.5357L11.7295 25.8813C11.2895 26.2065 10.6667 25.8923 10.6667 25.3451L10.6667 6.6548Z" :fill="settings.brand_color || '#DD1F13'"/>
						            </svg>
					            </el-button>

					            <!-- Control Bar Preview -->
					            <div class="fplayer-branding-preview-control-bar" :style="{ backgroundColor: settings.control_bar_color || '#171717A6' }">
						            <!-- Progress bar -->
						            <div class="fplayer-branding-preview-progress-wrapper">
							            <div class="fplayer-branding-preview-progress-track">
								            <div class="fplayer-branding-preview-progress-fill" :style="{ width: '35%', backgroundColor: settings.brand_color || '#DD1F13' }"></div>
							            </div>
						            </div>
						            <!-- Controls row -->
						            <div class="fplayer-branding-preview-controls-row">
							            <div class="fplayer-branding-preview-controls-left">
								            <!-- Play icon -->
								            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
								            <!-- Volume icon -->
								            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
								            <span class="fplayer-branding-preview-time">1:23 / 4:56</span>
							            </div>
							            <div class="fplayer-branding-preview-controls-right">
								            <!-- Settings icon -->
								            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
								            <!-- Fullscreen icon -->
								            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
							            </div>
						            </div>
					            </div>
				            </div>
			            </div>
		            </div>
	            </div>
            </el-col>
        </el-row>
    </div>
</template>

<style scoped lang="scss">
.color-picker-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    .color-input { width: 180px; }
    :deep(.el-color-picker) { height: 32px; }
    :deep(.el-color-picker__trigger) { width: 32px; height: 32px; padding: 0; border: 1px solid var(--fp-border-light); border-radius: var(--fp-radius-sm); overflow: hidden; }
    :deep(.el-color-picker__color) { border: none; }
    :deep(.el-color-picker__icon) { display: none; }
}

// Control bar preview styles
.fplayer-branding-preview-control-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px 12px 10px;
    border-radius: 0 0 8px 8px;
}

.fplayer-branding-preview-progress-wrapper {
    margin-bottom: 8px;
}

.fplayer-branding-preview-progress-track {
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    overflow: hidden;
}

.fplayer-branding-preview-progress-fill {
    height: 100%;
    border-radius: 2px;
}

.fplayer-branding-preview-controls-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.fplayer-branding-preview-controls-left,
.fplayer-branding-preview-controls-right {
    display: flex;
    align-items: center;
    gap: 10px;
}

.fplayer-branding-preview-time {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.9);
    font-family: monospace;
}
</style>
