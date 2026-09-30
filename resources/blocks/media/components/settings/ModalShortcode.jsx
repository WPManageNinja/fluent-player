const { __ } = wp.i18n;
const { Button, BaseControl } = wp.components;
const { useState } = wp.element;

import { CopyIconSVG, LockIconSVG } from '../common/Icons.jsx';
import ProModal from '../common/ProModal.jsx';
import { useNotification } from '../common/useNotification.js';

const ModalShortcode = ({ mediaData }) => {
	const { showNotification } = useNotification();
	const hasPro = !!window.fluentPlayerBlockVars?.hasPro;
	const [isProModalOpen, setIsProModalOpen] = useState(false);

	if (!mediaData?.ID) return null;

	const value = `[fluentplayer_modal id="${mediaData.ID}"]${__('Watch now', 'fluent-player')}[/fluentplayer_modal]`;

	const copyToClipboard = async () => {
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(value);
			} else {
				const el = document.createElement('textarea');
				el.value = value;
				el.setAttribute('readonly', '');
				el.style.position = 'absolute';
				el.style.left = '-9999px';
				document.body.appendChild(el);
				el.select();
				let copied = false;
				try {
					copied = document.execCommand('copy');
				} finally {
					document.body.removeChild(el);
				}
				if (!copied) {
					throw new Error('Clipboard copy was rejected');
				}
			}
			showNotification({ type: 'success', message: __('Shortcode copied to clipboard!', 'fluent-player') });
		} catch (e) {
			showNotification({ type: 'error', message: __('Failed to copy shortcode', 'fluent-player') });
		}
	};

	if (!hasPro) {
		return (
			<BaseControl>
				<div
					className="layer-card"
					style={{ cursor: 'pointer' }}
					role="button"
					tabIndex={0}
					aria-label={__('Lightbox shortcode — a Pro feature. Upgrade to enable.', 'fluent-player')}
					onClick={() => setIsProModalOpen(true)}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							setIsProModalOpen(true);
						}
					}}
				>
					<div className="layer-info">
						<div className="layer-title-row">
							<div className="layer-type-info">
								<span className="layer-title">{__('Lightbox shortcode', 'fluent-player')}</span>
							</div>
							<LockIconSVG size={14} />
						</div>
					</div>
					<p style={{ margin: 0, fontSize: '13px', color: 'var(--fp-text-sub-600, #525866)' }}>
						{__('Pro feature. Open this media in a lightbox from a link, button, or image.', 'fluent-player')}
					</p>
				</div>
				{isProModalOpen && (
					<ProModal
						onClose={() => setIsProModalOpen(false)}
						feature={__('Lightbox shortcode', 'fluent-player')}
					/>
				)}
			</BaseControl>
		);
	}

	return (
		<BaseControl label={__('Lightbox Shortcode', 'fluent-player')}>
			<div className="timestamp-input-wrapper">
				<input
					type="text"
					className="timestamp-input"
					readOnly
					value={value}
					onFocus={(e) => e.target.select()}
				/>
				<Button
					className="fp-icon-btn fp-icon-btn--secondary timestamp-copy-btn"
					onClick={copyToClipboard}
					aria-label={__('Copy lightbox shortcode', 'fluent-player')}
				>
					<CopyIconSVG />
				</Button>
			</div>

			<p className="timestamp-description">
				{__('Open this media in a lightbox from a link, button, or image. Replace the link text as needed, or add button="primary" or button="outline" for a styled button.', 'fluent-player')}
			</p>
		</BaseControl>
	);
};

export default ModalShortcode;
