const {__} = wp.i18n;
const {Button, TextControl, SelectControl, BaseControl} = wp.components;
const {MediaUpload, MediaUploadCheck} = wp.blockEditor || wp.editor;
import CustomToggle from '../common/CustomToggle.jsx';
import {DeleteIconSVG, LockIconSVG} from '../common/Icons.jsx';
import CustomRadioGroup from '../common/CustomRadioGroup.jsx';
import UrlInput from '../common/UrlInput.jsx';
import ShortcodeInserter from '../common/ShortcodeInserter.jsx';
import ProModal from '../common/ProModal.jsx';

const {useRef, useState} = wp.element;

const GeneralSettings = ({attributes, setAttributes, mediaData, setMediaData}) => {
    const titleInputRef = useRef(null);
    const [isPlaybackProModalOpen, setIsPlaybackProModalOpen] = useState(false);
    if (!mediaData) return null;

    const hasPro = window.fluentPlayerBlockVars?.hasPro || false;
    const defaultAspectRatio = window.fluentPlayerBlockVars?.defaultSettings?.defaultAspectRatio || 'original';

    const updateMediaSettings = (key, value) => {
        const newSettings = {...mediaData.settings, [key]: value};
        setMediaData({...mediaData, settings: newSettings});
    };

    const removeMediaSetting = (key) => {
        const newSettings = {...mediaData.settings};
        delete newSettings[key];
        setMediaData({...mediaData, settings: newSettings});
    };

    const globalResumeDefault = (() => {
        const v = window.fluentPlayerBlockVars?.defaultSettings?.resume_playback;
        return v === true || v === 'true' || v === 1 || v === '1';
    })();
    const hasOwnResume = Object.prototype.hasOwnProperty.call(mediaData.settings || {}, 'save_play_position');
    const effectiveResume = hasOwnResume ? !!mediaData.settings.save_play_position : globalResumeDefault;

    const onSelectPoster = (media) => {
        updateMediaSettings('posterSrc', media.url);
    };

    const removePoster = () => {
        updateMediaSettings('posterSrc', '');
    };

    const handleAutoplayChange = (value) => {
        const newSettings = {...mediaData.settings};

        if (value === 'none') {
            newSettings.autoplay = false;
            newSettings.mutedAutoplay = false;
        } else if (value === 'autoplay') {
            newSettings.autoplay = true;
            newSettings.mutedAutoplay = false;
        } else if (value === 'muted_autoplay') {
            newSettings.autoplay = false;
            newSettings.mutedAutoplay = true;
        }

        setMediaData({...mediaData, settings: newSettings});
    };

    const getAutoplayMode = () => {
        if (mediaData.settings.mutedAutoplay) return 'muted_autoplay';
        if (mediaData.settings.autoplay) return 'autoplay';
        return 'none';
    };

    const loadStrategyOptions = [
        {
            label: __('On Play Click', 'fluent-player'),
            description: __('Best for page speed - loads when user clicks play', 'fluent-player'),
            value: 'play'
        },
        {
            label: __('On Play Click (skip video in editor)', 'fluent-player'),
            description: __('Frontend loads video when the viewer clicks play. The editor shows only the poster — no video request is made until you preview the post. Use this when your video provider charges per request.', 'fluent-player'),
            value: 'poster'
        },
        {
            label: __('When Scrolled Into View', 'fluent-player'),
            description: __('Balanced - loads when media becomes visible', 'fluent-player'),
            value: 'visible'
        },
        {
            label: __('After Page Loads', 'fluent-player'),
            description: __('Loads after page is interactive', 'fluent-player'),
            value: 'idle'
        },
        {
            label: __('Immediately', 'fluent-player'),
            description: __('Fastest playback - loads with page (impacts page speed)', 'fluent-player'),
            value: 'eager'
        }
    ];

    return (
        <BaseControl>
            <div className="fluent-player-general-settings">
                <div className="fluent-player-form-row">
                    <BaseControl label={__('Title', 'fluent-player')}>
                        <div className="fp-input-with-suffix">
                            <input
                                ref={titleInputRef}
                                type="text"
                                className="fp-input-with-suffix__input"
                                value={mediaData.settings.title || ''}
                                onChange={(e) => updateMediaSettings('title', e.target.value)}
                            />
                            <ShortcodeInserter inputRef={titleInputRef} onInsert={(value) => updateMediaSettings('title', value)} />
                        </div>
                    </BaseControl>
                </div>

                <CustomToggle
                    label={__('Title Overlay', 'fluent-player')}
                    help={mediaData.settings?.viewType === 'audio' ? __('Display audio title on the player', 'fluent-player') : __('Display video title in top-left corner when paused or hovered', 'fluent-player')}
                    checked={mediaData.settings.show_title_overlay !== false}
                    onChange={(value) => updateMediaSettings('show_title_overlay', value)}
                />

                {mediaData.settings?.viewType === 'audio' && (
                    <CustomToggle
                        label={__('Show Thumbnail', 'fluent-player')}
                        help={__('Display album art / thumbnail on the audio player', 'fluent-player')}
                        checked={mediaData.settings.show_poster !== false}
                        onChange={(value) => updateMediaSettings('show_poster', value)}
                    />
                )}

                {(!mediaData.settings?.viewType || mediaData.settings?.viewType !== 'audio' || mediaData.settings?.show_poster !== false) && (
                <div className="fluent-player-form-row">
                    <label className="components-base-control__label">
                        {__('Thumbnail', 'fluent-player')}
                    </label>
                    <MediaUploadCheck>
                        <MediaUpload
                            onSelect={onSelectPoster}
                            allowedTypes={['image']}
                            value={mediaData.settings?.posterSrc}
                            render={({open}) => (
                                <div className={`image-upload-container ${mediaData.settings?.posterSrc ? 'has-image' : ''}`}>
                                    {mediaData.settings?.posterSrc ? (
                                        <>
                                            <div className="image-upload-preview">
                                                <img src={mediaData.settings.posterSrc} alt="" />
                                            </div>
                                            <Button className="image-upload-change-btn fp-btn-secondary" onClick={open}>
                                                {__('Change', 'fluent-player')}
                                            </Button>
                                            <Button
                                                className="fp-delete-button fp-icon-btn fp-icon-btn--danger"
                                                onClick={removePoster}
                                                aria-label={__('Remove thumbnail', 'fluent-player')}
                                            >
                                                <DeleteIconSVG />
                                            </Button>
                                        </>
                                    ) : (
                                        <Button className="fp-btn-primary" onClick={open}>
                                            {__('Upload', 'fluent-player')}
                                        </Button>
                                    )}
                                </div>
                            )}
                        />
                    </MediaUploadCheck>
                </div>
                )}

                <div className="fluent-player-form-row">
                    <SelectControl
                        label={__('Aspect Ratio', 'fluent-player')}
                        value={mediaData.settings.aspectRatio || 'default'}
                        options={[
                            {label: __('Default', 'fluent-player') + (defaultAspectRatio !== 'original' ? ` (${defaultAspectRatio})` : ' (Original)'), value: 'default'},
                            {value: 'original', label: 'Original'},
                            {value: '16:9', label: 'Wide - 16:9'},
                            {value: '4:3', label: 'Standard - 4:3'},
                            {value: '1:1', label: 'Square - 1:1'},
                            {value: '9:16', label: 'Tall - 9:16'},
                            {value: '3:2', label: 'Classic - 3:2'},
                            {value: '2:3', label: 'Classic Portrait - 2:3'}
                        ]}
                        onChange={(value) => updateMediaSettings('aspectRatio', value)}
                    />
                </div>

                <CustomRadioGroup
                    label={__('Load Strategy', 'fluent-player')}
                    options={loadStrategyOptions}
                    selected={mediaData.settings.loadStrategy || 'visible'}
                    onChange={(value) => updateMediaSettings('loadStrategy', value)}
                />

                <div className="fluent-player-form-row">
                    <SelectControl
                        label={__('Autoplay Mode', 'fluent-player')}
                        value={getAutoplayMode()}
                        options={[
                            {label: __('No Autoplay', 'fluent-player'), value: 'none'},
                            {label: __('Autoplay with Sound', 'fluent-player'), value: 'autoplay'},
                            {label: __('Muted Autoplay', 'fluent-player'), value: 'muted_autoplay'},
                        ]}
                        onChange={handleAutoplayChange}
                    />
                </div>

                <CustomToggle
                    label={__('Play Inline on Mobile', 'fluent-player')}
                    help={__('On mobile, videos play inline instead of fullscreen when enabled.', 'fluent-player')}
                    checked={!!mediaData.settings.playsInline}
                    onChange={(value) => updateMediaSettings('playsInline', value)}
                />

                {hasPro ? (
                    <>
                        <CustomToggle
                            label={__('Remember Playback Position', 'fluent-player')}
                            help={hasOwnResume
                                ? __('Overriding the site default for this media.', 'fluent-player')
                                : __('Following the site default. Toggle to override for this media.', 'fluent-player')}
                            checked={effectiveResume}
                            onChange={(value) => updateMediaSettings('save_play_position', value)}
                        />
                        {hasOwnResume && (
                            <Button
                                variant="link"
                                className="fp-reset-to-default"
                                onClick={() => removeMediaSetting('save_play_position')}
                            >
                                {__('Reset to default', 'fluent-player')}
                            </Button>
                        )}
                    </>
                ) : (
                    <div className="components-base-control">
                        <div
                            className="layer-card"
                            style={{ cursor: 'pointer' }}
                            role="button"
                            tabIndex={0}
                            aria-label={__('Remember Playback Position — a Pro feature. Upgrade to enable.', 'fluent-player')}
                            onClick={() => setIsPlaybackProModalOpen(true)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setIsPlaybackProModalOpen(true);
                                }
                            }}
                        >
                            <div className="layer-info">
                                <div className="layer-title-row">
                                    <div className="layer-type-info">
                                        <span className="layer-title">{__('Remember Playback Position', 'fluent-player')}</span>
                                    </div>
                                    <LockIconSVG size={14} />
                                </div>
                            </div>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--fp-text-sub-600, #525866)' }}>
                                {__('Pro feature. Let viewers resume playback from where they left off.', 'fluent-player')}
                            </p>
                        </div>
                        {isPlaybackProModalOpen && (
                            <ProModal
                                onClose={() => setIsPlaybackProModalOpen(false)}
                                feature={__('Remember Playback Position', 'fluent-player')}
                            />
                        )}
                    </div>
                )}

                <div className="fluent-player-form-row">
                    <SelectControl
                        label={__('Video End Screen', 'fluent-player')}
                        value={mediaData.settings.video_end_option || 'default'}
                        options={[
                            {label: __('Show Thumbnail', 'fluent-player'), value: 'default'},
                            {label: __('Loop Video', 'fluent-player'), value: 'loop'},
                        ]}
                        onChange={(value) => updateMediaSettings('video_end_option', value)}
                    />
                </div>
            </div>
        </BaseControl>
    );
};

export default GeneralSettings;
