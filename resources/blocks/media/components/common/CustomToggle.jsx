import { resolveToggleAriaLabel } from './toggleA11y.js';

const CustomToggle = ({
	checked,
	onChange,
	label,
	help,
	name,
	ariaLabel,
	switchPosition = 'right',
	justify = 'between',
	gap = '8px',
	clickableLabel = true
}) => {
	const handleLabelClick = () => {
		if (clickableLabel) onChange(!checked);
	};

	const contentStyle = {
		justifyContent: justify === 'between' ? 'space-between' : 'flex-start',
		gap: gap
	};

	const switchElement = (
		<label className="custom-toggle-switch">
			<input
				className="custom-toggle-input"
				name={name}
				type="checkbox"
				checked={checked}
				aria-label={resolveToggleAriaLabel(ariaLabel, label)}
				onChange={(e) => onChange(e.target.checked)}
			/>
			<span className="custom-toggle-slider"></span>
		</label>
	);

	const labelElement = (
		<div className="custom-toggle-control-text">
			<label
				className="custom-toggle-control-label"
				onClick={handleLabelClick}
				style={{ cursor: clickableLabel ? 'pointer' : 'default' }}
			>
				{label}
			</label>
			{help && (
				<p className="custom-toggle-control-help" style={{ cursor: 'default' }}>
					{help}
				</p>
			)}
		</div>
	);

	return (
		<div className="custom-toggle-control">
			<div className="custom-toggle-control-content" style={contentStyle}>
				{switchPosition === 'left' ? (
					<>{switchElement}{labelElement}</>
				) : (
					<>{labelElement}{switchElement}</>
				)}
			</div>
		</div>
	);
};

export default CustomToggle;
