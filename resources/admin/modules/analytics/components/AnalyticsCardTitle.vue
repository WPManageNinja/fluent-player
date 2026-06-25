<template>
    <div class="fplayer-analytics-card-title">
        <h3 class="fplayer-analytics-card-title-text">{{ title }}</h3>
        <el-tooltip
            :content="helpText"
            placement="top"
            effect="dark"
        >
            <button
                type="button"
                class="fplayer-analytics-card-title-help"
                :aria-label="helpText"
            >
                <el-icon>
                    <InfoFilled />
                </el-icon>
            </button>
        </el-tooltip>
    </div>
</template>

<script setup>
import { InfoFilled } from '@element-plus/icons-vue';

defineProps({
    title: {
        type: String,
        required: true
    },
    helpText: {
        type: String,
        required: true
    }
});
</script>
