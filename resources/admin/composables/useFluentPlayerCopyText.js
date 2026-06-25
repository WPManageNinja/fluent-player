import { onBeforeUnmount } from 'vue';
import Clipboard from 'clipboard';
import Notify from '@/utils/Notify';

// Store clipboard instances to prevent duplication
const clipboardInstances = {};

/**
 * FluentPlayer-specific composable for copy-to-clipboard functionality
 *
 * @param {string} selector - CSS selector for the copy buttons
 * @param {string} message - The notification message (optional)
 * @returns {Object} - The clipboard instance and cleanup function
 */
export function useFluentPlayerCopyText(selector, message = 'Copied to clipboard!') {

    if (!clipboardInstances[selector]) {
        const clipboard = new Clipboard(selector);
        clipboardInstances[selector] = clipboard;

        clipboard.on('success', (e) => {
            Notify.success(message);
            e.clearSelection();
        });
    }

    const clipboard = clipboardInstances[selector];

    const cleanup = () => {
        if (clipboardInstances[selector]) {
            clipboardInstances[selector].destroy();
            delete clipboardInstances[selector];
        }
    };

    onBeforeUnmount(cleanup);

    return {
        clipboard,
        cleanup
    };
}
