import {ElNotification} from 'element-plus';
import {capitalize} from 'vue';

/**
 * Notification utility class
 * Provides a clean interface for showing notifications in the admin
 */
class Notify {

    static notify(message, type = 'info', options = {}) {
        return ElNotification({
            offset: 40,
            type: type,
            title: type === 'info' ? 'Notification' : capitalize(type),
            message: message,
            position: 'bottom-right',
            ...options
        });
    }


    static success(message, options = {}) {
        return this.notify(message, 'success', options);
    }

    static error(message, options = {}) {
        return this.notify(message, 'error', options);
    }

    static info(message, options = {}) {
        return this.notify(message, 'info', options);
    }
}

export default Notify;
