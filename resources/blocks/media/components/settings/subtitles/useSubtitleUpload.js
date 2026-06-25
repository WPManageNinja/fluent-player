const { useState, useRef } = wp.element;
const { apiFetch } = wp;
const { __ } = wp.i18n;

import {
  detectLanguageFromFilename,
  getLanguageLabel,
  getRequestedMediaState,
  isMatchingRequestedMediaState,
  mergeImportedSubtitles
} from "./utils.js";

export const useSubtitleUpload = ({
                                    mediaData,
                                    hasSubtitleUploadApi,
                                    latestMediaDataRef,
                                    syncLatestMediaData,
                                    showNotification
                                  }) => {
  const [isUploading, setIsUploading] = useState(false);
  const uploadRequestRef = useRef(0);

  const handleSubtitleUpload = async (attachment) => {
    if (!attachment || !attachment.id) {
      showNotification({ type: "error", message: __("No file selected", "fluent-player") });
      return;
    }

    if (!hasSubtitleUploadApi) {
      showNotification({
        type: "error",
        message: __("Update FluentPlayer Pro to use subtitle uploads in the editor.", "fluent-player")
      });
      return;
    }

    const fileName = attachment.filename || attachment.title;
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf("."));

    if (fileExtension !== ".vtt" && fileExtension !== ".srt") {
      showNotification({
        type: "error",
        message: __("Please select a valid subtitle file (.vtt or .srt)", "fluent-player")
      });
      return;
    }

    setIsUploading(true);
    const uploadRequestId = ++uploadRequestRef.current;
    const requestedMediaState = getRequestedMediaState(latestMediaDataRef.current || mediaData);

    try {
      const detectedLanguage = detectLanguageFromFilename(fileName);
      const response = await apiFetch({
        path: `${window.fluentPlayerBlockVars.rest.namespace}/${window.fluentPlayerBlockVars.rest.version}/media/${mediaData.ID}/subtitles`,
        method: "POST",
        data: {
          attachment_id: attachment.id,
          language: detectedLanguage,
          label: getLanguageLabel(detectedLanguage)
        }
      });

      if (!isMatchingRequestedMediaState(requestedMediaState, latestMediaDataRef, uploadRequestRef, uploadRequestId)) {
        return;
      }

      const newSubtitle = response?.data || response;
      if (!newSubtitle?.id) {
        showNotification({
          type: "success",
          message: response?.message || __("This subtitle is already attached to the media.", "fluent-player")
        });
        return;
      }

      const latestUploadedMediaData = latestMediaDataRef.current || mediaData;
      const nextSubtitles = mergeImportedSubtitles(latestUploadedMediaData.settings?.subtitles || [], [
        {
          ...newSubtitle,
          attachment_id: attachment.id,
          url: attachment.url,
          filename: fileName
        }
      ]);

      syncLatestMediaData({
        ...latestUploadedMediaData,
        settings: {
          ...latestUploadedMediaData.settings,
          subtitles: nextSubtitles
        }
      });

      showNotification({
        type: "success",
        message: response?.message || __("Subtitle uploaded successfully!", "fluent-player")
      });
    } catch (err) {
      if (!isMatchingRequestedMediaState(requestedMediaState, latestMediaDataRef, uploadRequestRef, uploadRequestId)) {
        return;
      }

      showNotification({
        type: "error",
        message: err?.message || __("Error uploading subtitle file", "fluent-player")
      });
    } finally {
      if (uploadRequestRef.current === uploadRequestId) {
        setIsUploading(false);
      }
    }
  };

  return {
    isUploading,
    handleSubtitleUpload
  };
};
