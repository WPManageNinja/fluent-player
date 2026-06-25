<template>
    <div class="fplayer-admin-page-header">
        <h1>{{ title }}</h1>
        <el-button
            type="primary"
            @click="handleAdd($event)"
            class="fplayer-primary-btn"
        >{{ buttonText }}</el-button>
    </div>
</template>

<script setup>
const props = defineProps({
    title: {
        type: String,
        required: true
    },
    buttonText: {
        type: String,
        required: true
    },
    postType: {
        type: String,
        required: true
    }
});

const handleAdd = (event) => {
    const url = `${window.fluentFrameworkAdmin?.admin_url}post-new.php?post_type=${props.postType}`;
    if (event && (event.metaKey || event.ctrlKey)) {
        window.open(url, '_blank', 'noopener,noreferrer');
    } else {
        window.location.href = url;
    }
};
</script>