import { ref } from 'vue';

// Seeded from the server-localized snapshot, then kept reactive so actions like
// license activation can refresh notices in place without a page reload.
const initial = Array.isArray(window.fluentFrameworkAdmin?.admin_notices)
    ? [...window.fluentFrameworkAdmin.admin_notices]
    : [];

const notices = ref(initial);

export function useAdminNotices() {
    const setNotices = (list) => {
        notices.value = Array.isArray(list) ? [...list] : [];
    };

    const removeNotice = (id) => {
        notices.value = notices.value.filter((notice) => notice?.id !== id);
    };

    return { notices, setNotices, removeNotice };
}
