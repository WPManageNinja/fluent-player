<template>
    <div class="fplayer-admin-page-header">
        <h1>{{ title }}</h1>
        <el-tooltip
            :content="$t('Keyboard shortcut: %s', shortcutKeys)"
            placement="bottom"
            effect="dark"
            :show-after="400"
        >
            <el-button
                type="primary"
                @click="handleAdd($event)"
                class="fplayer-primary-btn"
                :aria-keyshortcuts="ariaKeyshortcuts"
            >
                {{ buttonText }}
            </el-button>
        </el-tooltip>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

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

const isMac = typeof navigator !== 'undefined'
    && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');
const shortcutKeys = ref(isMac ? '⌃⌥N' : 'Shift+Alt+N');
const ariaKeyshortcuts = isMac ? 'Control+Alt+N' : 'Shift+Alt+N';

const handleAdd = (event) => {
    const url = `${window.fluentFrameworkAdmin?.admin_url}post-new.php?post_type=${props.postType}`;
    if (event && (event.metaKey || event.ctrlKey)) {
        window.open(url, '_blank', 'noopener,noreferrer');
    } else {
        window.location.href = url;
    }
};

// ⌃⌥N (Mac) / Shift+Alt+N (Windows) → add new: the HTML access-key modifiers, which
// browsers leave to the page (Arc/Dia swallow ⌥⌘N). event.code is layout-independent,
// so Option+N dead-key composition on macOS can't break the match.
const matchesShortcut = (event) => event.code === 'KeyN' && !event.metaKey && (isMac
    ? (event.ctrlKey && event.altKey && !event.shiftKey)
    : (event.shiftKey && event.altKey && !event.ctrlKey));

const handleShortcut = (event) => {
    if (matchesShortcut(event)) {
        event.preventDefault();
        window.location.href = `${window.fluentFrameworkAdmin?.admin_url}post-new.php?post_type=${props.postType}`;
    }
};

onMounted(() => document.addEventListener('keydown', handleShortcut));
onBeforeUnmount(() => document.removeEventListener('keydown', handleShortcut));
</script>
