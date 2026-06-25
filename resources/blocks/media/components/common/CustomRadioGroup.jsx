const {BaseControl} = wp.components;
const {useRef, useState} = wp.element;
const {__, sprintf} = wp.i18n;

import TooltipPortal from './TooltipPortal.jsx';
import {InfoIconSVG} from './Icons.jsx';
import {hasOptionHelp} from './radioOptionHelp.js';

// One tooltip is open at a time, so a single id links the active trigger to it.
const HELP_TOOLTIP_ID = 'fp-radio-option-help-tooltip';

const CustomRadioGroup = ({
	label,
	options,
	selected,
	onChange,
	help,
	className
}) => {
	const helpRefs = useRef({});
	const [openHelp, setOpenHelp] = useState(null);
	const activeOption = options.find((option) => option.value === openHelp);

	return (
		<div className={`custom-radio-group${className ? ' ' + className : ''}`}>
			{label && (
				<div className="custom-radio-group-header">
					<span className="custom-radio-group-label">{label}</span>
				</div>
			)}
			<div className="custom-radio-options">
				{options.map((option) => {
					const isSelected = selected === option.value;
					const showHelp = hasOptionHelp(option);

					const optionButton = (
						<button
							key={option.value}
							type="button"
							className={`custom-radio-option ${isSelected ? 'is-selected' : ''}`}
							aria-pressed={isSelected}
							onClick={(event) => { event.stopPropagation(); onChange(option.value); }}
						>
							<div className="custom-radio-indicator">
								<div className={`custom-radio-dot ${isSelected ? 'is-selected' : ''}`}></div>
							</div>
							<div className="custom-radio-option-content">
								<span className="custom-radio-option-title">{option.label}</span>
							</div>
						</button>
					);

					if (!showHelp) {
						return optionButton;
					}

					return (
						<div
							className={`custom-radio-option-wrap ${isSelected ? 'is-selected' : ''}`}
							key={option.value}
							onClick={() => onChange(option.value)}
						>
							{optionButton}
							<button
								type="button"
								className="custom-radio-option__help"
								ref={(el) => { helpRefs.current[option.value] = el; }}
								aria-label={sprintf(
									/* translators: %s: radio option label */
									__('More info about %s', 'fluent-player'),
									option.label
								)}
								aria-describedby={openHelp === option.value ? HELP_TOOLTIP_ID : undefined}
								onClick={(event) => {
									// Open state is driven by hover/focus; the click only
									// guards against selecting the option behind the icon.
									event.preventDefault();
									event.stopPropagation();
								}}
								onKeyDown={(event) => {
									// Dismissable on Escape without moving focus (WCAG 1.4.13).
									if (event.key === 'Escape') {
										setOpenHelp(null);
									}
									if (event.key === 'Enter' || event.key === ' ') {
										event.stopPropagation();
									}
								}}
								onMouseEnter={() => setOpenHelp(option.value)}
								onMouseLeave={() => setOpenHelp(null)}
								onFocus={() => setOpenHelp(option.value)}
								onBlur={() => setOpenHelp(null)}
							>
								<InfoIconSVG />
							</button>
						</div>
					);
				})}
			</div>
			<TooltipPortal isOpen={openHelp != null} anchorRef={helpRefs} anchorKey={openHelp} className="custom-radio-option-tooltip" id={HELP_TOOLTIP_ID} role="tooltip">
				{activeOption?.description}
			</TooltipPortal>
			{help && <p className="custom-radio-group-help">{help}</p>}
		</div>
	);
};

export default CustomRadioGroup;
