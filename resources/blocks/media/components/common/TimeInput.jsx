const { __ } = wp.i18n;
const { BaseControl } = wp.components;

const TimeInput = ({
	hours = 0,
	minutes = 0,
	seconds = 0,
	onChange,
	label = __('Start Time', 'fluent-player'),
	maxHours,
	maxMinutes = 59,
	maxSeconds = 59,
}) => {
	const handleChange = (field, value) => {
		onChange(field, parseInt(value) || 0);
	};

	return (
		<BaseControl label={label}>
			<div className="layer-start-time-container">
				<div className="layer-start-time-input-wrapper">
					<input
						type="number"
						value={hours}
						onChange={(e) => handleChange('hours', e.target.value)}
						min={0}
						max={maxHours}
						className="components-text-control__input"
					/>
					<label className="time-input-label">{__('Hours', 'fluent-player')}</label>
				</div>
				<div className="layer-start-time-input-wrapper">
					<input
						type="number"
						value={minutes}
						onChange={(e) => handleChange('minutes', e.target.value)}
						min={0}
						max={maxMinutes}
						className="components-text-control__input"
					/>
					<label className="time-input-label">{__('Minutes', 'fluent-player')}</label>
				</div>
				<div className="layer-start-time-input-wrapper">
					<input
						type="number"
						value={seconds}
						onChange={(e) => handleChange('seconds', e.target.value)}
						min={0}
						max={maxSeconds}
						className="components-text-control__input"
					/>
					<label className="time-input-label">{__('Seconds', 'fluent-player')}</label>
				</div>
			</div>
		</BaseControl>
	);
};

export default TimeInput;
