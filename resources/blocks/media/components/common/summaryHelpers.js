const { __, sprintf } = wp.i18n;

import { formatTime } from '@share/helper.js';

export const joinSummaryItems = (items, fallback = '') => {
	const normalizedItems = [...new Set(items.filter(Boolean).map((item) => String(item).trim()).filter(Boolean))];

	return normalizedItems.length ? normalizedItems.join(' • ') : fallback;
};

export const formatAtTimeSummary = (seconds = 0) => sprintf(
	/* translators: %s: formatted time */
	__('At %s', 'fluent-player'),
	formatTime(Number(seconds) || 0)
);

export const formatDurationSummary = (seconds = 0) => sprintf(
	/* translators: %s: formatted duration */
	__('%s duration', 'fluent-player'),
	formatTime(Number(seconds) || 0)
);

export const formatCompactDurationValue = (seconds = 0) => {
	const normalizedSeconds = Math.max(0, Number(seconds) || 0);

	if (normalizedSeconds < 60) {
		return sprintf(
			/* translators: %d: duration in seconds */
			__('%ds', 'fluent-player'),
			normalizedSeconds
		);
	}

	return formatTime(normalizedSeconds);
};

export const formatAtPercentSummary = (percent = 0) => sprintf(
	/* translators: %d: percentage */
	__('At %d%%', 'fluent-player'),
	Number(percent) || 0
);

export const appendSummaryDetail = (base, detail) => (
	detail ? `${base} • ${detail}` : base
);

export const getCtaDismissSummary = (completionType = 'link_click', autoDismissDuration = 5) => {
	if (completionType === 'auto_dismiss') {
		return sprintf(
			/* translators: %s: auto dismiss duration */
			__('Auto dismiss after %s', 'fluent-player'),
			formatCompactDurationValue(autoDismissDuration || 5)
		);
	}

	if (completionType === 'skip_only') {
		return __('Dismiss on skip', 'fluent-player');
	}

	return __('Dismiss on link click', 'fluent-player');
};

export const summarizeRichTextContent = (content = '', emptyLabel = __('No content yet', 'fluent-player')) => {
	const html = String(content || '').trim();

	if (!html) {
		return emptyLabel;
	}

	const summaryItems = [];
	const plainText = html
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.trim();

	if (plainText) {
		summaryItems.push(__('Text', 'fluent-player'));
	}

	if (/<a\b/i.test(html)) {
		summaryItems.push(__('Link', 'fluent-player'));
	}

	if (/<img\b/i.test(html)) {
		summaryItems.push(__('Image', 'fluent-player'));
	}

	if (/<(ul|ol|li)\b/i.test(html)) {
		summaryItems.push(__('List', 'fluent-player'));
	}

	return joinSummaryItems(summaryItems, emptyLabel);
};

export const summarizeEmailContent = ({
	headline,
	placeholder,
	buttonText,
	bottomText,
} = {}, emptyLabel = __('No content yet', 'fluent-player')) => {
	const summaryItems = [];

	if (String(headline || '').trim()) {
		summaryItems.push(__('Headline', 'fluent-player'));
	}

	if (String(placeholder || '').trim()) {
		summaryItems.push(__('Placeholder', 'fluent-player'));
	}

	if (String(buttonText || '').trim()) {
		summaryItems.push(__('Button', 'fluent-player'));
	}

	if (String(bottomText || '').trim()) {
		summaryItems.push(__('Note', 'fluent-player'));
	}

	return joinSummaryItems(summaryItems, emptyLabel);
};

export const summarizeAppearanceParts = (parts = [], emptyLabel = __('Default styles', 'fluent-player')) => (
	joinSummaryItems(parts, emptyLabel)
);

export const summarizeOverlayContent = ({
	text,
	link,
} = {}, emptyLabel = __('No content yet', 'fluent-player')) => {
	const summaryItems = [];

	if (String(text || '').trim()) {
		summaryItems.push(__('Text', 'fluent-player'));
	}

	if (String(link || '').trim()) {
		summaryItems.push(__('Link', 'fluent-player'));
	}

	return joinSummaryItems(summaryItems, emptyLabel);
};

export const summarizeOverlayLayout = ({
	dynamicPosition = false,
	positionLabel = '',
	repositionInterval,
	repositionAnimation,
} = {}, emptyLabel = __('Top Left', 'fluent-player')) => {
	if (!dynamicPosition) {
		return positionLabel || emptyLabel;
	}

	const summaryItems = [__('Dynamic', 'fluent-player')];

	if (repositionInterval) {
		summaryItems.push(sprintf(
			/* translators: %s: reposition interval */
			__('Every %s', 'fluent-player'),
			formatCompactDurationValue(repositionInterval)
		));
	}

	if (String(repositionAnimation || '').trim()) {
		summaryItems.push(String(repositionAnimation)
			.replace(/[_-]+/g, ' ')
			.replace(/\b\w/g, (char) => char.toUpperCase()));
	}

	return joinSummaryItems(summaryItems, __('Dynamic', 'fluent-player'));
};

export const summarizeShortcodeContent = ({
	title,
	shortcode,
} = {}, emptyLabel = __('No content yet', 'fluent-player')) => {
	const summaryItems = [];

	if (String(title || '').trim()) {
		summaryItems.push(__('Title', 'fluent-player'));
	}

	if (String(shortcode || '').trim()) {
		summaryItems.push(__('Shortcode', 'fluent-player'));
	}

	return joinSummaryItems(summaryItems, emptyLabel);
};

