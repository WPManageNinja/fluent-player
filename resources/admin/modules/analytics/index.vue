<template>
  <div class="fplayer-admin-page fplayer-admin-page-analytics">
    <pro-upgrade v-if="!isProActive" v-bind="analyticsProConfig" />
    <router-view v-else></router-view>
  </div>
</template>

<script setup>
import ProUpgrade from '@/components/ProUpgrade.vue';
import { FEATURES, useProFeatures } from '@/composables/useFeatures.js';

const { isProActive, getFeatureConfig } = useProFeatures();
const analyticsProConfig = getFeatureConfig(FEATURES.ANALYTICS);
</script>