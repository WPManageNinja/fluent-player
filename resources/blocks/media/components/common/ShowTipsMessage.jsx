const { __ } = wp.i18n;

const ShowTipsMessage = ({ title, description, badgeText = __('Beta', 'fluent-player'), className = '' }) => {
	const classes = ['fluent-player-tips-message', className].filter(Boolean).join(' ');

	return (
		<div className={classes}>
			<div className="fluent-player-tips-message__title">
				<strong>{title}</strong>
				{badgeText ? (
					<span className="fluent-player-tips-message__badge">{badgeText}</span>
				) : null}
			</div>
			<p className="fluent-player-tips-message__description">{description}</p>
		</div>
	);
};

export default ShowTipsMessage;
