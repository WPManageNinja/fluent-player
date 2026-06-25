const { __ } = wp.i18n;
const { Button, BaseControl } = wp.components;

import { CopyIconSVG } from '../common/Icons.jsx';
import { useNotification } from '../common/useNotification.js';

const TimestampShortcode = ({ mediaData }) => {
	const { showNotification } = useNotification();

	if (!mediaData.ID) return null;

	const value = `[fluentplayer_timestamp time="1:00" media_id="${mediaData.ID}"]Go to 1:00[/fluentplayer_timestamp]`;

	const copyToClipboard = () => {
		if (navigator.clipboard) {
			navigator.clipboard.writeText(value).then(() => {
				showNotification({ type: 'success', message: __('Shortcode copied to clipboard!', 'fluent-player') });
			}).catch(() => {
				showNotification({ type: 'error', message: __('Failed to copy shortcode', 'fluent-player') });
			});
		}
	};

	return (
		<BaseControl label={__('Timestamp Link Shortcode', 'fluent-player')}>
			<div className="timestamp-input-wrapper">
				<input
					type="text"
					className="timestamp-input"
					readOnly
					value={value}
				/>
				<Button
					className="fp-icon-btn fp-icon-btn--secondary timestamp-copy-btn"
					onClick={copyToClipboard}
				>
					<CopyIconSVG />
				</Button>
			</div>

			<p className="timestamp-description">
				{__('Create clickable links that jump to specific times in the video. Edit the time value and link text as needed.', 'fluent-player')}
			</p>
		</BaseControl>
	);
};

export default TimestampShortcode;
