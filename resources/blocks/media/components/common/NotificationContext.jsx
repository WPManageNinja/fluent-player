const { createContext, useState, useCallback } = wp.element;

export const NotificationContext = createContext(null);

let notificationId = 0;

export const NotificationProvider = ({ children }) => {
	const [notifications, setNotifications] = useState([]);

	const removeNotification = useCallback((id) => {
		setNotifications(prev => prev.filter(n => n.id !== id));
	}, []);

	const addNotification = useCallback(({
		type = 'info',
		message,
		duration = 3000,
		position = 'bottom-right',
		progress
	}) => {
		const id = ++notificationId;
		setNotifications(prev => [...prev, {
			id,
			type,
			message,
			duration,
			position,
			progress
		}]);
		if (duration > 0) {
			setTimeout(() => removeNotification(id), duration);
		}
		return id;
	}, [removeNotification]);

	const updateNotification = useCallback((id, payload) => {
		setNotifications(prev => prev.map(n => n.id === id ? { ...n, ...payload } : n));
	}, []);

	return (
		<NotificationContext.Provider value={{ notifications, addNotification, updateNotification, removeNotification }}>
			{children}
		</NotificationContext.Provider>
	);
};

export default NotificationContext;
