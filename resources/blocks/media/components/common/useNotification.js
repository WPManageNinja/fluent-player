const { useContext, useCallback } = wp.element;
import { NotificationContext } from './NotificationContext.jsx';

const noopReturn = {
	showNotification: () => {},
	updateNotification: () => {},
	hideNotification: () => {}
};

export const useNotification = () => {
	const context = useContext(NotificationContext);

	const showNotification = useCallback(({
		type = 'info',
		message,
		duration = 5000,
		position = 'bottom-right',
		progress
	}) => {
		return context?.addNotification({ type, message, duration, position, progress });
	}, [context?.addNotification]);

	const updateNotificationById = useCallback((id, payload) => {
		context?.updateNotification(id, payload);
	}, [context?.updateNotification]);

	const hideNotification = useCallback((id) => {
		context?.removeNotification(id);
	}, [context?.removeNotification]);

	if (!context) {
		return noopReturn;
	}

	return {
		showNotification,
		updateNotification: updateNotificationById,
		hideNotification
	};
};

export default useNotification;
