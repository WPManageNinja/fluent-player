const {__, sprintf} = wp.i18n;
const {Modal, Button} = wp.components;
const {MediaUpload} = wp.blockEditor || wp.editor;
const {useState, useRef, useEffect, useCallback} = wp.element;
import FluentPlayer from '../player/FluentPlayer.jsx';
import MutedPreviewVisual from './MutedPreviewVisual.jsx';
import ProModal from '../common/ProModal.jsx';
import CustomRangeSlider from '../common/CustomRangeSlider.jsx';
import CustomToggle from '../common/CustomToggle.jsx';
import CustomRadioGroup from '../common/CustomRadioGroup.jsx';
import PositionGrid from '../common/PositionGrid.jsx';
import TimeRangeSlider from '../common/TimeRangeSlider.jsx';
import BuilderMediaUploadCheck from '../common/BuilderMediaUploadCheck.jsx';
import ShortcodeInserter from '../common/ShortcodeInserter.jsx';
import {LockIconSVG, DeleteIconSVG} from '../common/Icons.jsx';
import {
    NEAR_END_SECONDS,
    getLoopWindow,
    resolveLoopWindow,
    startPreviewCaptionsGuard,
} from '../../../../js/utils/mutedPreview.js';
import './MutedPreviewStyles.scss';

