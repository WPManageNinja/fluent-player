<script setup>
import { ref, computed } from 'vue';
import ProUpgrade from '@/components/ProUpgrade.vue';
import { FEATURES, useProFeatures } from "@/composables/useFeatures.js";
import { useSettings } from '@/composables/useSettings.js';

const props = defineProps({
    settings: {
        type: Object,
        required: true
    }
});

// Get access to all settings for google_analytics
const { Settings } = useSettings();

// Computed for google analytics settings
const googleAnalyticsSettings = computed(() => Settings.settings?.google_analytics || {});

// Tab state
const activeTab = ref('fluent_player');

// Pro features integration
const { isProActive, getFeatureConfig } = useProFeatures();
const analyticsProConfig = getFeatureConfig(FEATURES.ANALYTICS);
</script>

<template>
    <div class="fplayer-settings-section fplayer-analytics-settings-page">
        <pro-upgrade v-if="!isProActive" v-bind="analyticsProConfig" />
        <template v-else>
            <!-- Custom Pill Navigation -->
            <div class="fplayer-header-filters">
                <div class="fplayer-header-filters-tabs">
                    <button
                        class="fplayer-header-filters-tab"
                        :class="{ 'fplayer-header-filters-tab-active' : activeTab === 'fluent_player' }"
                        @click="activeTab = 'fluent_player'"
                    >
                        FluentPlayer Analytics
                    </button>
                    <button
                        class="fplayer-header-filters-tab"
                        :class="{ 'fplayer-header-filters-tab-active' : activeTab === 'google_analytics' }"
                        @click="activeTab = 'google_analytics'"
                    >
                        Google Analytics
                    </button>
                </div>
            </div>
            
            <!-- Fluent Player Analytics -->
            <div v-if="activeTab === 'fluent_player'" class="fplayer-form-item-group">
                 <!-- Enable Analytics -->
	            <div class="fplayer-form-item">
		            <el-switch class="fplayer-switch" v-model="settings.enabled" aria-label="Enable Analytics" />
		            <div class="fplayer-form-label-wrapper">
			            <label class="fplayer-form-label">Enable Analytics</label>
			            <p class="fplayer-form-help">Track media plays and engagement metrics natively</p>
		            </div>
	            </div>

                <!-- Sub settings if enabled -->
                 <div v-if="settings.enabled" class="fplayer-form-sub-items">
	                 <!-- Auto Cleanup -->
	                 <div class="fplayer-form-item">
		                 <el-switch class="fplayer-switch" v-model="settings.auto_cleanup.enabled" aria-label="Auto Cleanup Analytics Data" />
		                 <div class="fplayer-form-label-wrapper">
			                 <label class="fplayer-form-label">Auto Cleanup Analytics Data</label>
			                 <p class="fplayer-form-help">Automatically delete old analytics records to keep your database optimized</p>
		                 </div>
	                 </div>

	                 <div v-if="settings.auto_cleanup?.enabled" class="fplayer-form-group">
		                 <el-input
			                 v-model.number="settings.auto_cleanup.days"
			                 type="number"
			                 :min="1"
			                 :max="730"
			                 class="setting-input-days"
			                 aria-label="Auto cleanup — days to keep analytics data"
		                 />
		                 <p class="fplayer-form-group-help-text">
			                 Analytics data older than <strong>{{ settings.auto_cleanup.days }} days</strong> will be deleted automatically.
		                 </p>
	                 </div>
                 </div>
            </div>

            <!-- Google Analytics -->
            <div v-if="activeTab === 'google_analytics'" class="fplayer-form-item-group">
                <!-- Enable GA -->
	            <div class="fplayer-form-item">
		            <el-switch class="fplayer-switch" v-model="googleAnalyticsSettings.enabled" aria-label="Enable Google Analytics" />
		            <div class="fplayer-form-label-wrapper">
			            <label class="fplayer-form-label">Enable Google Analytics</label>
			            <p class="fplayer-form-help">Send media playback events to Google Analytics</p>
		            </div>
	            </div>

	            <div v-if="googleAnalyticsSettings.enabled" class="fplayer-form-sub-items">
		            <div class="fplayer-form-item">
			            <el-switch class="fplayer-switch" v-model="googleAnalyticsSettings.use_existing_tag" aria-label="Use existing on-page tag" />
			            <div class="fplayer-form-label-wrapper">
				            <label class="fplayer-form-label">Use existing on-page tag</label>
				            <p class="fplayer-form-help">Use an existing Google Analytics tag on your page instead of loading a new one.</p>
			            </div>
		            </div>
		            <div class="fplayer-form-group" v-if="!googleAnalyticsSettings.use_existing_tag">
			            <label class="fplayer-form-group-label">Measurement ID</label>
			            <el-input
				            v-model="googleAnalyticsSettings.measurement_id"
				            placeholder="G-XXXXXXXXXX"
				            class="setting-input"
				            aria-label="Google Analytics Measurement ID"
			            />
			            <p class="fplayer-form-group-help-text">Your Google Analytics 4 Measurement ID (starts with G-). Required when not using an existing tag.</p>
		            </div>
	            </div>
            </div>
        </template>
    </div>
</template>
