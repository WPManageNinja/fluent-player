const { useState, useEffect, useCallback, useRef } = wp.element;

const secondsToMMSS = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const TimeRangeSlider = ({ min = 0, max = 300, startValue, endValue, onStartChange, onEndChange }) => {
    const trackRef = useRef(null);
    const [dragging, setDragging] = useState(null); // 'start' | 'end' | null

    const baseSafeMax = Math.max(max, 1);
    const safeMax = baseSafeMax > min ? baseSafeMax : min + 1;
    const startPercent = ((startValue - min) / (safeMax - min)) * 100;
    const endPercent = ((endValue - min) / (safeMax - min)) * 100;

    const calculateValue = useCallback((clientX) => {
        if (!trackRef.current) return null;
        const rect = trackRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return Math.min(Math.round(min + pct * (safeMax - min)), Math.floor(safeMax));
    }, [min, safeMax]);

    const handleMouseDown = useCallback((thumb) => (e) => {
        e.preventDefault();
        setDragging(thumb);
    }, []);

    const handleTrackClick = useCallback((e) => {
        if (dragging) return;
        const val = calculateValue(e.clientX);
        if (val === null) return;
        // Move whichever thumb is closer
        const distToStart = Math.abs(val - startValue);
        const distToEnd = Math.abs(val - endValue);
        if (distToStart <= distToEnd) {
            onStartChange(Math.min(val, endValue));
        } else {
            onEndChange(Math.max(val, startValue));
        }
    }, [calculateValue, startValue, endValue, onStartChange, onEndChange, dragging]);

    useEffect(() => {
        if (!dragging) return;

        const handleMouseMove = (e) => {
            e.preventDefault();
            const val = calculateValue(e.clientX);
            if (val === null) return;
            if (dragging === 'start') {
                onStartChange(Math.min(val, endValue));
            } else {
                onEndChange(Math.max(val, startValue));
            }
        };

        const handleMouseUp = () => setDragging(null);

        document.addEventListener('mousemove', handleMouseMove, { passive: false });
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, calculateValue, startValue, endValue, onStartChange, onEndChange]);

    return (
        <div className="fp-tc-range-slider">
            <div className="fp-tc-range-slider-labels">
                <span>{secondsToMMSS(min)}</span>
                <span>{secondsToMMSS(safeMax)}</span>
            </div>
            <div className="fp-tc-range-track" ref={trackRef} onMouseDown={handleTrackClick}>
                <div
                    className="fp-tc-range-fill"
                    style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
                />
                <div
                    className={`fp-tc-range-thumb${dragging === 'start' ? ' is-dragging' : ''}`}
                    style={{ left: `${startPercent}%` }}
                    onMouseDown={handleMouseDown('start')}
                />
                <div
                    className={`fp-tc-range-thumb${dragging === 'end' ? ' is-dragging' : ''}`}
                    style={{ left: `${endPercent}%` }}
                    onMouseDown={handleMouseDown('end')}
                />
            </div>
        </div>
    );
};

export { secondsToMMSS };
export default TimeRangeSlider;
