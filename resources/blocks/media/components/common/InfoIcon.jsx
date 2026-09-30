const {__} = wp.i18n;
const {useState, useRef} = wp.element;
import TooltipPortal from './TooltipPortal.jsx';
import {InfoIconSVG} from './Icons.jsx';

/**
 * Accessible help affordance. Keyboard-operable (Enter/Space toggles, Escape closes)
 * and opens on focus so screen-reader users reach the tooltip the same way mouse
 * users do — the prior bare <span> was unreachable without a pointer.
 */
const InfoIcon = ({tooltip, label, className = ''}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const tipId = useRef(`fp-info-tip-${Math.random().toString(36).slice(2, 10)}`).current;

    const close = () => setOpen(false);
    const toggle = () => setOpen((prev) => !prev);

    return (
        <>
            <span
                ref={ref}
                role="button"
                tabIndex={0}
                className={`custom-range-control-info-icon${className ? ' ' + className : ''}`}
                aria-label={label || __('More information', 'fluent-player')}
                aria-expanded={open}
                aria-describedby={open ? tipId : undefined}
                onClick={toggle}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggle();
                    } else if (e.key === 'Escape') {
                        close();
                    }
                }}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={close}
                onFocus={() => setOpen(true)}
                onBlur={close}
            >
                <InfoIconSVG />
            </span>
            <TooltipPortal isOpen={open} anchorRef={ref} id={tipId} role="tooltip">
                {tooltip}
            </TooltipPortal>
        </>
    );
};

export default InfoIcon;
