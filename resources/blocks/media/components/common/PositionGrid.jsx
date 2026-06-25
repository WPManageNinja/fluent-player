const { __ } = wp.i18n;

/** 4 positions (overlay/logo): value includes position- prefix */
const POSITION_OPTIONS = [
	{ value: 'position-top-left', label: __('Top Left', 'fluent-player'), dotClass: 'top-left' },
	{ value: 'position-top-right', label: __('Top Right', 'fluent-player'), dotClass: 'top-right' },
	{ value: 'position-bottom-left', label: __('Bottom Left', 'fluent-player'), dotClass: 'bottom-left' },
	{ value: 'position-bottom-right', label: __('Bottom Right', 'fluent-player'), dotClass: 'bottom-right' },
];

/** 9 positions (form layer): raw values, 3x3 grid */
const POSITION_OPTIONS_9 = [
	{ value: 'top-left', label: __('Top Left', 'fluent-player'), dotClass: 'top-left' },
	{ value: 'top-center', label: __('Top Center', 'fluent-player'), dotClass: 'top-center' },
	{ value: 'top-right', label: __('Top Right', 'fluent-player'), dotClass: 'top-right' },
	{ value: 'middle-left', label: __('Middle Left', 'fluent-player'), dotClass: 'middle-left' },
	{ value: 'center', label: __('Center', 'fluent-player'), dotClass: 'center' },
	{ value: 'middle-right', label: __('Middle Right', 'fluent-player'), dotClass: 'middle-right' },
	{ value: 'bottom-left', label: __('Bottom Left', 'fluent-player'), dotClass: 'bottom-left' },
	{ value: 'bottom-center', label: __('Bottom Center', 'fluent-player'), dotClass: 'bottom-center' },
	{ value: 'bottom-right', label: __('Bottom Right', 'fluent-player'), dotClass: 'bottom-right' },
];

/**
 * Position grid selector.
 * variant 4: top-left, top-right, bottom-left, bottom-right (value with position- prefix).
 * variant 9: 3x3 grid with center (value: center, top-left, top-center, etc.).
 */
const PositionGrid = ({ label, value, onChange, variant = 4, noWrapper }) => {
	const isNine = variant === 9;
	const options = isNine ? POSITION_OPTIONS_9 : POSITION_OPTIONS;
	const normalizedValue = isNine
		? (value || 'center')
		: (value && value.startsWith('position-') ? value : value ? `position-${value}` : 'position-top-left');

	const grid = (
		<div className={`fp-position-grid ${isNine ? 'fp-position-grid--nine' : ''}`}>
				{options.map((pos) => {
					const isActive = normalizedValue === pos.value;
					return (
						<button
							key={pos.value}
							type="button"
							className={`fp-position-grid-item ${isActive ? 'active' : ''}`}
							onClick={() => onChange(pos.value)}
							aria-pressed={isActive}
							aria-label={pos.label}
						>
							<div className="pos-preview">
								<span className={`dot ${pos.dotClass}`} />
							</div>
							<span className="pos-label">{pos.label}</span>
						</button>
					);
				})}
		</div>
	);

	if (noWrapper) {
		return grid;
	}
	return (
		<div className="fluent-player-form-row">
			{label && (
				<label className="components-base-control__label">
					{label}
				</label>
			)}
			{grid}
		</div>
	);
};

export default PositionGrid;
export { POSITION_OPTIONS, POSITION_OPTIONS_9 };
