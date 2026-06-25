const { __, sprintf } = wp.i18n;
const { useRef, useState } = wp.element;

import { ChevronDownSVG } from './Icons.jsx';
import TooltipPortal from './TooltipPortal.jsx';
import { InfoIconSVG } from './Icons.jsx';

const SettingsSectionCard = ({
	title,
	summary = '',
	icon = null,
	help = '',
	defaultOpen = true,
	isOpen: controlledIsOpen,
	onToggle,
	unmountOnClose = false,
	collapsible = true,
	children,
	className = ''
}) => {
	const [localIsOpen, setLocalIsOpen] = useState(defaultOpen);
	const [showHelp, setShowHelp] = useState(false);
	const sectionId = useRef(`fp-settings-section-${Math.random().toString(36).slice(2, 10)}`).current;
	const helpIconRef = useRef(null);
	const isControlled = typeof controlledIsOpen === 'boolean';
	const isOpen = isControlled ? controlledIsOpen : localIsOpen;
	const toggleSection = () => {
		if (!collapsible) {
			return;
		}

		if (isControlled) {
			onToggle?.();
			return;
		}

		setLocalIsOpen((prev) => !prev);
	};
	const sectionClasses = [
		'fp-settings-section-card',
		collapsible ? (isOpen ? 'is-open' : 'is-collapsed') : 'is-static',
		className
	].filter(Boolean).join(' ');

	const headerProps = collapsible ? {
		onClick: toggleSection,
		onKeyDown: (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				toggleSection();
			}
		},
		role: 'button',
		tabIndex: 0,
		'aria-expanded': isOpen,
		'aria-controls': sectionId
	} : {};

	return (
		<section className={sectionClasses}>
			<div className="fp-settings-section-card__header">
				<div
					className="fp-settings-section-card__toggle"
					{...headerProps}
				>
					<span className="fp-settings-section-card__header-main">
						{icon && (
							<span className="fp-settings-section-card__icon" aria-hidden="true">
								{icon}
							</span>
						)}
						<span className="fp-settings-section-card__heading">
							<span className="fp-settings-section-card__title-row">
								<span className="fp-settings-section-card__title">{title}</span>
								{help && (
									<button
										type="button"
										ref={helpIconRef}
										className="fp-settings-section-card__help"
										aria-label={sprintf(
											/* translators: %s: section title */
											__('Show help for %s', 'fluent-player'),
											title
										)}
										onClick={(event) => {
											event.preventDefault();
											event.stopPropagation();
											setShowHelp((prev) => !prev);
										}}
										onKeyDown={(event) => {
											if (event.key === 'Enter' || event.key === ' ') {
												event.stopPropagation();
											}
										}}
										onMouseEnter={() => setShowHelp(true)}
										onMouseLeave={() => setShowHelp(false)}
										onFocus={() => setShowHelp(true)}
										onBlur={() => setShowHelp(false)}
									>
										<InfoIconSVG />
									</button>
								)}
							</span>
							{summary && (
								<span className="fp-settings-section-card__summary">{summary}</span>
							)}
						</span>
					</span>
				</div>
				{collapsible && (
					<button
						type="button"
						className="fp-settings-section-card__chevron-button"
						onClick={toggleSection}
						aria-expanded={isOpen}
						aria-controls={sectionId}
						aria-label={sprintf(
							/* translators: %s: section title */
							__('Toggle %s section', 'fluent-player'),
							title
						)}
					>
						<span className="fp-settings-section-card__chevron" aria-hidden="true">
							<ChevronDownSVG />
						</span>
					</button>
				)}
			</div>
			{help && (
				<TooltipPortal isOpen={showHelp} anchorRef={helpIconRef}>
					{help}
				</TooltipPortal>
			)}

			<div
				id={sectionId}
				className="fp-settings-section-card__body"
				hidden={collapsible ? !isOpen : undefined}
			>
				{(!collapsible || isOpen || !unmountOnClose) ? children : null}
			</div>
		</section>
	);
};

export default SettingsSectionCard;
