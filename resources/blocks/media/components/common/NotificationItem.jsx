const { useState } = wp.element;

const SuccessIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
		<path d="M10 18.3333C5.3975 18.3333 1.66667 14.6025 1.66667 9.99999C1.66667 5.39749 5.3975 1.66666 10 1.66666C14.6025 1.66666 18.3333 5.39749 18.3333 9.99999C18.3333 14.6025 14.6025 18.3333 10 18.3333ZM9.16917 13.3333L15.0608 7.44082L13.8825 6.26249L9.16917 10.9767L6.81167 8.61916L5.63333 9.79749L9.16917 13.3333Z" fill="currentColor"/>
	</svg>
);

const ErrorIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
		<path d="M10 18.3333C5.3975 18.3333 1.66667 14.6025 1.66667 9.99999C1.66667 5.39749 5.3975 1.66666 10 1.66666C14.6025 1.66666 18.3333 5.39749 18.3333 9.99999C18.3333 14.6025 14.6025 18.3333 10 18.3333ZM10 8.82166L7.64333 6.46416L6.46417 7.64332L8.82167 9.99999L6.46417 12.3567L7.64333 13.5358L10 11.1783L12.3567 13.5358L13.5358 12.3567L11.1783 9.99999L13.5358 7.64332L12.3567 6.46416L10 8.82166Z" fill="currentColor"/>
	</svg>
);

const WarningIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
		<path d="M10 18.3333C5.3975 18.3333 1.66667 14.6025 1.66667 9.99999C1.66667 5.39749 5.3975 1.66666 10 1.66666C14.6025 1.66666 18.3333 5.39749 18.3333 9.99999C18.3333 14.6025 14.6025 18.3333 10 18.3333ZM9.16667 12.5V14.1667H10.8333V12.5H9.16667ZM9.16667 5.83332V10.8333H10.8333V5.83332H9.16667Z" fill="currentColor"/>
	</svg>
);

const InfoIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
		<path d="M10 18.3333C5.3975 18.3333 1.66667 14.6025 1.66667 9.99999C1.66667 5.39749 5.3975 1.66666 10 1.66666C14.6025 1.66666 18.3333 5.39749 18.3333 9.99999C18.3333 14.6025 14.6025 18.3333 10 18.3333ZM9.16667 9.16666V14.1667H10.8333V9.16666H9.16667ZM9.16667 5.83332V7.49999H10.8333V5.83332H9.16667Z" fill="currentColor"/>
	</svg>
);

const PrimaryIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
		<path d="M10 18.3333C5.3975 18.3333 1.66667 14.6025 1.66667 9.99999C1.66667 5.39749 5.3975 1.66666 10 1.66666C14.6025 1.66666 18.3333 5.39749 18.3333 9.99999C18.3333 14.6025 14.6025 18.3333 10 18.3333ZM9.16667 9.16666V14.1667H10.8333V9.16666H9.16667ZM9.16667 5.83332V7.49999H10.8333V5.83332H9.16667Z" fill="currentColor"/>
	</svg>
);

const CloseIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
		<path d="M8 7.05733L11.3 3.75733L12.2427 4.7L8.94267 8L12.2427 11.3L11.3 12.2427L8 8.94267L4.7 12.2427L3.75733 11.3L7.05733 8L3.75733 4.7L4.7 3.75733L8 7.05733Z" fill="currentColor"/>
	</svg>
);

const getIcon = (type) => {
	switch (type) {
		case 'success':
			return <SuccessIcon />;
		case 'error':
			return <ErrorIcon />;
		case 'warning':
			return <WarningIcon />;
		case 'info':
			return <InfoIcon />;
		case 'secondary':
			return <InfoIcon />;
		case 'primary':
		default:
			return <PrimaryIcon />;
	}
};

const NotificationItem = ({ id, type, message, progress, onClose }) => {
	const [isExiting, setIsExiting] = useState(false);

	const handleClose = () => {
		setIsExiting(true);
		setTimeout(() => {
			onClose(id);
		}, 200);
	};

	return (
		<div className={`fp-notification-item fp-notification-item--${type} ${isExiting ? 'fp-notification-item--exiting' : ''} ${progress !== undefined ? 'fp-notification-item--with-progress' : ''}`}>
			<div className="fp-notification-icon">
				{getIcon(type)}
			</div>
			<div className="fp-notification-body">
				<div className="fp-notification-message">
					{message}
				</div>
				{progress !== undefined && (
					<div className="fp-notification-progress">
						<div className="fp-notification-progress-bar" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
					</div>
				)}
			</div>
			<button
				className="fp-notification-close"
				onClick={handleClose}
				type="button"
			>
				<CloseIcon />
			</button>
		</div>
	);
};

export default NotificationItem;