export const summarizeFormContent = ({
	title,
	formId,
	formName,
} = {}, emptyLabel = __('No form selected', 'fluent-player')) => {
	const summaryItems = [];

	if (String(title || '').trim()) {
		summaryItems.push(__('Title', 'fluent-player'));
	}

	if (formId) {
		summaryItems.push(formName || __('Form', 'fluent-player'));
	}

	return joinSummaryItems(summaryItems, emptyLabel);
};

export const getEmailProviderDisplayName = (provider = {}, providersMeta = {}) => {
	if (provider.type === 'email') {
		return __('Email Notification', 'fluent-player');
	}

	const providerLabels = {
		fluentcrm: 'FluentCRM',
		mailchimp: 'Mailchimp',
		convertkit: 'ConvertKit',
		activecampaign: 'ActiveCampaign',
		drip: 'Drip',
		getresponse: 'GetResponse',
		moosend: 'Moosend',
		sendinblue: 'Brevo',
		hubspot: 'HubSpot',
		webhook: 'Webhook',
		zapier: 'Zapier',
		slack: 'Slack',
		telegram: 'Telegram',
	};

	if (providersMeta?.[provider.type]?.name) {
		return providersMeta[provider.type].name;
	}

	if (providerLabels[provider.type]) {
		return providerLabels[provider.type];
	}

	return String(provider.type || '')
		.replace(/[_-]+/g, ' ')
		.replace(/\b\w/g, (char) => char.toUpperCase())
		.trim() || __('Provider', 'fluent-player');
};

export const summarizeProviderNames = (
	providers = [],
	providersMeta = {},
	emptyLabel = __('No providers configured', 'fluent-player')
) => {
	const enabledProviders = providers.filter((provider) => provider.enabled);

	if (!enabledProviders.length) {
		return emptyLabel;
	}

	const providerNames = enabledProviders.map((provider) => getEmailProviderDisplayName(provider, providersMeta));

	if (providerNames.length <= 3) {
		return providerNames.join(', ');
	}

	return sprintf(
		/* translators: 1: first provider name, 2: second provider name, 3: remaining enabled provider count */
		__('%1$s, %2$s +%3$d', 'fluent-player'),
		providerNames[0],
		providerNames[1],
		providerNames.length - 2
	);
};

export const summarizeHotspotsCount = (hotspots = [], maxCount = 5) => {
	if (!hotspots.length) {
		return __('No hotspots yet', 'fluent-player');
	}

	const iconCount = hotspots.filter((hotspot) => hotspot.type === 'icon').length;
	const dotCount = hotspots.length - iconCount;
	const items = [];

	if (iconCount) {
		items.push(sprintf(
			/* translators: 1: icon hotspot count, 2: plural label */
			__('%1$d %2$s', 'fluent-player'),
			iconCount,
			iconCount === 1 ? __('Icon', 'fluent-player') : __('Icons', 'fluent-player')
		));
	}

	if (dotCount) {
		items.push(sprintf(
			/* translators: 1: dot hotspot count, 2: plural label */
			__('%1$d %2$s', 'fluent-player'),
			dotCount,
			dotCount === 1 ? __('Dot', 'fluent-player') : __('Dots', 'fluent-player')
		));
	}

	if (hotspots.length >= maxCount) {
		items.push(__('Limit reached', 'fluent-player'));
	}

	return joinSummaryItems(items, __('No hotspots yet', 'fluent-player'));
};

export const summarizeActionBarControls = ({
	showClose = false,
	buttonType = 'custom',
} = {}) => {
	const items = [];

	if (showClose) {
		items.push(__('Close button', 'fluent-player'));
	}

	if (buttonType === 'youtube') {
		items.push(__('YouTube button', 'fluent-player'));
	} else if (buttonType === 'custom') {
		items.push(__('Custom button', 'fluent-player'));
	} else {
		items.push(__('No button', 'fluent-player'));
	}

	return joinSummaryItems(items);
};

export const summarizeActionBarContent = ({
	text,
	textSize,
} = {}, emptyLabel = __('No content yet', 'fluent-player')) => {
	const items = [];

	if (String(text || '').trim()) {
		items.push(__('Text', 'fluent-player'));
	}

	if (textSize) {
		items.push(__('Size', 'fluent-player'));
	}

	return joinSummaryItems(items, emptyLabel);
};

export const summarizeButtonSetup = ({
	buttonText,
	buttonLink,
	openInNewTab = false,
} = {}, emptyLabel = __('No button details yet', 'fluent-player')) => {
	const items = [];

	if (String(buttonText || '').trim()) {
		items.push(__('Text', 'fluent-player'));
	}

	if (String(buttonLink || '').trim()) {
		items.push(__('Link', 'fluent-player'));
	}

	if (buttonLink && openInNewTab) {
		items.push(__('New tab', 'fluent-player'));
	}

	return joinSummaryItems(items, emptyLabel);
};

export const summarizeYoutubeSetup = ({
	youtubeChannel,
	buttonCount = false,
} = {}, emptyLabel = __('No channel selected', 'fluent-player')) => {
	const items = [];

	if (String(youtubeChannel || '').trim()) {
		items.push(__('Channel ID', 'fluent-player'));
	}

	if (buttonCount) {
		items.push(__('Count shown', 'fluent-player'));
	}

	return joinSummaryItems(items, emptyLabel);
};
