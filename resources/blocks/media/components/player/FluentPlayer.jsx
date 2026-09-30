/**
 * Fluent Player React Component
 * Based on the Vue CssPlayer component
 */

import 'vidstack/player/styles/base.css';
import 'vidstack/player';
import 'vidstack/player/ui';
import '@icons'; // Custom icon loader - only imports icons we actually use
import { isFluentCommunityEditor } from '@share/helper.js';
import VideoLayout from './VideoLayout';
import ChapterStrip from './ChapterStrip';
import CenterControls from './CenterControls';
import VideoErrorOverlay from '../common/VideoErrorOverlay';
import { resolveCrossOrigin } from './crossOrigin.js';
import { isAudioMediaData, applyBunnyStreamToken } from '../../../../js/utils/videoSrc.js';
import { createMediaErrorGuard } from './mediaErrorGuard.js';
import '../PresetStyles.scss';

const {useRef, useEffect, useState, useCallback, useMemo} = wp.element;
const {__} = wp.i18n;

/** Append Mux playback JWT to stream/image URLs when saved media includes a token (editor preview). */
function appendMuxTokenToUrl(url, token) {
    if (!url || !token) return url;
    const s = String(url);
    if (s.includes('token=')) return url;
    const sep = s.includes('?') ? '&' : '?';
    return s + sep + 'token=' + encodeURIComponent(token);
}

function getMuxPlaybackTokenFromMedia(mediaData) {
    const policy =
        mediaData?.mux?.playback_policy ||
        mediaData?.settings?.mux?.playback_policy ||
        '';
    // Public assets must not send a stale signed JWT (breaks playback).
    if (policy === 'public') {
        return '';
    }
    const raw = mediaData?.mux?.playback_token || mediaData?.settings?.mux?.playback_token;
    if (typeof raw !== 'string') return '';
    const t = raw.trim();
    return t || '';
}

function getEditorPosterCandidate(mediaData) {
    return mediaData?.posterSrc || mediaData?.settings?.posterSrc || '';
}

