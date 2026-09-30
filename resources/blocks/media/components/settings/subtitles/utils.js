import { LANGUAGE_OPTIONS } from './constants.js';
import { extractYouTubeId } from '@share/helper.js';

export const getLanguageLabel = (code) => {
	const option = LANGUAGE_OPTIONS.find((item) => item.value === code);

	return option?.label || code;
};

// Apply a subtitle edit (language / custom label / default flag) to the track matching
// `matchKey`. Setting the default clears it on every other track — only one can be the
// default (subtitle-tracks.php honours is_default, else falls back to the first).
export const applySubtitleEdit = (subtitles, matchKey, getKey, edit = {}) => {
	if (!Array.isArray(subtitles)) {
		return [];
	}

	const makeDefault = !!edit.is_default;

	return subtitles.map((subtitle, index) => {
		if (getKey(subtitle, index) === matchKey) {
			return {
				...subtitle,
				language: edit.language,
				label: edit.label || getLanguageLabel(edit.language),
				is_default: makeDefault,
			};
		}

		return makeDefault ? { ...subtitle, is_default: false } : subtitle;
	});
};

export const getNormalizedYouTubeId = (src = '') => {
	if (typeof src !== 'string') {
		return '';
	}

	const trimmedSrc = src.trim();
	if (!trimmedSrc) {
		return '';
	}

	if (/^[A-Za-z0-9_-]{11}$/.test(trimmedSrc)) {
		return trimmedSrc;
	}

	const videoId = extractYouTubeId(trimmedSrc);

	return videoId || '';
};

export const getMediaSourceSignature = (settings = {}) => {
	const provider = settings?.provider || '';
	const src = settings?.src || '';

	if (!provider || !src) {
		return '';
	}

	if (provider === 'youtube') {
		const videoId = getNormalizedYouTubeId(src);

		return videoId ? `youtube:${videoId}` : `youtube:${src}`;
	}

	return `${provider}:${src}`;
};

export const getHoverPreviewStatus = (settings = {}) => settings?.storyboard_generation_status || '';

export const getHoverPreviewStatusMessage = (settings = {}) => settings?.storyboard_generation_message || '';

export const getStoryboardThumbnailUrl = (settings = {}) => {
	const thumbnails = settings?.thumbnails;

	if (typeof thumbnails !== 'string') {
		return '';
	}

	return thumbnails.trim();
};

export const hasStoryboardThumbnails = (settings = {}) => getStoryboardThumbnailUrl(settings) !== '';

export const detectLanguageFromFilename = (filename) => {
	const languageMap = {
		'en': 'en', 'english': 'en',
		'es': 'es', 'spanish': 'es',
		'fr': 'fr', 'french': 'fr',
		'de': 'de', 'german': 'de',
		'it': 'it', 'italian': 'it',
		'pt': 'pt', 'portuguese': 'pt',
		'ru': 'ru', 'russian': 'ru',
		'ja': 'ja', 'japanese': 'ja',
		'ko': 'ko', 'korean': 'ko',
		'zh': 'zh', 'chinese': 'zh',
		'ar': 'ar', 'arabic': 'ar',
		'hi': 'hi', 'hindi': 'hi'
	};

	const lowerFilename = (filename || '').toLowerCase();

	for (const [key, code] of Object.entries(languageMap)) {
		if (lowerFilename.includes(key)) {
			return code;
		}
	}

	return 'en';
};

export const mergeImportedSubtitles = (existingSubtitles = [], importedSubtitles = []) => {
	const makeSubtitleKey = (subtitle) => {
		if (subtitle?.id) return `id::${subtitle.id}`;
		if (subtitle?.trackId) return `track::${subtitle.trackId}`;
		if (subtitle?.url) return `url::${subtitle.url}`;

		return `langlabel::${subtitle?.language || ''}::${subtitle?.label || ''}`;
	};

	const existingKeys = new Set(existingSubtitles.map((subtitle) => makeSubtitleKey(subtitle)));

	return [
		...existingSubtitles,
		...importedSubtitles.filter((subtitle) => {
			const key = makeSubtitleKey(subtitle);

			if (existingKeys.has(key)) {
				return false;
			}

			existingKeys.add(key);
			return true;
		})
	];
};

