/**
 * BottomControls component for Fluent Player
 * Based on player/bottom-controls.php
 */

// Import the necessary components with correct paths
import PlayButton from './buttons/PlayButton';
import MuteButton from './buttons/MuteButton';
import VolumeSlider from './sliders/VolumeSlider';
import TimeGroup from './TimeGroup';
import CaptionButton from './buttons/CaptionButton';
import ChaptersMenu from './menus/ChaptersMenu';
import SpeedMenu from './menus/SpeedMenu.jsx';
import SettingsMenu from './menus/SettingsMenu.jsx';
import CaptionsMenu from './menus/CaptionsMenu.jsx';
import PIPButton from './buttons/PipButton';
import FullscreenButton from './buttons/FullscreenButton';
import TimeSlider from './sliders/TimeSlider';
import SeekButton from './buttons/SeekButton';

const BottomControls = ({ settings, skin: skinProp }) => {
    const skin = skinProp || settings.skin || 'modern';
    const hasChapter = settings.chapters && settings.chapters.length > 0;
    const src = settings.src || '';
    const provider = settings.provider || '';
    const hasHls = provider === 'bunny' || provider === 'mux' || provider === 'mux_stream' || src.includes('.m3u8');
    const subtitles = settings.subtitles || [];
    const hasSubtitles = subtitles.length > 0;
    const subtitleCount = subtitles.length;
    const hasCaptionSource = hasSubtitles || hasHls;
    const showSettingsMenu = settings.controls?.settings !== false;
    const presetSlug = settings.preset_slug || settings.slug || '';
    const isReservedPreset = ['default', 'course', 'simple', 'minimal', 'standard', 'floating', 'ambient'].includes(presetSlug);
    const isSimpleReservedPreset = presetSlug === 'simple';
    const isSimpleSkin = skin === 'simple';
    const useSettingsForSpeedControls = isReservedPreset && showSettingsMenu;
    const showSettingsMenuControl = showSettingsMenu && (!isSimpleSkin || (isSimpleReservedPreset && hasCaptionSource));
    const showStandaloneCaptionMenu = !isReservedPreset && !showSettingsMenuControl && settings.controls?.captions_toggle !== false && !settings._hideCaptions && hasCaptionSource && (hasHls || subtitleCount > 1);
    const showStandaloneCaptionShortcut = settings.controls?.captions_toggle !== false && !settings._hideCaptions && hasCaptionSource && (!isSimpleReservedPreset || !showSettingsMenuControl);

    if (skin === 'classic') {
        return (
            <media-controls class="fp-media-controls-bottom fp-skin-classic">
                <div className="fp-media-controls-spacer"></div>

                {settings.controls?.progress_bar && (
                    <media-controls-group class="fp-controls-group">
                        <TimeSlider settings={settings} />
                    </media-controls-group>
                )}

                <media-controls-group class="fp-controls-group">
                    { settings.controls?.backward && <SeekButton type="seek-backward-10" seconds={ -10 }/> }
                    { settings.controls?.play && <PlayButton/> }
                    { settings.controls?.forward && <SeekButton type="seek-forward-10" seconds={ 10 }/> }
                    { settings.controls?.volume && <MuteButton/> }
                    { settings.controls?.volume && <VolumeSlider/> }
                    { settings.controls?.current_time && <TimeGroup/> }
                    <div className="fp-media-controls-spacer"></div>
                    {showStandaloneCaptionShortcut && <CaptionButton/>}
                    {showStandaloneCaptionMenu && <CaptionsMenu />}
                    {settings.controls?.playback_speed && !useSettingsForSpeedControls && <SpeedMenu />}
                    {showSettingsMenuControl && <SettingsMenu settings={settings} />}
                    { settings.controls?.chapters && hasChapter && <ChaptersMenu /> }
                    { settings.controls?.pip && <PIPButton /> }
                    { settings.controls?.fullscreen && <FullscreenButton /> }
                </media-controls-group>
            </media-controls>
        );
    } else if (skin === 'modern') {
        return (
            <media-controls class="fp-media-controls-bottom fp-skin-modern">
                <div className="fp-media-controls-spacer"></div>
                <media-controls-group class="fp-controls-group">
                    {settings.controls?.backward && <SeekButton type="seek-backward-10" seconds={-10} />}
                    {settings.controls?.play && <PlayButton />}
                    {settings.controls?.forward && <SeekButton type="seek-forward-10" seconds={10} />}
                    {settings.controls?.volume && <MuteButton />}
                    {settings.controls?.volume && <VolumeSlider />}
                    {settings.controls?.current_time && <TimeGroup />}
                    {settings.controls?.progress_bar && <TimeSlider settings={settings} />}

                    {showStandaloneCaptionShortcut && <CaptionButton />}
                    {showStandaloneCaptionMenu && <CaptionsMenu />}
                    {settings.controls?.playback_speed && !useSettingsForSpeedControls && <SpeedMenu />}
                    {showSettingsMenuControl && <SettingsMenu settings={settings} />}
                    {settings.controls?.chapters && hasChapter && <ChaptersMenu />}
                    {settings.controls?.pip && <PIPButton />}
                    {settings.controls?.fullscreen && <FullscreenButton />}
                </media-controls-group>
            </media-controls>
        );
    } else if (skin === 'floating') {
        return (
            <media-controls class="fp-media-controls-bottom fp-skin-floating">
                <div className="fp-media-controls-spacer"></div>
                <media-controls-group class="fp-controls-group fp-floating-bar">
                    {settings.controls?.backward && <SeekButton type="seek-backward-10" seconds={-10} />}
                    {settings.controls?.play && <PlayButton />}
                    {settings.controls?.forward && <SeekButton type="seek-forward-10" seconds={10} />}
                    {settings.controls?.current_time && <TimeGroup />}
                    {settings.controls?.progress_bar && <TimeSlider settings={settings} />}
                    {settings.controls?.volume && (
                        <>
                            <MuteButton />
                            <VolumeSlider />
                        </>
                    )}
                    {settings.controls?.playback_speed && !useSettingsForSpeedControls && <SpeedMenu />}
                    {showSettingsMenuControl && <SettingsMenu settings={settings} />}
                    {showStandaloneCaptionShortcut && <CaptionButton />}
                    {showStandaloneCaptionMenu && <CaptionsMenu />}
                    {settings.controls?.chapters && hasChapter && <ChaptersMenu />}
                    {settings.controls?.pip && <PIPButton />}
                    {settings.controls?.fullscreen && <FullscreenButton />}
                </media-controls-group>
            </media-controls>
        );
    } else if (skin === 'simple') {
        return (
            <media-controls class="fp-media-controls-bottom fp-skin-simple">
                <div className="fp-media-controls-spacer"></div>
                <media-controls-group class="fp-controls-group">
                    {settings.controls?.play && <PlayButton />}
                    {settings.controls?.volume && <MuteButton />}
                    {settings.controls?.volume && <VolumeSlider />}
                    <TimeSlider settings={settings} />
                    {showStandaloneCaptionShortcut && <CaptionButton />}
                    {showStandaloneCaptionMenu && <CaptionsMenu />}
                    {showSettingsMenuControl && <SettingsMenu settings={settings} />}
                    {settings.controls?.chapters && hasChapter && <ChaptersMenu />}
                    {settings.controls?.pip && <PIPButton />}
                    {settings.controls?.fullscreen && <FullscreenButton />}
                </media-controls-group>
            </media-controls>
        );
    } else if (skin === 'standard') {
        return (
            <media-controls class="fp-media-controls-bottom fp-skin-standard">
                <div className="fp-media-controls-spacer"></div>
                <media-controls-group class="fp-controls-group">
                    {/* Progress Row */}
                    <div className="fp-standard-progress-row">
                        {settings.controls?.current_time && <media-time class="fp-media-time" type="current"></media-time>}
                        {settings.controls?.progress_bar && <TimeSlider settings={settings} />}
                        {settings.controls?.current_time && <media-time class="fp-media-time" type="duration"></media-time>}
                    </div>

                    {/* Controls Row */}
                    <div className="fp-standard-controls-row">
                        {/* Left Controls (Volume) */}
                        <div className="fp-standard-left-controls">
                            {settings.controls?.volume && <MuteButton />}
                            {settings.controls?.volume && <VolumeSlider />}
                        </div>

                        {/* Center Controls (Playback) */}
                        <div className="fp-standard-center-controls">
                            {settings.controls?.backward && <SeekButton type="seek-backward" seconds={-9999999} tooltip="Skip to Start" />}
                            {settings.controls?.backward && <SeekButton type="seek-backward-10" seconds={-10} />}
                            {settings.controls?.play && <PlayButton />}
                            {settings.controls?.forward && <SeekButton type="seek-forward-10" seconds={10} />}
                            {settings.controls?.forward && <SeekButton type="seek-forward" seconds={9999999} tooltip="Skip to End" />}
                        </div>

                        {/* Right Controls (Utility) */}
                        <div className="fp-standard-right-controls">
                            {showStandaloneCaptionShortcut && <CaptionButton />}
                            {showStandaloneCaptionMenu && <CaptionsMenu />}
                            {settings.controls?.playback_speed && !useSettingsForSpeedControls && <SpeedMenu />}
                            {showSettingsMenuControl && <SettingsMenu settings={settings} />}
                            {settings.controls?.chapters && hasChapter && <ChaptersMenu />}
                            {settings.controls?.pip && <PIPButton />}
                            {settings.controls?.fullscreen && <FullscreenButton />}
                        </div>
                    </div>
                </media-controls-group>
            </media-controls>
        );
    } else if (skin === 'minimal') {
        return (
            <media-controls class="fp-media-controls-bottom fp-skin-minimal">
                <div className="fp-media-controls-spacer"></div>
            </media-controls>
        );
    }

    // Default fallback to modern skin
    return (
        <media-controls class="fp-media-controls-bottom fp-skin-modern">
            <div className="fp-media-controls-spacer"></div>
            <media-controls-group class="fp-controls-group">
                {settings.controls?.backward && <SeekButton type="seek-backward-10" seconds={-10} />}
                {settings.controls?.play && <PlayButton />}
                {settings.controls?.forward && <SeekButton type="seek-forward-10" seconds={10} />}
                {settings.controls?.volume && <MuteButton />}
                {settings.controls?.volume && <VolumeSlider />}
                {settings.controls?.current_time && <TimeGroup />}
                {settings.controls?.progress_bar && <TimeSlider settings={settings} />}
                {showStandaloneCaptionShortcut && <CaptionButton />}
                {showStandaloneCaptionMenu && <CaptionsMenu />}
                {settings.controls?.playback_speed && !useSettingsForSpeedControls && <SpeedMenu />}
                {showSettingsMenuControl && <SettingsMenu settings={settings} />}
                {settings.controls?.chapters && hasChapter && <ChaptersMenu />}
                {settings.controls?.pip && <PIPButton />}
                {settings.controls?.fullscreen && <FullscreenButton />}
            </media-controls-group>
        </media-controls>
    );
};

export default BottomControls;