const FluentPlayer = ({ mediaData, updateMediaSettings, isPresetPreview = false, presetData, onPlayerReady, revealOnSeek = false, showChapterStrip = false }) => {
    const [currentTime, setCurrentTime] = useState(0);
    const [posterDismissed, setPosterDismissed] = useState(false);
    const [brandingColor, setBrandingColor] = useState('');
    const [controlBarColor, setControlBarColor] = useState('');
    const [playButtonColor, setPlayButtonColor] = useState('');
    const [playButtonBgColor, setPlayButtonBgColor] = useState('');
    const playerRef = useRef(null);
    const onPlayerReadyCalled = useRef(false);
    const [trackKey, setTrackKey] = useState(0);
    const savedLoadStrategy = mediaData?.loadStrategy || mediaData?.settings?.loadStrategy || 'visible';
    // Bunny Stream CDN token, signed server-side by BunnyCDNService::filterPlayerSettings()
    // and returned through MediaController so the editor preview can play protected videos.
    const bunnyTokenQuery = mediaData?.bunny_token_query || mediaData?.settings?.bunny_token_query || '';
    const isPosterOnlyPreview = !isPresetPreview && savedLoadStrategy === 'poster';
    const loadStrategy = 'idle';
    const behaviors = mediaData?.settings?.behaviors || mediaData?.behaviors || {};
    // For load="play": start with loader hidden (poster + controls visible)
    // For other strategies: start with loader visible
    const [isLoading, setIsLoading] = useState(loadStrategy !== 'play');
    const [videoError, setVideoError] = useState(null);
    const [ytCover, setYtCover] = useState(false);
    const blockVars = window.fluentPlayerBlockVars || {};
    const defaultPreload = blockVars.defaultSettings?.preload || 'metadata';
    const preload = ['none', 'metadata', 'auto'].includes(mediaData?.preload)
        ? mediaData.preload
        : (['none', 'metadata', 'auto'].includes(defaultPreload) ? defaultPreload : 'metadata');

    // Update branding color and control bar color when settings change
    useEffect(() => {
        const useCustomBranding = mediaData?.useCustomBranding;

        // Brand color: if custom branding ON use media's own color (fallback to default, not global), otherwise use global
        const brandColor = useCustomBranding
            ? (mediaData?.brandingColor || '#DD1F13')
            : (blockVars.defaultSettings?.brandColor || '#DD1F13');
        setBrandingColor(brandColor);

        // Control bar color: if custom branding ON use only the media's own color (empty = CSS default), otherwise use global
        const controlBarColorValue = useCustomBranding
            ? (mediaData?.controlBarColor || '')
            : (blockVars.defaultSettings?.controlBarColor || '');
        setControlBarColor(controlBarColorValue);

        // Play button colour + bg: if custom branding ON use the media's own colours
        // (empty = CSS default), otherwise use global — same precedence as above.
        setPlayButtonColor(useCustomBranding
            ? (mediaData?.playButtonColor || '')
            : (blockVars.defaultSettings?.playButtonColor || ''));
        setPlayButtonBgColor(useCustomBranding
            ? (mediaData?.playButtonBgColor || '')
            : (blockVars.defaultSettings?.playButtonBgColor || ''));
    }, [
        mediaData?.useCustomBranding,
        mediaData?.brandingColor,
        mediaData?.controlBarColor,
        mediaData?.playButtonColor,
        mediaData?.playButtonBgColor,
    ]);

    const formatVTTTime = (seconds) => {
        const date = new Date(seconds * 1000);
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const secs = date.getUTCSeconds().toString().padStart(2, '0');
        const ms = date.getUTCMilliseconds().toString().padStart(3, '0');
        return `${hours}:${minutes}:${secs}.${ms}`;
    };

    // Generate chapters VTT content
    const generateChaptersVTT = () => {
        if (!mediaData.chapters || !mediaData.chapters.length) return null;

        let vtt = 'WEBVTT\nKind: chapters\nLanguage: en\n\n';
        mediaData.chapters.forEach((chapter) => {
            vtt += `${formatVTTTime(chapter.startTime)} --> ${formatVTTTime(chapter.endTime)}\n`;
            vtt += `${chapter.title}\n\n`;
        });

        // btoa mangles non-Latin-1; encode to UTF-8 bytes first
        let binary = '';
        new TextEncoder().encode(vtt).forEach((byte) => { binary += String.fromCharCode(byte); });

        return 'data:text/vtt;base64,' + btoa(binary);
    };

    // Compute aspect ratio
    const getAspectRatio = () => {
        if (!mediaData.aspectRatio || mediaData.aspectRatio === 'default') {
            const defaultAspectRatio = blockVars.defaultSettings?.defaultAspectRatio || 'original';
            if (defaultAspectRatio === 'original') {
                return false;
            }
            // Convert format from '16:9' to '16 / 9'
            return defaultAspectRatio.replace(':', ' / ');
        } else if (mediaData.aspectRatio === 'original') {
            return false; // Original aspect ratio @todo important skip aspect ratio style when its false
        } else {
            // Convert format from '16:9' to '16 / 9'
            return mediaData.aspectRatio?.replace(':', ' / ') || '16 / 9';
        }
    };

    const muxPlaybackToken = useMemo(
        () => getMuxPlaybackTokenFromMedia(mediaData),
        [
            mediaData?.mux?.playback_token,
            mediaData?.mux?.playback_policy,
            mediaData?.settings?.mux?.playback_token,
            mediaData?.settings?.mux?.playback_policy,
        ]
    );

    const baseSrc = useMemo(() => {
        let src = mediaData.provider === 'wordpress' ? (mediaData.url || mediaData.src) : mediaData.src;
        if (!muxPlaybackToken) return src;
        const useToken =
            mediaData.provider === 'mux' ||
            mediaData.provider === 'mux_stream' ||
            (src && String(src).includes('stream.mux.com'));
        if (useToken) return appendMuxTokenToUrl(src, muxPlaybackToken);
        return src;
    }, [mediaData.provider, mediaData.url, mediaData.src, muxPlaybackToken]);

    // Cloudflare R2 is public-only: the stored src is the public-URL delivery
    // address, used directly here just like any other provider.
    const videoSrc = baseSrc;

    const shouldUseCrossOrigin = useMemo(
        () => resolveCrossOrigin(mediaData, videoSrc),
        [mediaData?.crossorigin, mediaData?.provider, videoSrc]
    );

    const posterSrcWithToken = useMemo(() => {
        const p = getEditorPosterCandidate(mediaData);
        if (!muxPlaybackToken || !p || !String(p).includes('image.mux.com')) return p;
        return appendMuxTokenToUrl(p, muxPlaybackToken);
    }, [mediaData?.posterSrc, mediaData?.settings?.posterSrc, muxPlaybackToken]);

    const thumbnailsWithToken = useMemo(() => {
        const th = mediaData.thumbnails ?? mediaData.settings?.thumbnails;
        if (!muxPlaybackToken || !th || !String(th).includes('image.mux.com')) return th;
        return appendMuxTokenToUrl(th, muxPlaybackToken);
    }, [mediaData.thumbnails, mediaData.settings?.thumbnails, muxPlaybackToken]);

    const subtitlesWithToken = useMemo(() => {
        const subs = (mediaData.subtitles ?? mediaData.settings?.subtitles ?? []).filter(
            (sub) => sub && typeof sub.url === 'string' && sub.url.trim() !== ''
        );
        if (!muxPlaybackToken) return subs;
        return subs.map((sub) => {
            const u = sub.url;
            if (!u || !String(u).includes('stream.mux.com') || String(u).includes('token=')) {
                return sub;
            }
            return { ...sub, url: appendMuxTokenToUrl(u, muxPlaybackToken) };
        });
    }, [mediaData.subtitles, mediaData.settings?.subtitles, muxPlaybackToken]);

    useEffect(() => {
        setTrackKey((prevKey) => prevKey + 1);
    }, [mediaData.chapters]);

    useEffect(() => {
        const player = playerRef.current;
        if (!player) return;

        const provider = player.querySelector('media-provider');
        if (!provider) return;

        const existingTracks = provider.querySelectorAll('track[kind="subtitles"], track[kind="captions"]');
        existingTracks.forEach((track) => track.remove());

        if (!subtitlesWithToken.length) {
            return;
        }

        const hasExplicitDefault = subtitlesWithToken.some((sub) => sub?.is_default === true);

        subtitlesWithToken.forEach((sub, idx) => {
            const track = document.createElement('track');
            track.kind = 'subtitles';
            track.label = sub.label || sub.language || `Subtitle ${idx + 1}`;
            track.src = sub.url;
            track.srclang = sub.language || 'en';
            track.setAttribute('type', sub.url?.toLowerCase().endsWith('.srt') ? 'srt' : 'vtt');

            if (sub.is_default === true || (!hasExplicitDefault && idx === 0)) {
                track.default = true;
            }

            provider.appendChild(track);
        });
    }, [subtitlesWithToken]);

    // provider-change fires before setup() — configure provider before the iframe is built.
    // HLS: use local hls.js instead of Vidstack's CDN load (slow/blocked in block editor).
    // YouTube: Gutenberg API v3 renders the block canvas in an editor-canvas iframe (blob: URL).
    //   YouTube's IFrame API fires error 153 and disables playVideo when its parent frame has a
    //   blob: URL — it requires an https:// parent. Fix: redirect the .vds-youtube iframe through
    //   a local bridge page (youtube-bridge.html, served from the plugin's https:// URL) so that
    //   YouTube's parent is always an https:// frame. The bridge relays postMessages both ways.
    useEffect(() => {
        if (isPosterOnlyPreview) return;
        if (!playerRef.current) return;
        const player = playerRef.current;
        let patched = false;

        const patchProvider = (provider) => {
            if (!provider) return;
            if (patched) return;

            if (provider.type === 'hls') {
                provider.library = () => import('hls.js');
                // Bunny Stream token auth: sub-playlists and .ts segments are relative
                // urls, so they don't inherit the signed master's query string. Without
                // this the editor preview 403s on every segment once the library enforces
                // CDN URL Token Authentication (the frontend does the same in FluentPlayer.js).
                applyBunnyStreamToken(provider, bunnyTokenQuery);
            }
            if (provider.type === 'youtube') {
                patched = true;
                const orig = provider.buildParams.bind(provider);
                provider.buildParams = () => ({ ...orig(), origin: window.location.origin });

                const editorWin = player.ownerDocument.defaultView;
                const relayWin = (editorWin && editorWin !== window) ? editorWin : window;

                // No nested iframe — Vidstack's own window listener handles everything.
                if (relayWin === window) return;

                // In FluentCommunity, skip the bridge + custom relay entirely.
                // The extra iframe layer prevents user gesture propagation (YouTube auto-pauses).
                // Vidstack handles YouTube directly — multiple videos work natively.
                const isFluentCommunity = isFluentCommunityEditor();

                // Send commands from editor-canvas context so e.source = editor-canvas = window.parent.
                // new relayWin.Function() creates a closure whose `window` is the editor-canvas window.
                // Use a unique selector per player to support multiple YouTube videos.
                const playerBlock = player.closest('[data-block]');
                const blockId = playerBlock?.getAttribute('data-block') || '';
                const ytSelector = blockId ? '[data-block="' + blockId + '"] .vds-youtube' : '.vds-youtube';

                let editorCtxSend = null;
                try {
                    editorCtxSend = new relayWin.Function(
                        'sel', 'data',
                        'var f=document.querySelector(sel);if(f)f.contentWindow.postMessage(data,"*");'
                    );
                    provider.postMessage = (message) => {
                        editorCtxSend(ytSelector, JSON.stringify(message));
                    };
                } catch (_) {
                    // CSP blocked — fall back to Vidstack's default postMessage
                }

                // In FluentCommunity, skip the bridge — the extra iframe layer prevents
                // user gesture propagation, causing YouTube to auto-pause.
                const pluginUrl = window.fluentPlayerBlockVars?.pluginUrl || '';
                const bridgeBase = isFluentCommunity ? '' : (pluginUrl ? pluginUrl + 'assets/youtube-bridge.html' : '');

                if (bridgeBase && editorCtxSend) {
                    const wrapWithBridge = (node) => {
                        const src = node.getAttribute('src') || '';
                        if (!src || src.includes('youtube-bridge.html')) return;
                        node.setAttribute('src', bridgeBase + '?src=' + encodeURIComponent(src));
                    };
                    const bridgeObserver = new MutationObserver((mutations) => {
                        for (const mut of mutations) {
                            if (mut.type === 'childList') {
                                for (const node of mut.addedNodes) {
                                    if (node.nodeType !== 1) continue;
                                    if (node.classList?.contains('vds-youtube')) {
                                        wrapWithBridge(node);
                                    } else {
                                        const yt = node.querySelector?.('.vds-youtube');
                                        if (yt) wrapWithBridge(yt);
                                    }
                                }
                            } else if (mut.type === 'attributes' && mut.target.classList?.contains('vds-youtube')) {
                                wrapWithBridge(mut.target);
                            }
                        }
                    });
                    // Also wrap any already-existing .vds-youtube iframe (rare but safe)
                    const existing = relayWin.document.querySelector('.vds-youtube');
                    if (existing) wrapWithBridge(existing);
                    bridgeObserver.observe(relayWin.document.body, {
                        childList: true, subtree: true, attributes: true, attributeFilter: ['src']
                    });
                    player._fpBridgeObserver = bridgeObserver;
                }

                // Relay incoming messages (YouTube → bridge → editor-canvas → here).
                // With the bridge, messages arrive from the plugin's https:// origin, not YouTube's.
                const bridgeOrigin = pluginUrl ? new URL(pluginUrl).origin : null;
                let lastDeliveryInfo = null;
                let canPlayFired = false;
                // Find this player's YouTube/bridge iframe to filter messages per-player
                const findMyFrame = () => {
                    try {
                        const frame = relayWin.document.querySelector(ytSelector);
                        return frame ? frame.contentWindow : null;
                    } catch(_) { return null; }
                };
                const relayHandler = (e) => {
                    const isYouTube = e.origin.includes('youtube');
                    const isBridge = !!bridgeOrigin && e.origin === bridgeOrigin;
                    if (!isYouTube && !isBridge) return;
                    // Only accept messages from THIS player's iframe (or its nested YouTube).
                    // Reject when myFrame is null: the local YouTube iframe hasn't mounted yet,
                    // so any message arriving now must be from a different player on the page.
                    const myFrame = findMyFrame();
                    if (!myFrame || e.source !== myFrame) {
                        return;
                    }
                    let msg;
                    try { msg = JSON.parse(e.data); } catch (_) { msg = e.data; }
                    if (!msg || typeof msg !== 'object') return;

                    // Clamp non-finite duration before it reaches Vidstack.
                    if (msg.info && typeof msg.info === 'object') {
                        if (typeof msg.info.duration === 'number' && !isFinite(msg.info.duration)) {
                            msg = { ...msg, info: { ...msg.info, duration: 0 } };
                        }
                        lastDeliveryInfo = msg.info;
                    }

                    // YouTube's onReady sends info:null — Vidstack ignores it (returns early).
                    // Inject playerState:5 (Cued) to trigger Vidstack's #onReady → can-play.
                    // Also inject progressState so #onProgress runs unconditionally before
                    // delegate.ready(), giving seekable a finite range (avoids Infinity duration).
                    if (msg.event === 'onReady') {
                        const dur = (lastDeliveryInfo?.duration > 0 && isFinite(lastDeliveryInfo.duration))
                            ? lastDeliveryInfo.duration : 1;
                        const info = {
                            ...(lastDeliveryInfo || {}),
                            progressState: { current: 0, seekableStart: 0, seekableEnd: dur, loaded: 0, duration: dur },
                            videoLoadedFraction: 0,
                            playerState: 5,
                        };
                        if (typeof info.duration !== 'number' || !isFinite(info.duration)) {
                            info.duration = dur;
                        }
                        canPlayFired = true;
                        provider.onMessage({ info }, e);
                        return;
                    }

                    // Suppress playerState:-1 (Unstarted) after can-play — causes #playFail.
                    if (canPlayFired && msg.info && typeof msg.info === 'object' && msg.info.playerState === -1) {
                        return;
                    }

                    provider.onMessage(msg, e);
                };
                relayWin.addEventListener('message', relayHandler);
                player._fpRelayHandler = { win: relayWin, fn: relayHandler };
            }
        };

        const onProviderChange = (event) => patchProvider(event.detail);
        player.addEventListener('provider-change', onProviderChange);

        // In production builds, Vidstack resolves the provider synchronously during
        // connectedCallback (before React's useEffect runs), so provider-change has
        // already fired by the time we attach the listener above. Check for an
        // already-resolved provider and patch it immediately.
        if (player.provider) {
            patchProvider(player.provider);
        }

        return () => {
            player.removeEventListener('provider-change', onProviderChange);
            if (player._fpBridgeObserver) {
                player._fpBridgeObserver.disconnect();
                delete player._fpBridgeObserver;
            }
            if (player._fpRelayHandler) {
                player._fpRelayHandler.win.removeEventListener('message', player._fpRelayHandler.fn);
                delete player._fpRelayHandler;
            }
        };
    }, [mediaData?.provider, isPosterOnlyPreview, bunnyTokenQuery]);

    // Handle player initialization
    useEffect(() => {
        if (isPosterOnlyPreview) return;
        if (!playerRef.current) return;

        const player = playerRef.current;

        if (typeof onPlayerReady === 'function' && !onPlayerReadyCalled.current) {
            onPlayerReadyCalled.current = true;
            onPlayerReady(player);
        }


        // Handle autoplay
        const handleAutoplay = async () => {
            player.muted = !!mediaData.mutedAutoplay;
            if (mediaData.mutedAutoplay || mediaData.autoplay) {
                try {
                    await player?.play();
                } catch (error) {
                    console.warn('Autoplay failed:', error);
                }
            }
        };

        let unsubscribe = null;
        if (typeof player?.subscribe === 'function') {
            unsubscribe = player.subscribe((state) => {
                if (typeof state !== 'object' || !mediaData) return;
                if (!mediaData.title && state.title) {
                    updateMediaSettings && updateMediaSettings('title', state.title);
                }
                // duration <= 1 is the relay's onReady placeholder, not a real duration
                if ((!mediaData.duration || mediaData.duration <= 1) && state.duration) {
                    const duration = typeof state.duration === 'function' ? state.duration() : state.duration;
                    if (duration > 1 && isFinite(duration)) {
                        updateMediaSettings && updateMediaSettings('duration', Math.round(duration));
                    }
                }
                if (!mediaData.posterSrc && state.inferredPoster) {
                    updateMediaSettings && updateMediaSettings('posterSrc', state.inferredPoster);
                }
            });
        }

        // Named handlers for proper cleanup
        let handleWaiting, handlePlaying;

        let lastReportedSecond = -1;
        const handleTimeUpdate = () => {
            const sec = Math.floor(player.currentTime);
            if (sec !== lastReportedSecond) {
                lastReportedSecond = sec;
                setCurrentTime(player.currentTime);
            }
        };

        // For load="play": Show loader when user clicks play
        if (loadStrategy === 'play') {
            // Track if media has started loading
            let hasStartedLoading = false;

            // Show loader when user clicks play and media starts loading
            player.addEventListener('play', () => {
                if (!hasStartedLoading) {
                    setIsLoading(true);
                }
            }, { once: true });

            // Hide loader when ready to play
            player.addEventListener('can-play', () => {
                hasStartedLoading = true;
                setIsLoading(false);
                handleAutoplay();
            }, { once: true });

            // Show/hide loader during buffering (after initial load)
            handleWaiting = () => {
                if (hasStartedLoading) {
                    setIsLoading(true);
                }
            };

            handlePlaying = () => {
                setIsLoading(false);
            };

            player.addEventListener('waiting', handleWaiting);
            player.addEventListener('playing', handlePlaying);
        } else {
            // For other strategies: Hide loader when video is ready to play
            const handleCanPlay = () => {
                setIsLoading(false);
                handleAutoplay();
            };

            player.addEventListener('can-play', handleCanPlay, { once: true });

            // Also listen for loadeddata as fallback
            player.addEventListener('loadeddata', () => {
                setIsLoading(false);
            }, { once: true });

            // Show loader during buffering
            handleWaiting = () => {
                setIsLoading(true);
            };

            handlePlaying = () => {
                setIsLoading(false);
            };

            player.addEventListener('waiting', handleWaiting);
            player.addEventListener('playing', handlePlaying);
        }

        // A completed seek means the frame is ready; clear the buffering loader (a paused seek never fires 'playing', so it would otherwise stick).
        const handleSeeked = () => setIsLoading(false);
        player.addEventListener('seeked', handleSeeked);

        // Handle time-update event
        player.addEventListener('time-update', handleTimeUpdate);

        // Sync muted icon when volume is dragged to zero
        const handleVolumeChange = () => {
            if (player.volume <= 0.01 && !player.muted) {
                player.muted = true;
            }
        };
        player.addEventListener('volume-change', handleVolumeChange);

        // Debounce error surfacing: streaming sources (HLS via hls.js, Bunny/Mux/Gumlet
        // CDN) fire a transient error before the loader attaches and recovers. Only show
        // the error overlay if the player has not become playable within a grace window —
        // otherwise the overlay flashes on the first editor load even though playback works.
        const errorGuard = createMediaErrorGuard({
            delayMs: 2500,
            onFail: (error) => {
                setIsLoading(false);
                setVideoError(error);
            },
        });
        const handleError = (event) => errorGuard.onError(event.detail);
        const handleRecovered = () => errorGuard.onRecovered();
        player.addEventListener('error', handleError);
        player.addEventListener('canplay', handleRecovered);
        player.addEventListener('loadeddata', handleRecovered);
        player.addEventListener('can-play', handleRecovered);

        return () => {
            // Cancel any pending error-grace timer so it can't fire setState after the
            // source changes or the component unmounts.
            errorGuard.onRecovered();
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
            player.removeEventListener('error', handleError);
            player.removeEventListener('canplay', handleRecovered);
            player.removeEventListener('loadeddata', handleRecovered);
            player.removeEventListener('can-play', handleRecovered);
            player.removeEventListener('waiting', handleWaiting);
            player.removeEventListener('playing', handlePlaying);
            player.removeEventListener('seeked', handleSeeked);
            player.removeEventListener('time-update', handleTimeUpdate);
            player.removeEventListener('volume-change', handleVolumeChange);
        };
    }, [playerRef, mediaData?.src, videoSrc, isPosterOnlyPreview]);

    // Cover YouTube watermark on first play
    useEffect(() => {
        if (isPosterOnlyPreview) return;
        const player = playerRef.current;
        if (!player) return;
        const src = (mediaData?.src || '').toLowerCase();
        const isYouTube = src.includes('youtube.com') || src.includes('youtu.be') || src.includes('youtube-nocookie.com');
        if (!isYouTube) return;

        const handler = () => {
            setYtCover(true);
            setTimeout(() => setYtCover(false), 3500);
        };
        player.addEventListener('play', handler, { once: true });
        return () => player.removeEventListener('play', handler);
    }, [playerRef, mediaData?.src, videoSrc, isPosterOnlyPreview]);

    // The poster only auto-hides once playback starts, so it masks the seeked frame; drop it on first seek.
    // Skipped for audio (keeps artwork) and YouTube (can't render a paused seeked frame — keep its poster).
    useEffect(() => {
        if (!revealOnSeek) return;
        setPosterDismissed(false);
        const player = playerRef.current;
        if (!player) return;
        const provider = mediaData?.provider || mediaData?.settings?.provider;
        if (provider === 'youtube' || isAudioMediaData(mediaData, videoSrc)) return;
        const dismiss = () => setPosterDismissed(true);
        if (player.currentTime > 0) { dismiss(); return; }
        player.addEventListener('seeked', dismiss, { once: true });
        return () => player.removeEventListener('seeked', dismiss);
    }, [revealOnSeek, videoSrc, mediaData?.viewType, mediaData?.provider]);

    const handleRetry = useCallback(() => {
        setVideoError(null);
        setIsLoading(true);

        if (playerRef.current && videoSrc) {
            const currentSrc = playerRef.current.src;
            playerRef.current.src = '';
            setTimeout(() => {
                playerRef.current.src = currentSrc || videoSrc;
            }, 100);
        }
    }, [videoSrc]);

    const chaptersVTT = generateChaptersVTT();
    // chapters_strip_active is Pro-answered and defaults false, so without Pro the menu stays.
    const chapterStripSelected = !!window.fluentPlayerBlockVars?.hasPro
        && (mediaData.chaptersDisplay || 'menu') === 'strip'
        && Array.isArray(mediaData.chapters)
        && mediaData.chapters.length > 0;
    // Only the main preview renders the strip itself.
    const chapterStripActive = showChapterStrip && chapterStripSelected;
    const aspectRatio = getAspectRatio();
    const skin = mediaData.skin || 'modern';
    // Render-time audio detection: CDN providers hardcode viewType=video, so an
    // audio file/stream through them must still render the audio layout here to
    // match the frontend (Helper::isAudioSource). Mirrors resources/js/utils/videoSrc.js.
    const isAudioLayout = isAudioMediaData(mediaData, videoSrc);
    const shouldShowPosterPlayButton = !isAudioLayout && (skin === 'minimal' || !behaviors.hide_center_controls);

    // Detect portrait aspect ratio (width < height)
    const isPortrait = (() => {
        const ratio = mediaData.aspectRatio;
        if (!ratio || ratio === 'default' || ratio === 'original') return false;
        const parts = ratio.split(':');
        return parts.length === 2 && parseInt(parts[0]) < parseInt(parts[1]);
    })();

    // Mirrors player.php's $isShort — a Short with ratio 'default'/'original' is not portrait by ratio.
    const isShort = !!mediaData.is_short;

    const containerStyle = {
        position: 'relative',
        backgroundColor: '#212121',
        overflow: 'hidden',
        // Don't apply aspect ratio for audio layout
        aspectRatio: !isPresetPreview && !isAudioLayout && aspectRatio,
        // Video uses the poster as a container backdrop; audio does not (the audio
        // layout renders its own poster block / default music note).
        ...(posterSrcWithToken && !isAudioLayout && {
            backgroundImage: `url(${posterSrcWithToken})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        })
    };

    const captions = mediaData.settings?.styles?.captions ?? mediaData.styles?.captions;
    const captionsEnabled = captions?.enabled !== false;
    const captionStyle = {};
    if (captionsEnabled) {
        if (captions?.color) captionStyle['--media-cue-color'] = captions.color;
        if (captions?.background) captionStyle['--media-cue-bg'] = captions.background;
        if (captions?.font_size != null) captionStyle['--media-cue-font-size'] = `${captions.font_size}px`;
    }

    if (isPosterOnlyPreview) {
        return (
            <div className={`fluent-player-container${isPortrait ? ' fp-portrait' : ''}${isShort ? ' fp-short' : ''}`} data-skin={skin} style={containerStyle}>
                <media-player
                    title={mediaData.title}
                    load="play"
                    poster={posterSrcWithToken || undefined}
                    stream-type={mediaData.streamType || 'on-demand'}
                    media-type={isAudioLayout ? 'audio' : (mediaData.mediaType || 'video')}
                    view-type={isAudioLayout ? 'audio' : (mediaData.viewType || 'video')}
                    style={{
                        '--media-brand': brandingColor,
                        '--fp-control-bar-bg': controlBarColor || undefined,
                        '--media-play-color': playButtonColor || undefined,
                        '--media-play-bg': playButtonBgColor || undefined,
                        aspectRatio: !isPresetPreview && !isAudioLayout && aspectRatio,
                        pointerEvents: 'none'
                    }}
                >
                    <media-provider>
                        <media-poster
                            src={posterSrcWithToken}
                            alt={mediaData.title}
                            {...(posterSrcWithToken ? { load: 'eager' } : {})}
                        ></media-poster>
                    </media-provider>
                    {shouldShowPosterPlayButton && (
                        <CenterControls skin={skin} alwaysVisible />
                    )}
                </media-player>
            </div>
        );
    }

    const previewPlayer = (
        <div className={`fluent-player-container${isPortrait ? ' fp-portrait' : ''}${isShort ? ' fp-short' : ''}${ytCover ? ' fp-yt-cover' : ''}`} data-skin={skin} style={containerStyle}>
            <media-player
                className={!captionsEnabled ? 'fp-captions-hidden' : undefined}
                title={mediaData.title}
                src={videoSrc}
                poster={posterSrcWithToken || undefined}
                crossorigin={shouldUseCrossOrigin ? true : undefined}
                preload={preload}
                autoplay={mediaData.autoplay || mediaData.mutedAutoplay ? true : undefined}
                playsinline={mediaData.playsInline ? true : undefined}
                muted={mediaData.muted || mediaData.mutedAutoplay ? true : undefined}
                stream-type={mediaData.streamType || 'on-demand'}
                media-type={isAudioLayout ? 'audio' : (mediaData.mediaType || 'video')}
                view-type={isAudioLayout ? 'audio' : (mediaData.viewType || 'video')}
                load={loadStrategy}
                loop={mediaData.video_end_option === 'loop' ? true : undefined}
                ref={playerRef}
                style={{
                    '--media-brand': brandingColor,
                    '--fp-control-bar-bg': controlBarColor || undefined,
                    '--media-play-color': playButtonColor || undefined,
                    '--media-play-bg': playButtonBgColor || undefined,
                    // Don't apply aspect ratio for audio layout
                    'aspectRatio': !isPresetPreview && !isAudioLayout && aspectRatio,
                    ...captionStyle
                }}
            >
                <media-provider>
                    {!(revealOnSeek && posterDismissed) && (
                        <media-poster
                            src={posterSrcWithToken}
                            alt={mediaData.title}
                            {...(loadStrategy === 'play' && posterSrcWithToken ? { load: 'eager' } : {})}
                        ></media-poster>
                    )}

                    {mediaData.chapters && mediaData.chapters.length > 0 && (
                        <track
                            key={trackKey}
                            kind="chapters"
                            label="Chapters"
                            src={chaptersVTT}
                            default
                        />
                    )}
                </media-provider>
                <VideoLayout
                    playerRef={playerRef}
                    currentTime={currentTime}
                    settings={{ ...mediaData, thumbnails: thumbnailsWithToken, _hideCaptions: !captionsEnabled, _chapterStripActive: chapterStripSelected }}
                    isAudio={isAudioLayout}
                    presetData={presetData}
                    skin={skin}
                />
                {isPresetPreview && captionsEnabled && !subtitlesWithToken?.length && (
                    <div
                        className="fp-caption-style-preview"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            pointerEvents: 'none',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            margin: 'var(--media-captions-padding, 1%)',
                            bottom: '5%',
                            zIndex: 2
                        }}
                    >
                        <span
                            style={{
                                display: 'inline-block',
                                padding: '0.2em 0.4em',
                                borderRadius: 4,
                                backdropFilter: 'blur(12px)',
                                color: 'var(--media-cue-color, #fff)',
                                backgroundColor: 'var(--media-cue-bg, rgba(0,0,0,0.8))',
                                fontSize: 'var(--media-cue-font-size, 16px)',
                                lineHeight: 1.2,
                                whiteSpace: 'pre-wrap'
                            }}
                        >
                            {__('Caption preview', 'fluent-player')}
                        </span>
                    </div>
                )}
            </media-player>

            {isLoading && !videoError && (
                <div className="fluent-player-loader">
                    {posterSrcWithToken && (
                        <img
                            className="fluent-player-loader-poster"
                            src={posterSrcWithToken}
                            alt={mediaData.title || ''}
                            loading="eager"
                        />
                    )}
                    <div className="fluent-player-loader-overlay">
                        <div className="fluent-player-loader-spinner"></div>
                    </div>
                </div>
            )}

            {videoError && (
                <VideoErrorOverlay error={videoError} onRetry={handleRetry} />
            )}
        </div>
    );

    // Keyed off the static prop, not the live setting: toggling chapters display must not change
    // the tree root, or React remounts <media-player> and Vidstack logs "provider destroyed".
    // Modal previews pass no prop, so their DOM is untouched.
    if (!showChapterStrip) {
        return previewPlayer;
    }

    // The strip is a sibling of the container on the front end and inherits --media-brand from
    // the .fluent-player wrapper, which is also what its theme-proofing selectors are scoped to.
    return (
        <div className="fluent-player" style={{ '--media-brand': brandingColor }}>
            {previewPlayer}
            {chapterStripActive && (
                <ChapterStrip
                    chapters={mediaData.chapters}
                    currentTime={currentTime}
                    playerRef={playerRef}
                />
            )}
        </div>
    );
};

export default FluentPlayer;
