const { __ } = wp.i18n;
const { useState, useRef } = wp.element;

import { InfoIconSVG } from './Icons.jsx';
import TooltipPortal from './TooltipPortal.jsx';

const CRMInactiveWarning = ({ hasOtherProviders = false }) => {
	const iconRef = useRef(null);
	const [showTooltip, setShowTooltip] = useState(false);
	const installUrl = window.fluentPlayerBlockVars?.fluentcrm_install_url;
	const message = hasOtherProviders
		? __('FluentCRM is not installed/active. FluentCRM provider will not collect emails.', 'fluent-player')
		: __('FluentCRM is not installed/active. This email capture will not be working.', 'fluent-player');

	return (
		<span className="provider-crm-warning">
			<span
				ref={iconRef}
				className="custom-range-control-info-icon warning-icon"
				tabIndex={0}
				role="button"
				aria-label={message}
				onMouseEnter={() => setShowTooltip(true)}
				onMouseLeave={() => setShowTooltip(false)}
				onFocus={() => setShowTooltip(true)}
				onBlur={() => setShowTooltip(false)}
				onKeyDown={(e) => { if (e.key === 'Escape') setShowTooltip(false); }}
			>
				<InfoIconSVG />
			</span>
			<TooltipPortal isOpen={showTooltip} anchorRef={iconRef}>
				{message}
			</TooltipPortal>
			{installUrl && (
				<a
					href={installUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="provider-crm-install-btn"
					onClick={(e) => e.stopPropagation()}
				>
					{__('Install/Activate', 'fluent-player')}
				</a>
			)}
		</span>
	);
};

export default CRMInactiveWarning;
