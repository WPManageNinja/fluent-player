const { useState, useEffect, useCallback } = wp.element;

export const useSliderDrag = (sliderRef, { min, max, step = 1, onChange }) => {
	const [isDragging, setIsDragging] = useState(false);

	const calculateValue = useCallback((clientX) => {
		if (!sliderRef.current) return null;
		
		const rect = sliderRef.current.getBoundingClientRect();
		const x = clientX - rect.left;
		const percentage = Math.max(0, Math.min(1, x / rect.width));
		const rawValue = min + percentage * (max - min);
		const steppedValue = Math.round(rawValue / step) * step;
		return Math.max(min, Math.min(max, steppedValue));
	}, [min, max, step]);

	const handleMouseDown = useCallback((e) => {
		e.preventDefault();
		if (!sliderRef.current) return;

		const isSliderWrapper = e.target === sliderRef.current || 
			e.target.closest('.custom-range-slider-wrapper') === sliderRef.current;
		const isThumb = e.target.closest('.custom-range-slider-thumb');

		if (isSliderWrapper) {
			const value = calculateValue(e.clientX);
			if (value !== null) {
				onChange(value);
			}
			setIsDragging(true);
		} else if (isThumb) {
			setIsDragging(true);
		}
	}, [calculateValue, onChange]);

	useEffect(() => {
		if (!isDragging) return;

		const handleMouseMove = (e) => {
			e.preventDefault();
			const value = calculateValue(e.clientX);
			if (value !== null) {
				onChange(value);
			}
		};

		const handleMouseUp = () => {
			setIsDragging(false);
		};

		// Attach to the slider's OWN document: in a builder panel (Divi's iframe) it lives in a
		// different document than the bundle's global `document`, so global listeners only fired
		// once the cursor left the control — dragging appeared to work only outside it.
		const doc = (sliderRef.current && sliderRef.current.ownerDocument) || document;
		doc.addEventListener('mousemove', handleMouseMove, { passive: false });
		doc.addEventListener('mouseup', handleMouseUp);

		return () => {
			doc.removeEventListener('mousemove', handleMouseMove);
			doc.removeEventListener('mouseup', handleMouseUp);
		};
	}, [isDragging, calculateValue, onChange]);

	return { isDragging, handleMouseDown };
};

export default useSliderDrag;
