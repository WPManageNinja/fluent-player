const { useRef, useState } = wp.element;
import { InfoIconSVG, SliderThumbSVG } from './Icons.jsx';
import TooltipPortal from './TooltipPortal.jsx';
import { useSliderDrag } from './useSliderDrag.js';

const CustomRangeSlider = ({
	value,
	min = 0,
	max = 100,
	step = 1,
	onChange,
	label,
	helpText,
	unit = '',
	formatValue,
	parseValue
}) => {
	const [showHelp, setShowHelp] = useState(false);
	const sliderRef = useRef(null);
	const helpIconRef = useRef(null);
	const sliderIdRef = useRef(`slider-${Math.random().toString(36).substr(2, 9)}`);

	const { isDragging, handleMouseDown } = useSliderDrag(sliderRef, {
		min,
		max,
		step,
		onChange
	});

	const range = max - min;
	const sliderPercentage = range === 0 ? 0 : ((Number(value) - min) / range) * 100;

	const displayValue = formatValue ? formatValue(value) : value;
	const tooltipValue = unit ? `${displayValue}${unit}` : String(displayValue ?? '');

	const handleInputChange = (e) => {
		const rawValue = e.target.value;
		const parsed = parseValue ? parseValue(rawValue) : (parseFloat(rawValue) || min);
		const clamped = Math.max(min, Math.min(max, parsed));
		onChange(clamped);
	};

	const handleDecrement = () => {
		const newValue = Math.max(min, value - step);
		onChange(newValue);
	};

	const handleIncrement = () => {
		const newValue = Math.min(max, value + step);
		onChange(newValue);
	};

	return (
		<div className="custom-range-control">
			<div className="custom-range-control-header">
				<label className="custom-range-control-label components-base-control__label">
					{label}
					{helpText && (
						<>
							<span
								ref={helpIconRef}
								className="custom-range-control-info-icon"
								onClick={() => setShowHelp(!showHelp)}
								onMouseEnter={() => setShowHelp(true)}
								onMouseLeave={() => setShowHelp(false)}
							>
								<InfoIconSVG />
							</span>
							<TooltipPortal isOpen={showHelp} anchorRef={helpIconRef}>
								{helpText}
							</TooltipPortal>
						</>
					)}
				</label>
			</div>
			<div className="custom-range-control-content">
				<div
					ref={sliderRef}
					className="custom-range-slider-wrapper"
					style={{ '--slider-value': sliderPercentage }}
					onMouseDown={handleMouseDown}
				>
					{isDragging && (
						<div
							className="custom-range-slider-value-tooltip"
							style={{ left: `${sliderPercentage}%` }}
						>
							{tooltipValue}
						</div>
					)}
					<div
						className={`custom-range-slider-thumb ${isDragging ? 'is-dragging' : ''}`}
						style={{ left: `${sliderPercentage}%` }}
					>
						<SliderThumbSVG id={sliderIdRef.current} />
					</div>
				</div>
				<div className="custom-range-input-wrapper">
					<button
						type="button"
						className="custom-range-input-button"
						onClick={handleDecrement}
					>
						−
					</button>
					<input
						type="number"
						className="custom-range-input"
						min={min}
						max={max}
						step={step}
						value={displayValue}
						onChange={handleInputChange}
					/>
					<button
						type="button"
						className="custom-range-input-button"
						onClick={handleIncrement}
					>
						+
					</button>
				</div>
			</div>
		</div>
	);
};

export default CustomRangeSlider;
