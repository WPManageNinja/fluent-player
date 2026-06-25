const { useState, useRef } = wp.element;
const { useSelect } = wp.data;
const { BaseControl, ColorPalette, Popover } = wp.components;

const ColorPickerInput = ({
	value,
	defaultValue = '#FFFFFFB3',
	onChange,
	label,
	enableAlpha = true,
	clearable = true,
	asTrigger = false,
	help
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const triggerRef = useRef(null);

	const colors = useSelect((select) => {
		try {
			const settings = select('core/block-editor')?.getSettings?.();
			const palette = settings?.colors;
			return Array.isArray(palette) ? palette : [];
		} catch (e) {
			return [];
		}
	}, []);

	// Only use defaultValue when value was never set (undefined/null). Preserve '' so clear removes color.
	const currentValue = (value === undefined || value === null) ? defaultValue : value;
	const hasValue = currentValue && currentValue !== '';

	const handleChange = (val) => {
		onChange(val === undefined || val === null ? '' : val);
	};

	if (asTrigger) {
		return (
			<>
				<button
					ref={triggerRef}
					type="button"
					className="fp-color-trigger"
					onClick={() => setIsOpen(true)}
					aria-expanded={isOpen}
					aria-haspopup="true"
				>
					<span
						className={`fp-color-trigger-swatch ${!hasValue ? 'is-empty' : ''}`}
						style={hasValue ? { backgroundColor: currentValue } : undefined}
					/>
					<span className="fp-color-trigger-label">{label}</span>
				</button>
				{isOpen && (
					<Popover
						anchor={triggerRef.current}
						onClose={() => setIsOpen(false)}
						onFocusOutside={() => setIsOpen(false)}
						position="middle left"
						className="fp-color-picker-popover"
					>
						<div className="fp-color-picker-popover-content">
							<ColorPalette
								colors={colors}
								value={currentValue}
								onChange={handleChange}
								clearable={clearable}
								enableAlpha={enableAlpha}
								disableCustomColors={false}
							/>
						</div>
					</Popover>
				)}
			</>
		);
	}

	return (
		<BaseControl label={label} help={help}>
			<ColorPalette
				colors={colors}
				value={currentValue}
				onChange={handleChange}
				clearable={clearable}
				enableAlpha={enableAlpha}
				disableCustomColors={false}
			/>
		</BaseControl>
	);
};

export default ColorPickerInput;
