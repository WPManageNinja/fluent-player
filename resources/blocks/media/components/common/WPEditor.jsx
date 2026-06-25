const { useEffect, useRef, useState, createPortal } = wp.element;

import ButtonDesigner from './ButtonDesigner.jsx';
import ShortcodeInserter from './ShortcodeInserter.jsx';

const WPEditor = ({ id, value, onChange, height = 250 }) => {
	const editorId = useRef(id || `wp_editor_${Date.now()}_${Math.floor(Math.random() * 1000)}`).current;
	const hasWpEditor = !!window.wp?.editor;
	const [plainContent, setPlainContent] = useState(value || '');
	const [showButtonDesigner, setShowButtonDesigner] = useState(false);
	const editorInstanceRef = useRef(null);
	const shortcodePortalRef = useRef(null);
	const [portalReady, setPortalReady] = useState(false);

	const sanitizeContent = (input) => {
		if (!input) return '';
		let sanitized = input.replace(/\s+(on\w+)\s*=\s*("[^"]*"|'[^']*'|[^"'\s>]+)/gi, '');
		sanitized = sanitized.replace(/\s+http-equiv\s*=\s*("[^"]*"|'[^']*'|[^"'\s>]+)/gi, '');
		return sanitized;
	};

	const handleInsertButtonHtml = (html) => {
		if (editorInstanceRef.current) {
			editorInstanceRef.current.insertContent(sanitizeContent(html));
		}
	};

	const insertAtEditor = (text) => {
		const isVisualActive = jQuery('#wp-' + editorId + '-wrap').hasClass('tmce-active');
		if (isVisualActive && editorInstanceRef.current) {
			editorInstanceRef.current.insertContent(text);
		} else {
			const textarea = document.getElementById(editorId);
			if (textarea) {
				const start = textarea.selectionStart;
				const end = textarea.selectionEnd;
				const val = textarea.value;
				textarea.value = val.substring(0, start) + text + val.substring(end);
				textarea.selectionStart = textarea.selectionEnd = start + text.length;
				textarea.focus();
				jQuery(textarea).trigger('change');
			}
		}
	};

	useEffect(() => {
		if (!hasWpEditor) return;

		const initTimer = setTimeout(() => {
			wp.editor.remove(editorId);
			wp.editor.initialize(editorId, {
				mediaButtons: true,
				tinymce: {
					height: height,
					toolbar1: 'formatselect,customInsertButton,bold,italic,bullist,numlist,link,blockquote,alignleft,aligncenter,alignright,underline,strikethrough,forecolor,removeformat,outdent,indent,undo,redo',
					setup(ed) {
						editorInstanceRef.current = ed;

						ed.addButton('customInsertButton', {
							text: 'Button',
							classes: 'fp_editor_btn',
							onclick() {
								setShowButtonDesigner(true);
							}
						});

						ed.on('change', () => {
							const content = wp.editor.getContent(editorId);
							onChange(sanitizeContent(content));
						});
						ed.on('keyup', () => {
							const content = wp.editor.getContent(editorId);
							onChange(sanitizeContent(content));
						});
					}
				},
				quicktags: true
			});

			jQuery('#' + editorId).on('change', () => {
				const content = wp.editor.getContent(editorId);
				onChange(sanitizeContent(content));
			});

			jQuery('#wp-' + editorId + '-wrap').on('click', '.insert-media', function (e) {
				e.preventDefault();
				e.stopPropagation();

				const frame = wp.media({
					title: 'Insert Image',
					library: { type: 'image' },
					multiple: false,
					button: { text: 'Insert Image' }
				});

				frame.on('select', function () {
					const attachment = frame.state().get('selection').first().toJSON();
					const img = `<img src="${attachment.url}" alt="${attachment.alt || ''}" class="aligncenter" />`;
					insertAtEditor(img);
				});

				frame.open();
			});

			const editorWrap = document.getElementById('wp-' + editorId + '-wrap');
			const mediaButtonsContainer = editorWrap?.querySelector('.wp-media-buttons');
			if (mediaButtonsContainer) {
				const portalTarget = document.createElement('span');
				portalTarget.className = 'fp-shortcode-portal';
				const addMediaBtn = mediaButtonsContainer.querySelector('.insert-media');
				if (addMediaBtn) {
					mediaButtonsContainer.insertBefore(portalTarget, addMediaBtn);
				} else {
					mediaButtonsContainer.appendChild(portalTarget);
				}
				shortcodePortalRef.current = portalTarget;
				setPortalReady(true);
			}
		}, 100);

		return () => {
			clearTimeout(initTimer);
			editorInstanceRef.current = null;
			shortcodePortalRef.current = null;
			setPortalReady(false);
			if (window.wp?.editor) {
				wp.editor.remove(editorId);
			}
		};
	}, []);

	if (!hasWpEditor) {
		return (
			<div className="fp-wp-editor-wrapper">
				<textarea
					value={plainContent}
					onChange={(e) => {
						const val = sanitizeContent(e.target.value);
						setPlainContent(val);
						onChange(val);
					}}
					rows="8"
					className="components-textarea-control__input"
				/>
			</div>
		);
	}

	return (
		<div className="fp-wp-editor-wrapper">
			<textarea id={editorId} defaultValue={value} />
			<ButtonDesigner
				visible={showButtonDesigner}
				onClose={() => setShowButtonDesigner(false)}
				onInsert={handleInsertButtonHtml}
			/>
			{portalReady && shortcodePortalRef.current && createPortal(
				<ShortcodeInserter onInsert={(code) => insertAtEditor(code)} />,
				shortcodePortalRef.current
			)}
		</div>
	);
};

export default WPEditor;
