<template>
    <div class="fplayer-list-table-skeleton" aria-hidden="true">
        <el-skeleton animated>
            <template #template>
                <div class="fplayer-skeleton-row fplayer-skeleton-row--head">
                    <div class="fplayer-skeleton-cell fplayer-skeleton-cell--select">
                        <el-skeleton-item variant="text" class="fplayer-skeleton-checkbox" />
                    </div>
                    <div v-if="col('id')" class="fplayer-skeleton-cell" style="width: 80px;">
                        <el-skeleton-item variant="text" style="width: 28px;" />
                    </div>
                    <div class="fplayer-skeleton-cell" style="flex: 1; min-width: 200px;">
                        <el-skeleton-item variant="text" style="width: 48px;" />
                    </div>
                    <div v-if="col('source')" class="fplayer-skeleton-cell" style="width: 80px;">
                        <el-skeleton-item variant="text" style="width: 48px;" />
                    </div>
                    <div v-if="col('duration')" class="fplayer-skeleton-cell" style="width: 90px;">
                        <el-skeleton-item variant="text" style="width: 56px;" />
                    </div>
                    <div v-if="col('tags')" class="fplayer-skeleton-cell" style="width: 150px;">
                        <el-skeleton-item variant="text" style="width: 36px;" />
                    </div>
                    <div v-if="col('date')" class="fplayer-skeleton-cell" style="width: 130px;">
                        <el-skeleton-item variant="text" style="width: 64px;" />
                    </div>
                    <div v-if="col('status')" class="fplayer-skeleton-cell" :style="{ width: (showSource ? 110 : 130) + 'px' }">
                        <el-skeleton-item variant="text" style="width: 44px;" />
                    </div>
                    <div v-if="col('shortcode')" class="fplayer-skeleton-cell" :style="{ width: (showSource ? 190 : 240) + 'px' }">
                        <el-skeleton-item variant="text" style="width: 72px;" />
                    </div>
                    <div class="fplayer-skeleton-cell fplayer-skeleton-cell--actions" style="width: 124px;">
                        <el-skeleton-item variant="text" style="width: 52px;" />
                    </div>
                </div>

                <div v-for="row in rows" :key="row" class="fplayer-skeleton-row">
                    <div class="fplayer-skeleton-cell fplayer-skeleton-cell--select">
                        <el-skeleton-item variant="text" class="fplayer-skeleton-checkbox" />
                    </div>
                    <div v-if="col('id')" class="fplayer-skeleton-cell" style="width: 80px;">
                        <el-skeleton-item variant="text" style="width: 36px;" />
                    </div>
                    <div class="fplayer-skeleton-cell" style="flex: 1; min-width: 200px;">
                        <el-skeleton-item variant="image" class="fplayer-skeleton-thumb" />
                        <el-skeleton-item variant="text" style="width: 60%;" />
                    </div>
                    <div v-if="col('source')" class="fplayer-skeleton-cell" style="width: 80px;">
                        <el-skeleton-item variant="circle" class="fplayer-skeleton-icon" />
                    </div>
                    <div v-if="col('duration')" class="fplayer-skeleton-cell" style="width: 90px;">
                        <el-skeleton-item variant="text" style="width: 44px;" />
                    </div>
                    <div v-if="col('tags')" class="fplayer-skeleton-cell" style="width: 150px;">
                        <el-skeleton-item variant="text" class="fplayer-skeleton-chip" style="width: 40px;" />
                        <el-skeleton-item variant="text" class="fplayer-skeleton-chip" style="width: 40px;" />
                    </div>
                    <div v-if="col('date')" class="fplayer-skeleton-cell" style="width: 130px;">
                        <el-skeleton-item variant="text" style="width: 84px;" />
                    </div>
                    <div v-if="col('status')" class="fplayer-skeleton-cell" :style="{ width: (showSource ? 110 : 130) + 'px' }">
                        <el-skeleton-item variant="text" class="fplayer-skeleton-pill" style="width: 64px;" />
                    </div>
                    <div v-if="col('shortcode')" class="fplayer-skeleton-cell" :style="{ width: (showSource ? 190 : 240) + 'px' }">
                        <el-skeleton-item variant="text" style="width: 150px;" />
                    </div>
                    <div class="fplayer-skeleton-cell fplayer-skeleton-cell--actions" style="width: 124px;">
                        <el-skeleton-item variant="text" class="fplayer-skeleton-action" />
                        <el-skeleton-item variant="text" class="fplayer-skeleton-action" />
                        <el-skeleton-item variant="text" class="fplayer-skeleton-action" />
                    </div>
                </div>
            </template>
        </el-skeleton>
    </div>
</template>

<script setup>
const props = defineProps({
    rows: {
        type: Number,
        default: 8
    },
    showSource: {
        type: Boolean,
        default: true
    },
    columns: {
        type: Object,
        default: () => ({})
    }
});

const col = (key) => props.columns[key] !== false;
</script>
