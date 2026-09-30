const { __ } = wp.i18n;
const { TextControl, SelectControl } = wp.components;
import CustomToggle from '../../../media/components/common/CustomToggle.jsx';
import TagQuerySettings from './TagQuerySettings.jsx';

/**
 * General Settings panel for playlist block
 */
const GeneralSettings = ({
    playlistData,
    updatePlaylistData,
    onTitleChange,
    medias = [],
    sourceType = 'playlist',
    tags = [],
    query = {},
    onTagsChange = () => {},
    onQueryChange = () => {}
}) => {
    const settings = playlistData?.settings || {};
    const behavior = settings.behavior || {};
    const featureMode = settings.feature_mode || 'per_video';
    const featureVideoId = settings.feature_video_id || '';
    const presetSourceMediaId = settings.preset_source_media_id || '';
    const isTags = sourceType === 'tags';
    const layoutType = settings.layout?.type || 'standard';
    const layoutSupportsMenuToggle = layoutType !== 'grid';
    const showNavButtons = behavior.showNavButtons !== false;

    // Playback / player-chrome toggles don't change the authoring canvas (it draws a static
    // poster + list); note that so they don't read as broken in the builder.
    const livePageNote = __('Applies on the live page — not previewed in the editor.', 'fluent-player');
    const withLiveNote = (help) => `${help} ${livePageNote}`;

    const updateBehavior = (key, value) => {
        updatePlaylistData({
            ...playlistData,
            settings: {
                ...settings,
                behavior: {
                    ...behavior,
                    [key]: value
                }
            }
        });
    };

    const updateSetting = (key, value) => {
        updatePlaylistData({
            ...playlistData,
            settings: {
                ...settings,
                [key]: value
            }
        });
    };

    const mediaOptions = [
        { label: __('— Select a video —', 'fluent-player'), value: '' },
        ...medias.map(media => ({
            label: media.post_title || media.settings?.title || `Media #${media.ID}`,
            value: String(media.ID)
        }))
    ];

    const presetSourceOptions = [
        { label: __('First media (default)', 'fluent-player'), value: '' },
        ...medias.map(media => ({
            label: media.post_title || media.settings?.title || `Media #${media.ID}`,
            value: String(media.ID)
        }))
    ];

    return (
        <div className="fluent-player-general-settings">
            {isTags && (
                <TagQuerySettings
                    tags={tags}
                    query={query}
                    onTagsChange={onTagsChange}
                    onQueryChange={onQueryChange}
                />
            )}

            <div className="fluent-player-form-row">
                <TextControl
                    label={__('Playlist Title', 'fluent-player')}
                    value={settings.title || ''}
                    onChange={onTitleChange}
                    placeholder={__('Enter playlist title', 'fluent-player')}
                />
            </div>

            <CustomToggle
                label={__('Autoplay', 'fluent-player')}
                help={withLiveNote(__('Start playing automatically when loaded', 'fluent-player'))}
                checked={behavior.autoplay || false}
                onChange={(value) => updateBehavior('autoplay', value)}
            />

            <CustomToggle
                label={__('Continuous Play', 'fluent-player')}
                help={withLiveNote(__('Auto-advance to next video when current ends', 'fluent-player'))}
                checked={behavior.continuousPlay !== false}
                onChange={(value) => updateBehavior('continuousPlay', value)}
            />

            <CustomToggle
                label={__('Show Previous / Next Buttons', 'fluent-player')}
                help={withLiveNote(__('Display previous and next track buttons in the player chrome.', 'fluent-player'))}
                checked={showNavButtons}
                onChange={(value) => updateBehavior('showNavButtons', value)}
            />

            {showNavButtons && (
                <CustomToggle
                    label={__('Loop Playlist', 'fluent-player')}
                    help={withLiveNote(__('Restart from the first item after the last item, and allow previous from the first item.', 'fluent-player'))}
                    checked={behavior.loop === true}
                    onChange={(value) => updateBehavior('loop', value)}
                />
            )}

            {layoutSupportsMenuToggle && (
                <CustomToggle
                    label={__('Show Playlist Menu Toggle', 'fluent-player')}
                    help={withLiveNote(__('Display a button in the player chrome to show or hide the playlist menu.', 'fluent-player'))}
                    checked={behavior.showPlaylistMenuToggle !== false}
                    onChange={(value) => updateBehavior('showPlaylistMenuToggle', value)}
                />
            )}

            {medias.length > 0 && (
                <div className="fluent-player-form-row">
                    <SelectControl
                        label={__('Preset Source', 'fluent-player')}
                        help={__('The player chrome (skin, controls, brand color) is rendered once per playlist. Pick which media\'s preset to use; defaults to the first media.', 'fluent-player')}
                        value={String(presetSourceMediaId)}
                        options={presetSourceOptions}
                        onChange={(value) => updateSetting('preset_source_media_id', value ? parseInt(value, 10) : '')}
                    />
                </div>
            )}

            <div className="fluent-player-form-row">
                <SelectControl
                    label={__('Overlay Mode', 'fluent-player')}
                    help={featureMode === 'per_video'
                        ? __('Each video shows its own email capture, CTA, and action bar overlays independently.', 'fluent-player')
                        : __('Pick one video and its overlays (email capture, CTA, action bar) will show on every video in the playlist. Saves you from configuring each video separately.', 'fluent-player')
                    }
                    value={featureMode}
                    options={[
                        { label: __('Per Video', 'fluent-player'), value: 'per_video' },
                        { label: __('Single Video', 'fluent-player'), value: 'selected_video' }
                    ]}
                    onChange={(value) => updateSetting('feature_mode', value)}
                />
            </div>

            {featureMode === 'selected_video' && medias.length > 0 && (
                <div className="fluent-player-form-row">
                    <SelectControl
                        label={__('Source Video', 'fluent-player')}
                        help={__('Choose which video\'s overlay settings to use. When any video plays, it will show this video\'s email capture, CTA, and action bar.', 'fluent-player')}
                        value={String(featureVideoId)}
                        options={mediaOptions}
                        onChange={(value) => updateSetting('feature_video_id', value ? parseInt(value, 10) : '')}
                    />
                </div>
            )}
        </div>
    );
};

export default GeneralSettings;
