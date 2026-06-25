<script setup>
import { ElAlert } from 'element-plus';
import { useAdminNotices } from '@/composables/useAdminNotices';

const { notices } = useAdminNotices();

const alertType = (notice) => {
    const t = String(notice?.type || 'warning');
    return ['success', 'warning', 'info', 'error'].includes(t) ? t : 'warning';
};
</script>

<template>
    <div v-if="notices.length" class="fplayer-admin-notices">
        <el-alert
            v-for="(notice, i) in notices"
            :key="notice.id || i"
            class="fplayer-admin-notice"
            :type="alertType(notice)"
            :closable="false"
            show-icon
        >
            <template #default>
                <span v-html="notice.html" />
            </template>
        </el-alert>
    </div>
</template>