export const getCurrentMediaData = (latestMediaDataRef = null, mediaData = null) => (
	latestMediaDataRef?.current || mediaData || null
);

const MANAGED_SUBTITLE_SETTINGS_KEYS = [
	'subtitles',
	'thumbnails',
	'storyboard_attachment_id',
	'storyboard_generation_status',
	'storyboard_generation_message',
];

export const getRequestedMediaState = (requestedMediaData = null) => ({
	mediaId: requestedMediaData?.ID || null,
	sourceSignature: getMediaSourceSignature(requestedMediaData?.settings),
});

export const resolveYouTubeMediaActionContext = async ({
	preferredMediaData = null,
	mediaData = null,
	latestMediaDataRef = null,
	persistMediaForSubtitleActions = null,
}) => {
	const requestedMediaData = preferredMediaData
		|| await persistMediaForSubtitleActions?.()
		|| getCurrentMediaData(latestMediaDataRef, mediaData);

	if (!requestedMediaData?.ID) {
		return {
			errorCode: 'missing_media',
			mediaData: null,
			requestedMediaState: {
				mediaId: null,
				sourceSignature: '',
			},
			videoId: '',
		};
	}

	const requestedMediaState = getRequestedMediaState(requestedMediaData);
	const videoId = getNormalizedYouTubeId(requestedMediaData?.settings?.src);

	if (!videoId) {
		return {
			errorCode: 'invalid_video_id',
			mediaData: requestedMediaData,
			requestedMediaState,
			videoId: '',
		};
	}

	return {
		errorCode: '',
		mediaData: requestedMediaData,
		requestedMediaState,
		videoId,
	};
};

export const isMatchingRequestedMediaState = (requestedState, latestMediaDataRef, requestRef = null, requestId = null) => {
	if (requestRef && requestRef.current !== requestId) {
		return false;
	}

	const latestMediaData = latestMediaDataRef.current;
	if (!latestMediaData?.ID || latestMediaData.ID !== requestedState.mediaId) {
		return false;
	}

	return getMediaSourceSignature(latestMediaData.settings) === requestedState.sourceSignature;
};

export const applyManagedSubtitleResponse = (baseMediaData = null, response = {}, overrides = {}) => {
	if (!baseMediaData) {
		return null;
	}

	const mergedSettings = {
		...(baseMediaData.settings || {}),
	};

	for (const key of MANAGED_SUBTITLE_SETTINGS_KEYS) {
		const hasOverride = Object.prototype.hasOwnProperty.call(overrides, key);
		const overrideValue = overrides[key];
		if (hasOverride && typeof overrideValue !== 'undefined') {
			mergedSettings[key] = overrideValue;
			continue;
		}

		if (Object.prototype.hasOwnProperty.call(response || {}, key) && typeof response[key] !== 'undefined') {
			mergedSettings[key] = response[key];
		}
	}

	return {
		...baseMediaData,
		settings: mergedSettings,
	};
};

export const applyImportedSubtitleResponse = (baseMediaData = null, response = {}) => {
	if (!baseMediaData) {
		return null;
	}

	const importedSubtitles = Array.isArray(response?.subtitles) ? response.subtitles : [];
	const mergedSubtitles = mergeImportedSubtitles(baseMediaData.settings?.subtitles || [], importedSubtitles);

	return applyManagedSubtitleResponse(baseMediaData, response, {
		subtitles: mergedSubtitles,
		storyboard_generation_status: response?.storyboard_status,
		storyboard_generation_message: response?.storyboard_message,
	});
};

export const applyStoryboardResponse = (baseMediaData = null, response = {}) => (
	applyManagedSubtitleResponse(baseMediaData, response, {
		storyboard_generation_status: response?.storyboard_status,
		storyboard_generation_message: response?.storyboard_message ?? response?.message,
	})
);
