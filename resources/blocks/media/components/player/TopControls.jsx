/**
 * TopControls component for Fluent Player
 * Consolidated component that includes title overlay, chapter title, and language controls
 * Based on player/top-controls.php
 */

import LanguageControls from './LanguageControls.jsx';

const TopControls = ({ skin, settings, mediaId }) => {
    // Get the video title and overlay setting
    const videoTitle = settings?.title || '';
    const showTitleOverlay = settings?.show_title_overlay !== false;
    const hasChapters = settings?.chapters && settings.chapters.length > 0;

    return (
        <>
            {/* Language Controls - Shows language switcher at top right */}
            <LanguageControls settings={settings} mediaId={mediaId} />

            {/* Title Overlay with Video Title and Chapter Title stacked */}
            {videoTitle && showTitleOverlay && (
                <div className="fluent-player-top-title-overlay">
                    <div className="fluent-player-title-stack">
                        {/* Video Title - Main title */}
                        <media-title className="fluent-player-media-title"></media-title>

                        {/* Chapter Title - Subtitle below video title */}
                        {hasChapters && (
                            <media-chapter-title className="fluent-player-chapter-subtitle"></media-chapter-title>
                        )}
                    </div>
                </div>
            )}

            {/* Top Controls - Only show chapter title if no video title */}
            {(!videoTitle || !showTitleOverlay) && (
                <media-controls className={`fp-media-controls-top fp-skin-${skin}`}>
                    <media-controls-group>
                        <media-chapter-title></media-chapter-title>
                        <div className="fp-media-controls-spacer"></div>
                    </media-controls-group>
                </media-controls>
            )}
        </>
    );
};

export default TopControls;
