/**
 * AudioLayout component for Fluent Player
 * Skin-aware audio player layout
 */

import PlayButton from './buttons/PlayButton';
import MuteButton from './buttons/MuteButton';
import VolumeSlider from './sliders/VolumeSlider';
import TimeGroup from './TimeGroup';
import CaptionButton from './buttons/CaptionButton';
import ChaptersMenu from './menus/ChaptersMenu';
import SpeedMenu from './menus/SpeedMenu';
import SettingsMenu from './menus/SettingsMenu';
import CaptionsMenu from './menus/CaptionsMenu';
import TimeSlider from './sliders/TimeSlider';
import SeekButton from './buttons/SeekButton';

const AudioLayout = ({ settings, skin = 'modern' }) => {
    const controls = settings.controls || {};
    const hasChapters = settings.chapters && settings.chapters.length > 0;
    const src = settings.src || '';
    const provider = settings.provider || '';
    const hasHls = provider === 'bunny' || provider === 'mux' || provider === 'mux_stream' || src.includes('.m3u8');
    const subtitles = settings.subtitles || [];
    const hasSubtitles = subtitles.length > 0;
    const subtitleCount = subtitles.length;
    const hasCaptionSource = hasSubtitles || hasHls;
    const showSettingsMenu = controls.settings !== false;
    const presetSlug = settings.preset_slug || settings.slug || '';
    const isReservedPreset = ['default', 'course', 'simple', 'minimal', 'standard', 'floating', 'ambient'].includes(presetSlug);
    const isSimpleReservedPreset = presetSlug === 'simple';
    const isSimpleSkin = skin === 'simple';
    const useSettingsForSpeedControls = isReservedPreset && showSettingsMenu;
    const showSettingsMenuControl = showSettingsMenu && (!isSimpleSkin || (isSimpleReservedPreset && hasCaptionSource));
    const showStandaloneCaptionMenu = !isReservedPreset && !showSettingsMenuControl && controls.captions_toggle !== false && !settings._hideCaptions && hasCaptionSource && (hasHls || subtitleCount > 1);
    const showStandaloneCaptionShortcut = controls.captions_toggle !== false && !settings._hideCaptions && hasCaptionSource && (!isSimpleReservedPreset || !showSettingsMenuControl);
    const title = settings.title || '';
    const description = settings.description || '';
    const posterSrc = settings.posterSrc || '';
    const showPoster = settings.show_poster !== false;
    const showTitleOverlay = settings.show_title_overlay !== false;

    const renderPoster = () => {
        if (!showPoster) return null;
        return posterSrc ? (
            <div className="fp-audio-poster" style={{ backgroundImage: `url("${posterSrc}")` }}>
                <img src={posterSrc} alt={title} width="100" height="100" />
            </div>
        ) : (
            <div className="fp-audio-poster fp-audio-poster-default">
                <span className="fp-audio-icon">🎵</span>
            </div>
        );
    };

    const renderHeader = () => {
        if (!showTitleOverlay || (!title && !description)) return null;
        return (
            <div className="fp-audio-header">
                {title && <h3 className="fp-audio-title">{title}</h3>}
                {description && <p className="fp-audio-subtitle">{description}</p>}
            </div>
        );
    };

    const renderSecondaryControls = () => (
        <div className="fp-audio-secondary-controls">
            {controls.playback_speed !== false && !useSettingsForSpeedControls && (
                <SpeedMenu placement="top end" tooltipPlacement="top" />
            )}
            {hasChapters && (
                <ChaptersMenu placement="top end" tooltipPlacement="top" />
            )}
            {showStandaloneCaptionShortcut && (
                <CaptionButton tooltipPlacement="top" />
            )}
            {showStandaloneCaptionMenu && (
                <CaptionsMenu />
            )}
            {showSettingsMenuControl && (
                <SettingsMenu settings={settings} placement="top end" tooltipPlacement="top" />
            )}
        </div>
    );

    const renderVolumeGroup = () => (
        <div className="fp-audio-volume-group">
            <MuteButton tooltipPlacement="top" />
            <VolumeSlider />
        </div>
    );

    const renderControls = () => {
        switch (skin) {
            case 'classic':
                return (
                    <>
                        {controls.progress_bar !== false && (
                            <div className="fp-audio-progress-row">
                                <TimeSlider settings={settings} />
                            </div>
                        )}
                        <div className="fp-audio-main-controls">
                            {controls.backward !== false && (
                                <SeekButton type="seek-backward-10" seconds={-10} tooltipPlacement="top start">
                                    <span className="fp-media-play-tooltip-text">Backward 10s</span>
                                </SeekButton>
                            )}
                            {controls.play !== false && <PlayButton tooltipPlacement="top start" />}
                            {controls.forward !== false && (
                                <SeekButton type="seek-forward-10" seconds={10} tooltipPlacement="top start">
                                    <span className="fp-media-play-tooltip-text">Forward 10s</span>
                                </SeekButton>
                            )}
                            {controls.volume !== false && (
                                <>
                                    <MuteButton tooltipPlacement="top" />
                                    <VolumeSlider />
                                </>
                            )}
                            {controls.current_time !== false && <TimeGroup />}
                            <div className="fp-media-controls-spacer"></div>
                            {renderSecondaryControls()}
                        </div>
                    </>
                );

            case 'simple':
                return (
                    <div className="fp-audio-main-controls">
                        {controls.play !== false && <PlayButton tooltipPlacement="top start" />}
                        {controls.volume !== false && renderVolumeGroup()}
                        {controls.progress_bar !== false && <TimeSlider settings={settings} />}
                        {showStandaloneCaptionShortcut && (
                            <CaptionButton tooltipPlacement="top" />
                        )}
                        {showStandaloneCaptionMenu && (
                            <CaptionsMenu />
                        )}
                        {hasChapters && (
                            <ChaptersMenu placement="top end" tooltipPlacement="top" />
                        )}
                    </div>
                );

            case 'standard':
                return (
                    <div className="fp-audio-controls-bar">
                        <div className="fp-standard-progress-row">
                            {controls.current_time !== false && (
                                <media-time class="fp-media-time" type="current"></media-time>
                            )}
                            {controls.progress_bar !== false && <TimeSlider settings={settings} />}
                            {controls.current_time !== false && (
                                <media-time class="fp-media-time" type="duration"></media-time>
                            )}
                        </div>
                        <div className="fp-standard-controls-row">
                            <div className="fp-standard-left-controls">
                                {controls.volume !== false && (
                                    <>
                                        <MuteButton tooltipPlacement="top" />
                                        <VolumeSlider />
                                    </>
                                )}
                            </div>
                            <div className="fp-standard-center-controls">
                                {controls.backward !== false && (
                                    <SeekButton type="seek-backward-10" seconds={-10} tooltipPlacement="top start">
                                        <span className="fp-media-play-tooltip-text">Backward 10s</span>
                                    </SeekButton>
                                )}
                                {controls.play !== false && <PlayButton tooltipPlacement="top start" />}
                                {controls.forward !== false && (
                                    <SeekButton type="seek-forward-10" seconds={10} tooltipPlacement="top start">
                                        <span className="fp-media-play-tooltip-text">Forward 10s</span>
                                    </SeekButton>
                                )}
                            </div>
                            <div className="fp-standard-right-controls">
                                {controls.playback_speed !== false && !useSettingsForSpeedControls && (
                                    <SpeedMenu placement="top end" tooltipPlacement="top" />
                                )}
                                {hasChapters && (
                                    <ChaptersMenu placement="top end" tooltipPlacement="top" />
                                )}
                                {showStandaloneCaptionShortcut && (
                                    <CaptionButton tooltipPlacement="top" />
                                )}
                                {showSettingsMenuControl && (
                                    <SettingsMenu settings={settings} placement="top end" tooltipPlacement="top" />
                                )}
                            </div>
                        </div>
                    </div>
                );

            case 'floating':
                return (
                    <div className="fp-audio-main-controls fp-floating-bar">
                        {controls.backward !== false && (
                            <SeekButton type="seek-backward-10" seconds={-10} tooltipPlacement="top start">
                                <span className="fp-media-play-tooltip-text">Backward 10s</span>
                            </SeekButton>
                        )}
                        {controls.play !== false && <PlayButton tooltipPlacement="top start" />}
                        {controls.forward !== false && (
                            <SeekButton type="seek-forward-10" seconds={10} tooltipPlacement="top start">
                                <span className="fp-media-play-tooltip-text">Forward 10s</span>
                            </SeekButton>
                        )}
                        {controls.current_time !== false && <TimeGroup />}
                        {controls.progress_bar !== false && <TimeSlider settings={settings} />}
                        {controls.volume !== false && renderVolumeGroup()}
                        {renderSecondaryControls()}
                    </div>
                );

            case 'minimal':
                return (
                    <div className="fp-audio-main-controls fp-audio-minimal-controls">
                        <PlayButton tooltipPlacement="top start" />
                    </div>
                );

            case 'modern':
            default:
                return (
                    <div className="fp-audio-main-controls">
                        {controls.backward !== false && (
                            <SeekButton type="seek-backward-10" seconds={-10} tooltipPlacement="top start">
                                <span className="fp-media-play-tooltip-text">Backward 10s</span>
                            </SeekButton>
                        )}
                        {controls.play !== false && <PlayButton tooltipPlacement="top start" />}
                        {controls.forward !== false && (
                            <SeekButton type="seek-forward-10" seconds={10} tooltipPlacement="top start">
                                <span className="fp-media-play-tooltip-text">Forward 10s</span>
                            </SeekButton>
                        )}
                        {controls.current_time !== false && <TimeGroup />}
                        {controls.progress_bar !== false && <TimeSlider settings={settings} />}
                        {controls.volume !== false && renderVolumeGroup()}
                        {renderSecondaryControls()}
                    </div>
                );
        }
    };

    return (
        <media-controls class={`fp-media-controls-bottom fp-skin-audio fp-skin-audio-${skin}`}>
            <media-controls-group class="fp-controls-group">
                <div className={`fp-audio-layout${!showPoster ? ' fp-audio-no-poster' : ''}${!(showTitleOverlay && title) ? ' fp-audio-no-header' : ''}`}>
                    {renderPoster()}
                    <div className="fp-audio-content">
                        {renderHeader()}
                        {renderControls()}
                    </div>
                </div>
            </media-controls-group>
        </media-controls>
    );
};

export default AudioLayout;
