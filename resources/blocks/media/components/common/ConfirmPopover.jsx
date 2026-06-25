const { Popover, Button } = wp.components;
const { __ } = wp.i18n;

const ConfirmPopover = ({
	isOpen,
	onConfirm,
	onCancel,
	title = __('Confirm', 'fluent-player'),
	message = __('Are you sure?', 'fluent-player'),
	confirmText = __('Delete', 'fluent-player'),
	cancelText = __('Cancel', 'fluent-player'),
	anchor,
	placement = 'left-start',
}) => {
	if (!isOpen) return null;

	return (
		<Popover
			anchor={anchor}
			placement={placement}
			onClose={onCancel}
			className="fp-confirm-popover"
			flip={true}
			shift={true}
			resize={false}
		>
			<div className="fp-confirm-popover-content">
				<div className="fp-confirm-popover-header">
					<span className="fp-confirm-popover-title">{title}</span>
				</div>
				<div className="fp-confirm-popover-body">
					<p>{message}</p>
				</div>
				<div className="fp-confirm-popover-footer">
					<Button
						variant="secondary"
						onClick={onCancel}
						className="fp-confirm-cancel-btn"
					>
						{cancelText}
					</Button>
					<Button
						variant="primary"
						onClick={onConfirm}
						className="fp-confirm-delete-btn"
					>
						{confirmText}
					</Button>
				</div>
			</div>
		</Popover>
	);
};

export default ConfirmPopover;
