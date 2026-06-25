const { useState, useEffect, useRef } = wp.element;
const { apiFetch } = wp;
const { __, sprintf } = wp.i18n;

import {
	applyImportedSubtitleResponse,
	getCurrentMediaData,
	isMatchingRequestedMediaState,
	resolveYouTubeMediaActionContext,
} from './utils.js';

export const useYouTubeCaptions = ({
	mediaData,
	isYouTubeProvider,
	hasYouTubeSubtitleApi,
	maxTrackSelection,
	latestMediaDataRef,
	syncLatestMediaData,
	persistMediaForSubtitleActions,
	showNotification,
}) => {
	const [isFetchingCaptions, setIsFetchingCaptions] = useState(false);
	const [availableTracks, setAvailableTracks] = useState(null);
	const [selectedTracks, setSelectedTracks] = useState([]);
	const [isImporting, setIsImporting] = useState(false);
	const captionFetchRequestRef = useRef(0);
	const captionImportRequestRef = useRef(0);

	const resetTrackSelection = () => {
		setAvailableTracks(null);
		setSelectedTracks([]);
	};

	const isActiveCaptionRequest = (requestedMediaState, requestRef, requestId) => (
		isMatchingRequestedMediaState(requestedMediaState, latestMediaDataRef, requestRef, requestId)
	);

	const getCaptionRequestContext = async (missingApiMessage) => {
		if (!hasYouTubeSubtitleApi) {
			showNotification({ type: 'error', message: missingApiMessage });
			return null;
		}

		const requestContext = await resolveYouTubeMediaActionContext({
			mediaData,
			latestMediaDataRef,
			persistMediaForSubtitleActions,
		});

		if (requestContext?.errorCode === 'invalid_video_id') {
			showNotification({ type: 'error', message: __('Could not extract YouTube video ID', 'fluent-player') });
			return null;
		}

		if (!requestContext?.mediaData?.ID) {
			return null;
		}

		return requestContext;
	};

	useEffect(() => {
		if (availableTracks !== null && availableTracks.length === 0) {
			const timer = setTimeout(() => setAvailableTracks(null), 4000);
			return () => clearTimeout(timer);
		}
	}, [availableTracks]);

	useEffect(() => {
		resetTrackSelection();
	}, [isYouTubeProvider, mediaData?.ID, mediaData?.settings?.src]);

	const maxSelectableTrackCount = Math.min(availableTracks?.length || 0, maxTrackSelection);

	const handleFetchCaptions = async () => {
		const requestContext = await getCaptionRequestContext(
			__('Update FluentPlayer Pro to fetch YouTube subtitles in the editor.', 'fluent-player')
		);
		if (!requestContext) {
			return { success: false };
		}

		const {
			mediaData: requestedMediaData,
			videoId,
			requestedMediaState,
		} = requestContext;

		setIsFetchingCaptions(true);
		resetTrackSelection();
		const fetchRequestId = ++captionFetchRequestRef.current;

		try {
			const response = await apiFetch({
				path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/media/${requestedMediaData.ID}/youtube-captions?video_id=${encodeURIComponent(videoId)}`,
			});

			if (!isActiveCaptionRequest(requestedMediaState, captionFetchRequestRef, fetchRequestId)) {
				return { success: false, stale: true };
			}

			const tracks = Array.isArray(response?.tracks) ? response.tracks : [];
			setAvailableTracks(tracks);
			setSelectedTracks([]);

			return {
				success: true,
				tracks,
			};
		} catch (err) {
			if (!isActiveCaptionRequest(requestedMediaState, captionFetchRequestRef, fetchRequestId)) {
				return { success: false, stale: true };
			}

			showNotification({ type: 'error', message: err?.message || __('Failed to fetch subtitles. Please try again.', 'fluent-player') });
			return {
				success: false,
				error: err,
			};
		} finally {
			if (captionFetchRequestRef.current === fetchRequestId) {
				setIsFetchingCaptions(false);
			}
		}
	};

	const handleImportCaptions = async ({ generateStoryboard = false } = {}) => {
		if (!selectedTracks.length) {
			showNotification({ type: 'error', message: __('Please select at least one track', 'fluent-player') });
			return { success: false };
		}

		if (selectedTracks.length > maxTrackSelection) {
			showNotification({
				type: 'error',
				message: sprintf(
					__('You can import up to %d subtitle tracks at once.', 'fluent-player'),
					maxTrackSelection
				)
			});
			return { success: false };
		}

		const requestContext = await getCaptionRequestContext(
			__('Update FluentPlayer Pro to import YouTube subtitles in the editor.', 'fluent-player')
		);
		if (!requestContext) {
			return { success: false };
		}

		const {
			mediaData: requestedMediaData,
			videoId,
			requestedMediaState,
		} = requestContext;

		setIsImporting(true);
		const importRequestId = ++captionImportRequestRef.current;

		try {
			const response = await apiFetch({
				path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/media/${requestedMediaData.ID}/youtube-captions`,
				method: 'POST',
				data: {
					video_id: videoId,
					tracks: selectedTracks,
					generate_storyboard: !!generateStoryboard,
				},
			});

			if (!isActiveCaptionRequest(requestedMediaState, captionImportRequestRef, importRequestId)) {
				return { success: false, stale: true };
			}

			const currentMediaData = getCurrentMediaData(latestMediaDataRef, mediaData);
			const importedMediaData = applyImportedSubtitleResponse(currentMediaData, response);

			if (!importedMediaData) {
				return { success: false };
			}

			if (!isActiveCaptionRequest(requestedMediaState, captionImportRequestRef, importRequestId)) {
				return { success: false, stale: true };
			}

			syncLatestMediaData(importedMediaData);

			showNotification({ type: 'success', message: response?.message || __('Subtitles imported successfully!', 'fluent-player') });
			resetTrackSelection();

			return {
				success: true,
				mediaData: importedMediaData,
				response,
			};
		} catch (err) {
			if (!isActiveCaptionRequest(requestedMediaState, captionImportRequestRef, importRequestId)) {
				return { success: false, stale: true };
			}

			showNotification({ type: 'error', message: err?.message || __('Failed to import subtitles. Please try again.', 'fluent-player') });
			return {
				success: false,
				error: err,
			};
		} finally {
			if (captionImportRequestRef.current === importRequestId) {
				setIsImporting(false);
			}
		}
	};

	const toggleTrack = (trackId) => {
		if (selectedTracks.includes(trackId)) {
			setSelectedTracks((prev) => prev.filter((id) => id !== trackId));
			return;
		}

		if (selectedTracks.length >= maxTrackSelection) {
			showNotification({
				type: 'warning',
				message: sprintf(
					__('You can import up to %d subtitle tracks at once.', 'fluent-player'),
					maxTrackSelection
				)
			});
			return;
		}

		setSelectedTracks((prev) => [...prev, trackId]);
	};

	const toggleAllTracks = () => {
		if (!availableTracks) {
			return;
		}

		if (selectedTracks.length === maxSelectableTrackCount) {
			setSelectedTracks([]);
			return;
		}

		const nextSelectedTracks = availableTracks
			.slice(0, maxTrackSelection)
			.map((track) => track.trackId);

		if (availableTracks.length > maxTrackSelection) {
			showNotification({
				type: 'info',
				message: sprintf(
					__('Only the first %d subtitle tracks can be selected at once.', 'fluent-player'),
					maxTrackSelection
				)
			});
		}

		setSelectedTracks(nextSelectedTracks);
	};

	return {
		isFetchingCaptions,
		availableTracks,
		selectedTracks,
		isImporting,
		maxSelectableTrackCount,
		resetTrackSelection,
		handleFetchCaptions,
		handleImportCaptions,
		toggleTrack,
		toggleAllTracks,
	};
};
