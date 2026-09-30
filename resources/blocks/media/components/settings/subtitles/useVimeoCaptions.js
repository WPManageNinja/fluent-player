const { useState, useEffect, useRef } = wp.element;
const { apiFetch } = wp;
const { __, sprintf } = wp.i18n;

import {
	applyImportedSubtitleResponse,
	getCurrentMediaData,
	isMatchingRequestedMediaState,
	getRequestedMediaState,
} from './utils.js';

/**
 * Vimeo caption import — mirrors useYouTubeCaptions. Vimeo captions are downloaded from
 * the video (signed VTT URLs) and stored as standard subtitles (the default subtitle
 * system), so the editor uses the same fetch → select → import → subtitle-card flow as
 * YouTube. No video_id (the server derives it from the media) and no storyboard.
 */
export const useVimeoCaptions = ({
	mediaData,
	isVimeoProvider,
	hasVimeoCaptionApi,
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
	const fetchRequestRef = useRef(0);
	const importRequestRef = useRef(0);

	const resetTrackSelection = () => {
		setAvailableTracks(null);
		setSelectedTracks([]);
	};

	const isActiveRequest = (requestedMediaState, requestRef, requestId) => (
		isMatchingRequestedMediaState(requestedMediaState, latestMediaDataRef, requestRef, requestId)
	);

	// Reset the fetched list whenever the media or its source changes.
	useEffect(() => {
		resetTrackSelection();
	}, [isVimeoProvider, mediaData?.ID, mediaData?.settings?.src]);

	const maxSelectableTrackCount = Math.min(availableTracks?.length || 0, maxTrackSelection);

	const restBase = () => `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}`;

	const resolveMedia = async () => {
		if (!hasVimeoCaptionApi) {
			showNotification({ type: 'error', message: __('Update FluentPlayer Pro to import Vimeo captions in the editor.', 'fluent-player') });
			return null;
		}
		const requested = (await persistMediaForSubtitleActions?.()) || getCurrentMediaData(latestMediaDataRef, mediaData);
		if (!requested?.ID) {
			return null;
		}
		return { requestedMediaData: requested, requestedMediaState: getRequestedMediaState(requested) };
	};

	const handleFetchCaptions = async () => {
		const context = await resolveMedia();
		if (!context) {
			return { success: false };
		}
		const { requestedMediaData, requestedMediaState } = context;

		setIsFetchingCaptions(true);
		resetTrackSelection();
		const requestId = ++fetchRequestRef.current;

		try {
			const response = await apiFetch({
				path: `${restBase()}/media/${requestedMediaData.ID}/vimeo-captions`,
			});

			if (!isActiveRequest(requestedMediaState, fetchRequestRef, requestId)) {
				return { success: false, stale: true };
			}

			const tracks = Array.isArray(response?.tracks) ? response.tracks : [];
			setAvailableTracks(tracks);
			setSelectedTracks([]);
			return { success: true, tracks };
		} catch (err) {
			if (!isActiveRequest(requestedMediaState, fetchRequestRef, requestId)) {
				return { success: false, stale: true };
			}
			showNotification({ type: 'error', message: err?.message || __('Failed to fetch captions. Please try again.', 'fluent-player') });
			return { success: false, error: err };
		} finally {
			if (fetchRequestRef.current === requestId) {
				setIsFetchingCaptions(false);
			}
		}
	};

	const handleImportCaptions = async () => {
		if (!selectedTracks.length) {
			showNotification({ type: 'error', message: __('Please select at least one track', 'fluent-player') });
			return { success: false };
		}
		if (selectedTracks.length > maxTrackSelection) {
			showNotification({ type: 'error', message: sprintf(__('You can import up to %d subtitle tracks at once.', 'fluent-player'), maxTrackSelection) });
			return { success: false };
		}

		const context = await resolveMedia();
		if (!context) {
			return { success: false };
		}
		const { requestedMediaData, requestedMediaState } = context;

		setIsImporting(true);
		const requestId = ++importRequestRef.current;

		try {
			const response = await apiFetch({
				path: `${restBase()}/media/${requestedMediaData.ID}/vimeo-captions`,
				method: 'POST',
				data: { tracks: selectedTracks },
			});

			if (!isActiveRequest(requestedMediaState, importRequestRef, requestId)) {
				return { success: false, stale: true };
			}

			const currentMediaData = getCurrentMediaData(latestMediaDataRef, mediaData);
			const importedMediaData = applyImportedSubtitleResponse(currentMediaData, response);
			if (!importedMediaData) {
				return { success: false };
			}
			if (!isActiveRequest(requestedMediaState, importRequestRef, requestId)) {
				return { success: false, stale: true };
			}

			syncLatestMediaData(importedMediaData);
			showNotification({ type: 'success', message: response?.message || __('Captions imported successfully!', 'fluent-player') });
			resetTrackSelection();
			return { success: true, mediaData: importedMediaData, response };
		} catch (err) {
			if (!isActiveRequest(requestedMediaState, importRequestRef, requestId)) {
				return { success: false, stale: true };
			}
			showNotification({ type: 'error', message: err?.message || __('Failed to import captions. Please try again.', 'fluent-player') });
			return { success: false, error: err };
		} finally {
			if (importRequestRef.current === requestId) {
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
			showNotification({ type: 'warning', message: sprintf(__('You can import up to %d subtitle tracks at once.', 'fluent-player'), maxTrackSelection) });
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
		setSelectedTracks(availableTracks.slice(0, maxTrackSelection).map((track) => track.trackId));
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
