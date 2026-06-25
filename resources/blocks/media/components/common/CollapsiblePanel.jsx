const { useRef, useState } = wp.element;

const ChevronIcon = ({ isOpen }) => (
	<svg
		width="20"
		height="20"
		viewBox="0 0 20 20"
		fill="none"
		style={{
			transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
			transition: 'transform 0.2s ease'
		}}
	>
		<path
			d="M5 7.5L10 12.5L15 7.5"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

const CollapsiblePanel = ({
	title,
	summary = '',
	children,
	defaultOpen = true,
	isOpen: controlledIsOpen,
	onToggle,
	unmountOnClose = false,
}) => {
	const [localIsOpen, setLocalIsOpen] = useState(defaultOpen);
	const panelId = useRef(`preset-panel-${Math.random().toString(36).slice(2, 10)}`).current;
	const isControlled = typeof controlledIsOpen === 'boolean';
	const isOpen = isControlled ? controlledIsOpen : localIsOpen;

	const togglePanel = () => {
		if (isControlled) {
			onToggle?.();
			return;
		}

		setLocalIsOpen((prev) => !prev);
	};

	return (
		<div className="preset-collapsible-panel">
			<button
				type="button"
				className={`panel-header ${isOpen ? 'is-open' : ''}`}
				onClick={togglePanel}
				aria-expanded={isOpen}
				aria-controls={panelId}
			>
				<span className="panel-title-group">
					<span className="panel-title">{title}</span>
					{summary && (
						<span className="panel-summary">{summary}</span>
					)}
				</span>
				<span className="panel-chevron">
					<ChevronIcon isOpen={isOpen} />
				</span>
			</button>
			<div className="panel-divider" hidden={!isOpen}></div>
			<div id={panelId} className="panel-content" hidden={!isOpen}>
				{(isOpen || !unmountOnClose) ? children : null}
			</div>
		</div>
	);
};

export default CollapsiblePanel;
