const { useEffect, useRef } = wp.element;

import { getHoverPreviewStatus, getMediaSourceSignature, hasStoryboardThumbnails } from './utils.js';

export const useMediaDataSync = ({ mediaData, setMediaData, setPersistedMediaData = null }) => {
	const previousMediaSourceRef = useRef({ mediaId: null, signature: '' });
	const latestMediaDataRef = useRef(mediaData || null);
	const latestEditorSetterRef = useRef(setMediaData);
	const latestPersistedSetterRef = useRef(setPersistedMediaData || setMediaData);
	const mediaStateRevisionRef = useRef(0);
	const latestMediaStateRef = useRef({ mediaId: null, revision: 0, sourceSignature: '' });

	useEffect(() => {
		latestEditorSetterRef.current = setMediaData;
		latestPersistedSetterRef.current = setPersistedMediaData || setMediaData;
	}, [setMediaData, setPersistedMediaData]);

	const applyEditorMediaData = (nextMediaData) => {
		latestMediaDataRef.current = nextMediaData;
		latestEditorSetterRef.current(nextMediaData);
	};

	const syncLatestMediaData = (nextMediaData) => {
		latestMediaDataRef.current = nextMediaData;
		latestPersistedSetterRef.current(nextMediaData);
	};

	useEffect(() => {
		if (mediaData?.settings && typeof mediaData.settings.subtitles === 'undefined') {
			applyEditorMediaData({
				...mediaData,
				settings: {
					...mediaData.settings,
					subtitles: []
				}
			});
		}
	}, [mediaData?.ID, mediaData?.settings?.subtitles]);

	useEffect(() => {
		latestMediaDataRef.current = mediaData || null;
		mediaStateRevisionRef.current += 1;
		latestMediaStateRef.current = {
			mediaId: mediaData?.ID || null,
			revision: mediaStateRevisionRef.current,
			sourceSignature: getMediaSourceSignature(mediaData?.settings),
		};
	}, [mediaData?.ID, mediaData?.settings]);

	useEffect(() => {
		const currentMediaData = latestMediaDataRef.current;
		if (!currentMediaData?.ID || !currentMediaData?.settings) {
			return;
		}

		const currentSourceSignature = getMediaSourceSignature(currentMediaData.settings);
		const previousMediaSource = previousMediaSourceRef.current;
		const isSameMediaItem = previousMediaSource.mediaId === currentMediaData.ID;
		const sourceChanged = isSameMediaItem && previousMediaSource.signature !== currentSourceSignature;
		const hasManagedHoverPreview = !!(
			currentMediaData.settings.storyboard_attachment_id
			|| hasStoryboardThumbnails(currentMediaData.settings)
			|| getHoverPreviewStatus(currentMediaData.settings)
		);
		const hasImportedSubtitles = Array.isArray(currentMediaData.settings.subtitles) && currentMediaData.settings.subtitles.length > 0;

		previousMediaSourceRef.current = {
			mediaId: currentMediaData.ID,
			signature: currentSourceSignature,
		};

		if (!sourceChanged || (!hasManagedHoverPreview && !hasImportedSubtitles)) {
			return;
		}

		applyEditorMediaData({
			...currentMediaData,
			settings: {
				...currentMediaData.settings,
				subtitles: [],
				thumbnails: '',
				storyboard_attachment_id: 0,
				storyboard_generation_status: '',
				storyboard_generation_message: '',
			}
		});
	}, [
		mediaData?.ID,
		mediaData?.settings?.provider,
		mediaData?.settings?.src,
		mediaData?.settings?.subtitles,
		mediaData?.settings?.storyboard_generation_status,
		mediaData?.settings?.storyboard_generation_message,
		mediaData?.settings?.storyboard_attachment_id,
		mediaData?.settings?.thumbnails,
	]);

	return {
		latestMediaDataRef,
		latestMediaStateRef,
		applyEditorMediaData,
		syncLatestMediaData,
	};
};
