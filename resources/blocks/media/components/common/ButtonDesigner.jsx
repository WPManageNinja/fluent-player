const { __ } = wp.i18n;
const { useState, useCallback, useRef } = wp.element;
const { Button, TextControl, CheckboxControl } = wp.components;

import ColorPickerInput from './ColorPickerInput.jsx';
import CustomRangeSlider from './CustomRangeSlider.jsx';
import ShortcodeInserter from './ShortcodeInserter.jsx';

const ButtonDesigner = ({ visible, onClose, onInsert }) => {
	const [controls, setControls] = useState({
		button_text: 'Click Here',
		button_url: '',
		backgroundColor: '#0072ff',
		textColor: '#ffffff',
		borderRadius: 5,
		fontSize: 16,
		bold: false,
		italic: false,
		underline: false,
		openInNewTab: true,
	});

	const textInputRef = useRef(null);
	const urlInputRef = useRef(null);

	const updateControl = (key, value) => {
		setControls(prev => ({ ...prev, [key]: value }));
	};

	const generateStyle = useCallback(() => {
		const textDecoration = controls.underline ? 'underline' : 'none';
		const fontWeight = controls.bold ? 'bold' : 'normal';
		const fontStyle = controls.italic ? 'italic' : 'normal';
		return (
			`color:${controls.textColor};` +
			`background-color:${controls.backgroundColor};` +
			`font-size:${controls.fontSize}px;` +
			`border-radius:${controls.borderRadius}px;` +
			`text-decoration:${textDecoration};` +
			`font-weight:${fontWeight};` +
			`font-style:${fontStyle};` +
			`padding:0.8rem 1rem;display:inline-block;`
		);
	}, [controls]);

	const handleInsert = () => {
		if (!controls.button_url || !controls.button_text) {
			return;
		}
		const style = generateStyle();
		const target = controls.openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
		const html = `<a style="${style}" href="${controls.button_url}"${target}>${controls.button_text}</a>`;
		onInsert(html);
		onClose();
	};

	if (!visible) return null;

	return (
		<div className="fp-button-designer-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="fp-button-designer-modal">
				<div className="fp-button-designer-header">
					<h3>{__('Design Your Button', 'fluent-player')}</h3>
					<Button className="fp-button-designer-close" onClick={onClose}>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
							<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
						</svg>
					</Button>
				</div>

				<div className="fp-button-designer-body">
					<div className="fp-button-designer-form">
						<div className="fp-button-designer-row">
							<label className="components-base-control__label">{__('Button Text', 'fluent-player')}</label>
							<div className="fp-input-with-suffix">
								<input
									ref={textInputRef}
									type="text"
									className="fp-input-with-suffix__input"
									value={controls.button_text}
									onChange={(e) => updateControl('button_text', e.target.value)}
								/>
								<ShortcodeInserter
									inputRef={textInputRef}
									onInsert={(value) => updateControl('button_text', value)}
								/>
							</div>
						</div>
						<div className="fp-button-designer-row">
							<label className="components-base-control__label">{__('Button URL', 'fluent-player')}</label>
							<div className="fp-input-with-suffix">
								<input
									ref={urlInputRef}
									type="text"
									className="fp-input-with-suffix__input"
									value={controls.button_url}
									onChange={(e) => updateControl('button_url', e.target.value)}
									placeholder="https://"
								/>
								<ShortcodeInserter
									inputRef={urlInputRef}
									onInsert={(value) => updateControl('button_url', value)}
								/>
							</div>
						</div>
						<div className="fp-button-designer-row">
							<div className="fp-color-section">
								<label className="fp-color-section-label components-base-control__label">
									{__('Button Color', 'fluent-player')}
								</label>
								<div className="fp-color-trigger-list fp-color-trigger-list--side-by-side">
									<ColorPickerInput
										asTrigger
										label={__('Background Color', 'fluent-player')}
										value={controls.backgroundColor}
										defaultValue="#0072ff"
										onChange={(color) => updateControl('backgroundColor', color)}
									/>
									<ColorPickerInput
										asTrigger
										label={__('Text Color', 'fluent-player')}
										value={controls.textColor}
										defaultValue="#ffffff"
										onChange={(color) => updateControl('textColor', color)}
									/>
								</div>
							</div>
						</div>
						<div className="fp-button-designer-row">
							<CustomRangeSlider
								label={__('Border Radius (PX)', 'fluent-player')}
								value={controls.borderRadius}
								onChange={(value) => updateControl('borderRadius', value)}
								min={0}
								max={50}
								unit="px"
							/>
						</div>
						<div className="fp-button-designer-row">
							<CustomRangeSlider
								label={__('Font Size (PX)', 'fluent-player')}
								value={controls.fontSize}
								onChange={(value) => updateControl('fontSize', value)}
								min={8}
								max={40}
								unit="px"
							/>
						</div>
						<div className="fp-button-designer-row">
							<label className="components-base-control__label">{__('Font Style', 'fluent-player')}</label>
							<div className="fp-button-designer-checkboxes">
								<CheckboxControl
									label={__('Bold', 'fluent-player')}
									checked={controls.bold}
									onChange={(value) => updateControl('bold', value)}
								/>
								<CheckboxControl
									label={__('Italic', 'fluent-player')}
									checked={controls.italic}
									onChange={(value) => updateControl('italic', value)}
								/>
								<CheckboxControl
									label={__('Underline', 'fluent-player')}
									checked={controls.underline}
									onChange={(value) => updateControl('underline', value)}
								/>
								<CheckboxControl
									label={__('Open in New Tab', 'fluent-player')}
									checked={controls.openInNewTab}
									onChange={(value) => updateControl('openInNewTab', value)}
								/>
							</div>
						</div>
					</div>

					<div className="fp-button-designer-preview">
						<div className="fp-button-designer-preview-label">
							{__('Button Preview:', 'fluent-player')}
						</div>
						<div className="fp-button-designer-preview-body">
							<a href="#" onClick={(e) => e.preventDefault()} style={(() => {
								const s = {};
								s.color = controls.textColor;
								s.backgroundColor = controls.backgroundColor;
								s.fontSize = `${controls.fontSize}px`;
								s.borderRadius = `${controls.borderRadius}px`;
								s.textDecoration = controls.underline ? 'underline' : 'none';
								s.fontWeight = controls.bold ? 'bold' : 'normal';
								s.fontStyle = controls.italic ? 'italic' : 'normal';
								s.padding = '0.8rem 1rem';
								s.display = 'inline-block';
								return s;
							})()}>
								{controls.button_text || 'Click Here'}
							</a>
						</div>
					</div>
				</div>

				<div className="fp-button-designer-footer">
					<Button className="fp-btn-secondary" onClick={onClose}>
						{__('Cancel', 'fluent-player')}
					</Button>
					<Button className="fp-btn-primary" onClick={handleInsert}>
						{__('Insert', 'fluent-player')}
					</Button>
				</div>
			</div>
		</div>
	);
};

export default ButtonDesigner;
