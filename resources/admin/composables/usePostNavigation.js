import { unref } from 'vue';

export function usePostNavigation(props) {
    const getEditUrl = (item) => {
        const _item = unref(item);
        const editPostType = unref(props.editPostType);

        return editPostType
            ? `${window.fluentFrameworkAdmin?.admin_url}post.php?post=${_item.ID}&action=edit&post_type=${editPostType}`
            : `${window.fluentFrameworkAdmin.admin_url}post.php?post=${_item.ID}&action=edit`;
    };

    const handleEdit = (item, event) => {
        const editUrl = getEditUrl(item);

        if (event && (event.metaKey || event.ctrlKey)) {
            window.open(editUrl, '_blank');
        } else {
            window.location.href = editUrl;
        }
    };

    const handleView = (item, viewUrlKey) => {
        const _item = unref(item);
        const _viewUrlKey = unref(viewUrlKey);
        
        window.open(
            `${window.fluentFrameworkAdmin?.[_viewUrlKey]}/${_item.post_name}`,
            '_blank'
        );
    };

    return {
        getEditUrl,
        handleEdit,
        handleView
    };
}