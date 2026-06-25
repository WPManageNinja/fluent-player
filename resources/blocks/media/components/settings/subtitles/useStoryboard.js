const { useState, useEffect, useRef } = wp.element;
const { apiFetch } = wp;
const { __ } = wp.i18n;

import {
	applyStoryboardResponse,
	getCurrentMediaData,
	getHoverPreviewStatus,
	getHoverPreviewStatusMessage,
	isMatchingRequestedMediaState,
	resolveYouTubeMediaActionContext,
} from './utils.js';

export const useStoryboard = ({
	mediaData,
	isYouTubeProvider,
	hasYouTubeStoryboardApi,
	latestMediaDataRef,
	latestMediaStateRef,
	syncLatestMediaData,
	persistMediaForSubtitleActions,
	showNotification,
}) => {
	const [generateHoverPreview, setGenerateHoverPreview] = useState(true);
	const [isGeneratingHoverPreview, setIsGeneratingHoverPreview] = useState(false);
	const [hoverPreviewNotice, setHoverPreviewNotice] = useState(null);
	const storyboardRequestRef = useRef(0);
	const refreshRequestRef = useRef(0);

	const isActiveStoryboardRequest = (requestedMediaState, requestId) => (
		isMatchingRequestedMediaState(requestedMediaState, latestMediaDataRef, storyboardRequestRef, requestId)
	);

	useEffect(() => {
		setHoverPreviewNotice(null);
		setIsGeneratingHoverPreview(false);

		if (!isYouTubeProvider) {
			setGenerateHoverPreview(false);
			return;
		}

		setGenerateHoverPreview(true);
	}, [isYouTubeProvider, mediaData?.ID, mediaData?.settings?.src]);

	useEffect(() => {
		if (!isYouTubeProvider || isGeneratingHoverPreview) {
			return;
		}

		const status = getHoverPreviewStatus(mediaData?.settings);
		const message = getHoverPreviewStatusMessage(mediaData?.settings);

		if (status === 'queued' || status === 'processing') {
			setHoverPreviewNotice({
				status: 'info',
				message: message || __('Hover preview is still pending.', 'fluent-player'),
				canRefresh: true,
			});
			return;
		}

		if (status === 'completed') {
			setHoverPreviewNotice((prevNotice) => {
				if (!prevNotice) {
					return null;
				}

				return {
					status: 'success',
					message: message || __('Hover preview enabled.', 'fluent-player'),
					canRefresh: false,
				};
			});
			return;
		}

		if (status === 'failed') {
			setHoverPreviewNotice({
				status: 'warning',
				message: message || __('Hover preview could not be generated.', 'fluent-player'),
				canRefresh: true,
			});
			return;
		}

		setHoverPreviewNotice(null);
	}, [
		isGeneratingHoverPreview,
		isYouTubeProvider,
		mediaData?.settings,
		mediaData?.settings?.storyboard_generation_message,
		mediaData?.settings?.storyboard_generation_status,
	]);

	const handleGenerateStoryboard = async ({ preferredMediaData = null } = {}) => {
		if (!hasYouTubeStoryboardApi) {
			return { success: false };
		}

		const requestContext = await resolveYouTubeMediaActionContext({
			preferredMediaData,
			mediaData,
			latestMediaDataRef,
			persistMediaForSubtitleActions,
		});

		if (requestContext?.errorCode === 'invalid_video_id') {
			const message = __('Could not extract YouTube video ID', 'fluent-player');
			setHoverPreviewNotice({
				status: 'warning',
				message,
			});
			showNotification({ type: 'error', message });
			return { success: false };
		}

		const {
			mediaData: requestedMediaData,
			requestedMediaState,
			videoId,
		} = requestContext;

		if (!requestedMediaData?.ID || !requestedMediaState.mediaId || !requestedMediaState.sourceSignature) {
			return { success: false };
		}

		const storyboardRequestId = ++storyboardRequestRef.current;
		setIsGeneratingHoverPreview(true);
		setHoverPreviewNotice({
			status: 'info',
			message: __('Generating hover preview...', 'fluent-player')
		});

		try {
			const response = await apiFetch({
				path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/media/${requestedMediaState.mediaId}/youtube-storyboard`,
				method: 'POST',
				data: {
					video_id: videoId,
				},
			});

			if (!isActiveStoryboardRequest(requestedMediaState, storyboardRequestId)) {
				return { success: false, stale: true };
			}

			const currentMediaData = getCurrentMediaData(latestMediaDataRef, requestedMediaData);
			const syncedMediaData = applyStoryboardResponse(currentMediaData, response);

			if (!isActiveStoryboardRequest(requestedMediaState, storyboardRequestId)) {
				return { success: false, stale: true };
			}

			syncLatestMediaData(syncedMediaData);
			setHoverPreviewNotice({
				status: 'success',
				message: response?.message || __('Hover preview enabled.', 'fluent-player')
			});

			return {
				success: true,
				mediaData: syncedMediaData,
				response,
			};
		} catch (err) {
			if (!isActiveStoryboardRequest(requestedMediaState, storyboardRequestId)) {
				return { success: false, stale: true };
			}

			setHoverPreviewNotice({
				status: 'warning',
				message: err?.message || __('Hover preview could not be generated.', 'fluent-player')
			});

			return {
				success: false,
				error: err,
			};
		} finally {
			if (storyboardRequestRef.current === storyboardRequestId) {
				setIsGeneratingHoverPreview(false);
			}
		}
	};

	const handleRefreshHoverPreviewStatus = async () => {
		const refreshRequestId = ++refreshRequestRef.current;
		const requestedMediaState = {
			...latestMediaStateRef.current,
		};

		if (!requestedMediaState.mediaId) {
			return;
		}

		try {
			setHoverPreviewNotice((prev) => prev ? {
				...prev,
				message: __('Refreshing hover preview status...', 'fluent-player'),
				canRefresh: false,
			} : {
				status: 'info',
				message: __('Refreshing hover preview status...', 'fluent-player'),
				canRefresh: false,
			});

			const response = await apiFetch({
				path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/media/${requestedMediaState.mediaId}`,
			});

			const latestMediaState = latestMediaStateRef.current;
			const isStaleResponse = refreshRequestRef.current !== refreshRequestId
				|| latestMediaState.mediaId !== requestedMediaState.mediaId
				|| latestMediaState.revision !== requestedMediaState.revision
				|| latestMediaState.sourceSignature !== requestedMediaState.sourceSignature;

			if (isStaleResponse) {
				return;
			}

			const refreshedMedia = response?.media;
			if (refreshedMedia) {
				syncLatestMediaData(refreshedMedia);
			}
		} catch (err) {
			if (refreshRequestRef.current !== refreshRequestId) {
				return;
			}

			setHoverPreviewNotice({
				status: 'warning',
				message: err?.message || __('Failed to refresh hover preview status.', 'fluent-player'),
				canRefresh: true,
			});
			showNotification({ type: 'error', message: err?.message || __('Failed to refresh hover preview status.', 'fluent-player') });
		}
	};

	return {
		generateHoverPreview,
		setGenerateHoverPreview,
		isGeneratingHoverPreview,
		hoverPreviewNotice,
		setHoverPreviewNotice,
		handleGenerateStoryboard,
		handleRefreshHoverPreviewStatus,
	};
};
