<template>
    <div class="fplayer-list-table-skeleton" aria-hidden="true">
        <el-skeleton animated>
            <template #template>
                <div class="fplayer-skeleton-row fplayer-skeleton-row--head">
                    <div class="fplayer-skeleton-cell" style="width: 96px;">
                        <el-skeleton-item variant="text" style="width: 28px;" />
                    </div>
                    <div class="fplayer-skeleton-cell" style="flex: 1; min-width: 160px;">
                        <el-skeleton-item variant="text" style="width: 48px;" />
                    </div>
                    <div v-if="showSource" class="fplayer-skeleton-cell" style="width: 130px;">
                        <el-skeleton-item variant="text" style="width: 52px;" />
                    </div>
                    <div v-if="showSource" class="fplayer-skeleton-cell" style="width: 90px;">
                        <el-skeleton-item variant="text" style="width: 56px;" />
                    </div>
                    <div v-if="showTags" class="fplayer-skeleton-cell" style="width: 150px;">
                        <el-skeleton-item variant="text" style="width: 36px;" />
                    </div>
                    <div class="fplayer-skeleton-cell" style="width: 130px;">
                        <el-skeleton-item variant="text" style="width: 64px;" />
                    </div>
                    <div class="fplayer-skeleton-cell" :style="{ width: (showSource ? 110 : 130) + 'px' }">
                        <el-skeleton-item variant="text" style="width: 44px;" />
                    </div>
                    <div class="fplayer-skeleton-cell" :style="{ width: (showSource ? 190 : 240) + 'px' }">
                        <el-skeleton-item variant="text" style="width: 72px;" />
                    </div>
                    <div class="fplayer-skeleton-cell fplayer-skeleton-cell--end" style="width: 50px;">
                        <el-skeleton-item variant="text" style="width: 16px;" />
                    </div>
                </div>

                <div v-for="row in rows" :key="row" class="fplayer-skeleton-row">
                    <div class="fplayer-skeleton-cell" style="width: 96px;">
                        <el-skeleton-item variant="text" style="width: 36px;" />
                    </div>
                    <div class="fplayer-skeleton-cell" style="flex: 1; min-width: 160px;">
                        <el-skeleton-item variant="text" style="width: 70%;" />
                    </div>
                    <div v-if="showSource" class="fplayer-skeleton-cell" style="width: 130px;">
                        <el-skeleton-item variant="circle" class="fplayer-skeleton-icon" />
                        <el-skeleton-item variant="text" style="width: 56px;" />
                    </div>
                    <div v-if="showSource" class="fplayer-skeleton-cell" style="width: 90px;">
                        <el-skeleton-item variant="text" style="width: 44px;" />
                    </div>
                    <div v-if="showTags" class="fplayer-skeleton-cell" style="width: 150px;">
                        <el-skeleton-item variant="text" class="fplayer-skeleton-chip" style="width: 40px;" />
                        <el-skeleton-item variant="text" class="fplayer-skeleton-chip" style="width: 40px;" />
                    </div>
                    <div class="fplayer-skeleton-cell" style="width: 130px;">
                        <el-skeleton-item variant="text" style="width: 84px;" />
                    </div>
                    <div class="fplayer-skeleton-cell" :style="{ width: (showSource ? 110 : 130) + 'px' }">
                        <el-skeleton-item variant="text" class="fplayer-skeleton-pill" style="width: 64px;" />
                    </div>
                    <div class="fplayer-skeleton-cell" :style="{ width: (showSource ? 190 : 240) + 'px' }">
                        <el-skeleton-item variant="text" style="width: 150px;" />
                    </div>
                    <div class="fplayer-skeleton-cell fplayer-skeleton-cell--end" style="width: 50px;">
                        <el-skeleton-item variant="text" style="width: 16px;" />
                    </div>
                </div>
            </template>
        </el-skeleton>
    </div>
</template>

<script setup>
defineProps({
    rows: {
        type: Number,
        default: 8
    },
    showSource: {
        type: Boolean,
        default: true
    },
    showTags: {
        type: Boolean,
        default: true
    }
});
</script>
