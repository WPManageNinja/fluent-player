const { useContext } = wp.element;
const { createPortal } = wp.element;
import { NotificationContext } from './NotificationContext.jsx';
import NotificationItem from './NotificationItem.jsx';

const POSITIONS = [
	'top-left',
	'top-middle',
	'top-right',
	'bottom-left',
	'bottom-middle',
	'bottom-right'
];

const NotificationContainer = () => {
	const context = useContext(NotificationContext);

	if (!context) {
		return null;
	}

	const { notifications, removeNotification } = context;
	if (notifications.length === 0) {
		return null;
	}

	const groupedNotifications = POSITIONS.reduce((acc, position) => {
		acc[position] = notifications.filter(n => n.position === position);
		return acc;
	}, {});

	return createPortal(
		<div className="fp-notification-root">
			{POSITIONS.map(position => {
				const positionNotifications = groupedNotifications[position];
				if (positionNotifications.length === 0) return null;

				return (
					<div
						key={position}
						className={`fp-notification-container fp-notification-container--${position}`}
					>
						{positionNotifications.map(notification => (
							<NotificationItem
								key={notification.id}
								id={notification.id}
								type={notification.type}
								message={notification.message}
								progress={notification.progress}
								onClose={removeNotification}
							/>
						))}
					</div>
				);
			})}
		</div>,
		document.body
	);
};

export default NotificationContainer;
