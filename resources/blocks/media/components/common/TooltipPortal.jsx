const { useState, useEffect, useRef, useCallback } = wp.element;
const { createPortal } = wp.element;

const PADDING = 12; // min distance from viewport edge

const TooltipPortal = ({ isOpen, anchorRef, anchorKey, children, className, id, role }) => {
    const [rect, setRect] = useState(null);
    const [nudge, setNudge] = useState(0);
    const tooltipRef = useRef(null);

    useEffect(() => {
        const el = anchorRef?.current == null ? null : (anchorKey != null ? anchorRef.current[anchorKey] : anchorRef.current);
        if (isOpen && el && el.getBoundingClientRect) {
            setRect(el.getBoundingClientRect());
        } else {
            setRect(null);
            setNudge(0);
        }
    }, [isOpen, anchorRef, anchorKey]);

    // After the tooltip renders, check if it overflows and nudge it back
    const measuredRef = useCallback((node) => {
        tooltipRef.current = node;
        if (!node) return;

        const tipRect = node.getBoundingClientRect();
        const overflowRight = tipRect.right - (window.innerWidth - PADDING);
        const overflowLeft = PADDING - tipRect.left;

        if (overflowRight > 0) {
            setNudge(-overflowRight);
        } else if (overflowLeft > 0) {
            setNudge(overflowLeft);
        } else {
            setNudge(0);
        }
    }, [rect]);

    if (!isOpen || !rect || typeof createPortal !== 'function') {
        return null;
    }

    const centerX = rect.left + rect.width / 2;

    return createPortal(
        <div
            ref={measuredRef}
            id={id}
            role={role}
            className={`custom-range-control-tooltip custom-range-control-tooltip-portal${className ? ' ' + className : ''}`}
            style={{
                position: 'fixed',
                left: centerX + nudge,
                bottom: window.innerHeight - rect.top + 8,
                transform: 'translateX(-50%)',
                marginBottom: 0,
                '--fp-tooltip-nudge': `${nudge}px`
            }}
        >
            {children}
        </div>,
        document.body
    );
};

export default TooltipPortal;