const toMMSS = (totalSeconds) => {
    const seconds = Math.max(0, Math.round(totalSeconds));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

const hasSubtitles = (settings) => (settings?.subtitles || []).some((track) => track?.url);

const hasLogo = (settings) => (settings?.useCustomBranding
    ? !!settings?.logo
    : !!window.fluentPlayerBlockVars?.defaultSettings?.logoUrl);

/**
 * True when at least one text/button overlay is visible at some point inside
 * the configured preview loop window. An unset end means "to the end of the
 * video", so it is treated as unbounded — the duration may not be known yet.
 */
const hasOverlaysInPreviewRange = (settings) => {
    const overlays = settings?.overlays || [];
    if (!overlays.length) return false;

    const range = settings?.mutedPreviewConfig?.range || {};
    const rangeStart = Math.max(0, parseFloat(range.start) || 0);
    const rangeEndRaw = parseFloat(range.end) || 0;
    const rangeEnd = rangeEndRaw > rangeStart ? rangeEndRaw : Infinity;

    return overlays.some((overlay) => {
        const start = Math.max(0, parseFloat(overlay?.displayTime) || 0);
        const end = start + (parseFloat(overlay?.duration) || 5);
        return start <= rangeEnd && end >= rangeStart;
    });
};

const PRO_SECTIONS = [
    {
        key: 'captions',
        title: __('Preview Captions', 'fluent-player'),
        description: __('Show subtitles while the preview plays silently.', 'fluent-player'),
        isRelevant: hasSubtitles,
    },
    {
        key: 'show_overlays',
        title: __('Show Text & Button Overlays', 'fluent-player'),
        description: __('Display your text & button overlays while the preview plays silently — their links stay clickable.', 'fluent-player'),
        isRelevant: hasOverlaysInPreviewRange,
    },
    {
        key: 'preview_range',
        title: __('Preview Range', 'fluent-player'),
        description: __('Loop only a chosen time range of the video as the preview.', 'fluent-player'),
    },
    {
        key: 'click_behavior',
        title: __('When Clicked', 'fluent-player'),
        description: __('Choose whether sound restarts the video or continues from the preview position.', 'fluent-player'),
    },
    {
        key: 'overlay',
        title: __('Preview Overlay', 'fluent-player'),
        description: __('Add an image or text on top of the preview, with placement and size options.', 'fluent-player'),
    },
];

/**
 * Pro preview options — real controls rendered in place of the locked cards
 * when Pro is active. All values live on the media settings (flat keys the
 * runtime consumes).
 */
const ProPreviewOptions = ({mediaData, setMediaData, duration = 0}) => {
    const overlayTextRef = useRef(null);
    const settings = mediaData?.settings || {};
    const config = settings.mutedPreviewConfig || {};
    const overlay = config.overlay || {};
    const rangeMax = Math.max(1, Math.floor(duration || settings.duration || 300));
    const rangeStart = Math.min(Math.max(0, parseFloat(config.range?.start) || 0), Math.max(0, rangeMax - 1));
    const rangeEndRaw = parseFloat(config.range?.end) || 0;
    const rangeEnd = rangeEndRaw > rangeStart ? Math.min(rangeEndRaw, rangeMax) : rangeMax;

    const updateConfig = (patch) => {
        setMediaData?.({
            ...mediaData,
            settings: {...settings, mutedPreviewConfig: {...config, ...patch}},
        });
    };

    const updateOverlay = (patch) => {
        updateConfig({overlay: {...overlay, ...patch}});
    };

    const updateRange = (key, rawValue) => {
        const value = Math.max(0, parseFloat(rawValue) || 0);
        updateConfig({range: {...(config.range || {}), [key]: value}});
    };

    return (
        <div className="fp-muted-preview-pro-options">
            {hasSubtitles(settings) && (
                <CustomToggle
                    label={__('Preview Captions', 'fluent-player')}
                    help={__('Show subtitles while the preview plays silently.', 'fluent-player')}
                    checked={!!config.captions}
                    onChange={(value) => updateConfig({captions: value})}
                />
            )}

            {hasOverlaysInPreviewRange(settings) && (
                <CustomToggle
                    label={__('Show Text & Button Overlays', 'fluent-player')}
                    help={__('Display your text & button overlays while the preview plays silently. Their links stay clickable.', 'fluent-player')}
                    checked={!!config.showOverlays}
                    onChange={(value) => updateConfig({showOverlays: value})}
                />
            )}

            <div className="fluent-player-form-row">
                <span className="components-base-control__label custom-radio-group-label">
                    {__('Preview Range', 'fluent-player')}
                </span>
                <TimeRangeSlider
                    min={0}
                    max={rangeMax}
                    startValue={rangeStart}
                    endValue={rangeEnd}
                    onStartChange={(value) => updateRange('start', Math.min(value, rangeEnd - 1))}
                    onEndChange={(value) => updateRange('end', Math.max(value, rangeStart + 1))}
                />
                <p className="fp-muted-preview-modal-note" style={{marginTop: '4px'}}>
                    {sprintf(
                        /* translators: 1: range start time, 2: range end time, 3: selected length. */
                        __('Start %1$s · End %2$s · Length %3$s', 'fluent-player'),
                        toMMSS(rangeStart),
                        toMMSS(rangeEnd),
                        toMMSS(rangeEnd - rangeStart)
                    )}
                </p>
            </div>

            <CustomRadioGroup
                className="fp-inline-radio"
                label={__('When Clicked', 'fluent-player')}
                options={[
                    {label: __('Play from start', 'fluent-player'), value: 'restart'},
                    {label: __('Keep watching', 'fluent-player'), value: 'continue'},
                ]}
                selected={config.clickBehavior === 'continue' ? 'continue' : 'restart'}
                onChange={(value) => updateConfig({clickBehavior: value})}
            />

            <div className="fluent-player-form-row">
                <CustomRadioGroup
                    className="fp-inline-radio"
                    label={__('Preview Overlay', 'fluent-player')}
                    options={[
                        {label: __('None', 'fluent-player'), value: ''},
                        {label: __('Image', 'fluent-player'), value: 'image'},
                        {label: __('Text', 'fluent-player'), value: 'text'},
                    ]}
                    selected={overlay.type || ''}
                    onChange={(value) => updateOverlay({type: value})}
                />
            </div>

            {overlay.type === 'image' && (
                <div className="fluent-player-form-row">
                    <label className="components-base-control__label">
                        {__('Overlay Image', 'fluent-player')}
                    </label>
                    <BuilderMediaUploadCheck>
                        <MediaUpload
                            title={__('Select overlay image', 'fluent-player')}
                            allowedTypes={['image']}
                            value={overlay.src}
                            onSelect={(image) => updateOverlay({src: image.url})}
                            render={({open}) => (
                                <div className={`image-upload-container ${overlay.src ? 'has-image' : ''}`}>
                                    {overlay.src ? (
                                        <>
                                            <div className="image-upload-preview">
                                                <img src={overlay.src} alt="" />
                                            </div>
                                            <Button className="image-upload-change-btn fp-btn-secondary" onClick={open}>
                                                {__('Change', 'fluent-player')}
                                            </Button>
                                            <Button
                                                className="fp-delete-button fp-icon-btn fp-icon-btn--danger"
                                                onClick={() => updateOverlay({src: ''})}
                                                aria-label={__('Remove overlay image', 'fluent-player')}
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
                    </BuilderMediaUploadCheck>
                </div>
            )}

            {overlay.type === 'text' && (
                <div className="fluent-player-form-row">
                    <label className="components-base-control__label">
                        {__('Overlay Text', 'fluent-player')}
                    </label>
                    <div className="fp-input-with-suffix">
                        <input
                            ref={overlayTextRef}
                            type="text"
                            className="fp-input-with-suffix__input"
                            value={overlay.text || ''}
                            onChange={(e) => updateOverlay({text: e.target.value})}
                        />
                        <ShortcodeInserter inputRef={overlayTextRef} onInsert={(value) => updateOverlay({text: value})} />
                    </div>
                </div>
            )}

            {((overlay.type === 'image' && overlay.src) || (overlay.type === 'text' && overlay.text)) && (
                <>
                    <PositionGrid
                        label={__('Overlay Position', 'fluent-player')}
                        variant={9}
                        value={overlay.position || 'center'}
                        onChange={(value) => updateOverlay({position: value})}
                    />
                    <div className="fluent-player-form-row">
                        <CustomRangeSlider
                            label={__('Overlay Width', 'fluent-player')}
                            unit="%"
                            value={overlay.width || 40}
                            min={5}
                            max={100}
                            step={5}
                            onChange={(value) => updateOverlay({width: value})}
                        />
                    </div>
                    <div className="fluent-player-form-row">
                        <CustomRangeSlider
                            label={__('Overlay Opacity', 'fluent-player')}
                            unit="%"
                            value={overlay.opacity ?? 100}
                            min={10}
                            max={100}
                            step={5}
                            onChange={(value) => updateOverlay({opacity: value})}
                        />
                    </div>
                </>
            )}

        </div>
    );
};

/**
 * Muted preview configuration modal. The player on the left IS the preview —
 * it enters the real muted-preview state as soon as it can play (silent loop,
 * hidden controls, play button overlay). Clicking it converts exactly like the
 * frontend (sound from the beginning); Restart Preview re-enters the state.
 */
const MutedPreviewConfigModal = ({isOpen, onClose, mediaData, setMediaData, presets = []}) => {
    const hasPro = window.fluentPlayerBlockVars?.hasPro || false;
    const [previewing, setPreviewing] = useState(false);
    const [duration, setDuration] = useState(0);
    const [proModalFeature, setProModalFeature] = useState(null);
    const previewWrapRef = useRef(null);
    const previewingRef = useRef(false);
    previewingRef.current = previewing;

    const previewSettings = (() => {
        let settings = {...(mediaData?.settings || {})};
        const preset = presets.find((p) => p.slug === settings.preset_slug);
        if (preset?.settings) {
            settings = {...settings, ...preset.settings};
        }
        return {...settings, autoplay: false, mutedAutoplay: false, mutedPreview: false};
    })();

    const getPlayerEl = useCallback(
        () => previewWrapRef.current?.querySelector('media-player'),
        []
    );

    const loopWindowRef = useRef({start: 0, end: 0});
    loopWindowRef.current = getLoopWindow(mediaData?.settings);

    const muteGuardRef = useRef(null);

    const detachMuteGuard = useCallback(() => {
        const playerEl = getPlayerEl();
        if (playerEl && muteGuardRef.current) {
            playerEl.removeEventListener('playing', muteGuardRef.current);
            playerEl.removeEventListener('volume-change', muteGuardRef.current);
        }
        muteGuardRef.current = null;
    }, [getPlayerEl]);

    const enterPreview = useCallback(() => {
        const playerEl = getPlayerEl();
        if (!playerEl) return;

        const apply = () => {
            playerEl.muted = true;
            playerEl.currentTime = loopWindowRef.current.start;
            playerEl.play?.()?.catch?.(() => {});
        };

        // Pre-upgrade property sets on the custom element are silently lost.
        if (playerEl.hasAttribute('data-can-play')) {
            apply();
        } else {
            playerEl.addEventListener('can-play', apply, {once: true});
            playerEl.startLoading?.();
        }

        detachMuteGuard();
        const guard = () => {
            if (previewingRef.current && !playerEl.muted) {
                playerEl.muted = true;
            }
        };
        muteGuardRef.current = guard;
        playerEl.addEventListener('playing', guard);
        playerEl.addEventListener('volume-change', guard);

        setPreviewing(true);
    }, [getPlayerEl, detachMuteGuard]);

    const convert = () => {
        const playerEl = getPlayerEl();
        if (!playerEl) return;
        setPreviewing(false);
        detachMuteGuard();
        if (mediaData?.settings?.mutedPreviewConfig?.clickBehavior !== 'continue') {
            playerEl.currentTime = 0;
        }
        const volume = mediaData?.settings?.mutedPreviewConfig?.volume ?? 100;
        playerEl.volume = Math.min(100, Math.max(10, volume)) / 100;
        playerEl.muted = false;
        playerEl.play?.()?.catch?.(() => {});
    };

    const resetPlayer = useCallback(() => {
        const playerEl = getPlayerEl();
        setPreviewing(false);
        detachMuteGuard();
        if (playerEl) {
            playerEl.pause?.();
            playerEl.currentTime = 0;
            playerEl.muted = false;
        }
    }, [getPlayerEl, detachMuteGuard]);

    useEffect(() => {
        if (!isOpen || proModalFeature) return;
        const interval = setInterval(() => {
            const playerEl = getPlayerEl();
            if (playerEl && typeof playerEl.startLoading === 'function') {
                clearInterval(interval);

                const wrap = previewWrapRef.current;
                if (wrap) {
                    ['--media-brand', '--media-play-bg', '--media-play-color', '--fp-control-bar-bg'].forEach((varName) => {
                        const value = playerEl.style.getPropertyValue(varName);
                        if (value) wrap.style.setProperty(varName, value);
                    });
                }

                const syncDuration = () => {
                    if (playerEl.duration) setDuration(playerEl.duration);
                };
                playerEl.addEventListener('duration-change', syncDuration);
                playerEl.addEventListener('can-play', syncDuration);
                syncDuration();

                enterPreview();
            }
        }, 100);
        return () => clearInterval(interval);
    }, [isOpen, proModalFeature, getPlayerEl, enterPreview]);

    useEffect(() => {
        if (!isOpen || !previewing) return;
        const playerEl = getPlayerEl();
        if (!playerEl) return;
        const loopHandler = () => {
            const duration = playerEl.duration;
            if (!duration) return;
            const {start, end} = resolveLoopWindow(loopWindowRef.current, duration);
            if (playerEl.currentTime >= end - NEAR_END_SECONDS || playerEl.currentTime < start - NEAR_END_SECONDS) {
                playerEl.currentTime = start;
            }
        };
        playerEl.addEventListener('time-update', loopHandler);
        return () => playerEl.removeEventListener('time-update', loopHandler);
    }, [isOpen, previewing, getPlayerEl]);

    useEffect(() => {
        if (!isOpen && previewingRef.current) {
            resetPlayer();
        }
    }, [isOpen, resetPlayer]);

    const captionsWanted = !!mediaData?.settings?.mutedPreviewConfig?.captions;
    useEffect(() => {
        if (!isOpen || !previewing) return;
        const playerEl = getPlayerEl();
        if (!playerEl) return;
        let stopped = false;
        const restoreCaptions = startPreviewCaptionsGuard(playerEl, captionsWanted, () => stopped);
        return () => {
            stopped = true;
            restoreCaptions();
        };
    }, [isOpen, previewing, captionsWanted, getPlayerEl]);

    const showLogo = mediaData?.settings?.mutedPreviewConfig?.showLogo ?? true;
    useEffect(() => {
        if (!isOpen) return;
        let attempts = 0;
        const applyLogoState = () => {
            const logo = previewWrapRef.current?.querySelector('.fp-media-logo-overlay');
            if (!logo) {
                if (attempts++ < 40) return;
                clearInterval(interval);
                return;
            }
            logo.style.setProperty('display', (previewing && !showLogo) ? 'none' : 'block', 'important');
            clearInterval(interval);
        };
        const interval = setInterval(applyLogoState, 150);
        applyLogoState();
        return () => clearInterval(interval);
    }, [isOpen, previewing, showLogo]);

    if (!isOpen) return null;

    if (proModalFeature) {
        return (
            <ProModal
                onClose={() => setProModalFeature(null)}
                feature={proModalFeature}
            />
        );
    }

    return (
        <>
            <Modal
                title={__('Muted Preview', 'fluent-player')}
                onRequestClose={() => {
                    resetPlayer();
                    onClose();
                }}
                className="fluent-player-block-modal fp-muted-preview-modal"
            >
                <div className="fluent-player-block-content" style={{'--media-brand': mediaData?.settings?.brandingColor || '#DD1F13'}}>
                    <div className="fluent-player-form-layout">
                        <div className="fluent-player-preview-section">
                            <div
                                ref={previewWrapRef}
                                className={`fluent-player-preview-player${previewing ? ' fp-muted-preview-testing' : ''}${previewing && !mediaData?.settings?.mutedPreviewConfig?.showOverlays ? ' fp-mp-hide-overlays' : ''}`}
                            >
                                <FluentPlayer
                                    mediaData={previewSettings}
                                    isPresetPreview={true}
                                    revealOnSeek={true}
                                />
                                {previewing && <MutedPreviewVisual onClick={convert} showIcon={!previewSettings?.behaviors?.hide_center_controls} />}
                                {previewing && hasPro && (() => {
                                    const overlay = mediaData?.settings?.mutedPreviewConfig?.overlay || {};
                                    const showImage = overlay.type === 'image' && overlay.src;
                                    const showText = overlay.type === 'text' && overlay.text;
                                    if (!showImage && !showText) return null;
                                    return (
                                        <span
                                            className={`fp-mp-overlay fp-mp-pos-${overlay.position || 'center'}`}
                                            style={{
                                                width: `${Math.min(100, Math.max(5, overlay.width || 40))}%`,
                                                opacity: Math.min(100, Math.max(10, overlay.opacity ?? 100)) / 100,
                                            }}
                                            aria-hidden="true"
                                        >
                                            {showImage
                                                ? <img src={overlay.src} alt="" />
                                                : <span className="fp-mp-overlay-text">{overlay.text}</span>}
                                        </span>
                                    );
                                })()}
                            </div>
                            {!previewing && (
                                <div className="fp-muted-preview-modal-test">
                                    <Button className="fp-btn-secondary" onClick={enterPreview}>
                                        {__('Restart Preview', 'fluent-player')}
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="fluent-player-settings-section">
                            <p className="fp-muted-preview-modal-note">
                                {__('Muted Preview loops your video silently until a visitor clicks, then plays it with sound. Logo, captions and overlays mirror your settings here; layers, email capture and CTAs start after the click. Not applied inside playlists.', 'fluent-player')}
                            </p>

                            <div className="fluent-player-form-row">
                                <CustomRangeSlider
                                    label={__('Volume After Click', 'fluent-player')}
                                    helpText={__('Playback volume when the viewer clicks for sound.', 'fluent-player')}
                                    unit="%"
                                    value={mediaData?.settings?.mutedPreviewConfig?.volume ?? 100}
                                    min={10}
                                    max={100}
                                    step={5}
                                    onChange={(value) => {
                                        setMediaData?.({
                                            ...mediaData,
                                            settings: {...mediaData.settings, mutedPreviewConfig: {...(mediaData.settings.mutedPreviewConfig || {}), volume: value}},
                                        });
                                        const playerEl = getPlayerEl();
                                        if (playerEl && !previewingRef.current && !playerEl.muted) {
                                            playerEl.volume = value / 100;
                                        }
                                    }}
                                />
                            </div>

                            {hasLogo(mediaData?.settings) && (
                                <CustomToggle
                                    label={__('Show Logo During Preview', 'fluent-player')}
                                    help={__('Keep your player logo visible while the preview plays silently. Its link stays clickable.', 'fluent-player')}
                                    checked={mediaData?.settings?.mutedPreviewConfig?.showLogo ?? true}
                                    onChange={(value) => {
                                        setMediaData?.({
                                            ...mediaData,
                                            settings: {...mediaData.settings, mutedPreviewConfig: {...(mediaData.settings.mutedPreviewConfig || {}), showLogo: value}},
                                        });
                                    }}
                                />
                            )}

                            {hasPro ? (
                                <ProPreviewOptions mediaData={mediaData} setMediaData={setMediaData} duration={duration} />
                            ) : (
                            <div className="fp-muted-preview-pro-cards">
                                {PRO_SECTIONS.filter((section) => !section.isRelevant || section.isRelevant(mediaData?.settings)).map((section) => (
                                    <div
                                        key={section.key}
                                        className="layer-card"
                                        {...(!hasPro ? {
                                            style: {cursor: 'pointer'},
                                            role: 'button',
                                            tabIndex: 0,
                                            'aria-label': section.title + ' — ' + __('a Pro feature. Upgrade to enable.', 'fluent-player'),
                                            onClick: () => {
                                                resetPlayer();
                                                setProModalFeature(section.title);
                                            },
                                            onKeyDown: (e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    resetPlayer();
                                                    setProModalFeature(section.title);
                                                }
                                            },
                                        } : {})}
                                    >
                                        <div className="layer-info">
                                            <div className="layer-title-row">
                                                <div className="layer-type-info">
                                                    <span className="layer-title">{section.title}</span>
                                                </div>
                                                {!hasPro && <LockIconSVG size={14} />}
                                            </div>
                                        </div>
                                        <p style={{margin: 0, fontSize: '13px', color: 'var(--fp-text-sub-600, #525866)'}}>
                                            {section.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            )}

                            <div className="form-actions">
                                <Button
                                    className="fp-btn-primary"
                                    onClick={() => {
                                        resetPlayer();
                                        onClose();
                                    }}
                                >
                                    {__('Done', 'fluent-player')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default MutedPreviewConfigModal;
