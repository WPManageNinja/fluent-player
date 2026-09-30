/**
 * Editor preview of the chapter scroll strip.
 *
 * Mirrors the markup Pro renders at `fluent_player/render_chapters_strip`
 * (app/Views/chapters-strip.php) and the seek behaviour of the front-end runtime
 * (resources/js/chapterStrip.js). The nav arrows and jump button are omitted:
 * both are driven by scroll measurements the runtime owns and would be dead
 * controls here. `data-fp-chapters` is deliberately absent so that runtime never
 * binds a second handler on top of this one.
 */
const { useRef, useEffect, useMemo, useCallback, useState } = wp.element;
const { __, sprintf } = wp.i18n;

const formatStamp = (seconds) => {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

const ChapterStrip = ({ chapters, currentTime = 0, playerRef }) => {
    const railRef = useRef(null);
    const hasFollowed = useRef(false);
    const [pendingStart, setPendingStart] = useState(null);

    // Storage keeps author order; the front end sorts on render, so the preview must too.
    const ordered = useMemo(
        () => (Array.isArray(chapters) ? [...chapters] : []).sort(
            (a, b) => (Number(a.startTime) || 0) - (Number(b.startTime) || 0)
        ),
        [chapters]
    );

    const activeIndex = useMemo(() => {
        let index = 0;
        for (let i = 0; i < ordered.length; i++) {
            if (currentTime >= (Number(ordered[i].startTime) || 0)) index = i; else break;
        }
        return index;
    }, [ordered, currentTime]);

    // Follow the playing chapter, but never on the first commit: scrollIntoView walks every
    // scrollable ancestor, so scrolling on mount would drag the editor canvas to this block.
    useEffect(() => {
        if (!hasFollowed.current) { hasFollowed.current = true; return; }
        const pill = railRef.current && railRef.current.querySelector('.fp-chapter-pill.is-active');
        if (pill) {
            pill.scrollIntoView({
                inline: 'center',
                block: 'nearest',
                behavior: prefersReducedMotion() ? 'auto' : 'smooth',
            });
        }
    }, [activeIndex]);

    const applySeek = useCallback((time) => {
        const player = playerRef && playerRef.current;
        if (!player) return;
        const remote = player.remoteControl;
        if (remote && typeof remote.seek === 'function') {
            // Two-call idiom so iframe providers (YouTube/Vimeo) register a real user seek.
            remote.seeking(time);
            remote.seek(time);
            if (player.paused && typeof remote.play === 'function') {
                // play() rejects under autoplay policy; a sync catch never sees it.
                try { Promise.resolve(remote.play()).catch(() => {}); } catch (_) { /* not ready */ }
            }
            return;
        }
        try { player.currentTime = time; } catch (_) { /* provider not ready */ }
    }, [playerRef]);

    // A seek before the provider can accept one is a silent no-op, so it is queued instead.
    useEffect(() => {
        const player = playerRef && playerRef.current;
        if (!player || pendingStart === null) return undefined;
        const land = () => { setPendingStart(null); applySeek(pendingStart); };
        const clear = () => setPendingStart(null);
        player.addEventListener('can-play', land);
        player.addEventListener('error', clear);
        player.addEventListener('abort', clear);
        return () => {
            player.removeEventListener('can-play', land);
            player.removeEventListener('error', clear);
            player.removeEventListener('abort', clear);
        };
    }, [pendingStart, playerRef, applySeek]);

    const seekTo = useCallback((time) => {
        const player = playerRef && playerRef.current;
        if (!player) return;
        const canSeek = player.state ? player.state.canPlay : player.hasAttribute('data-can-play');
        if (canSeek) {
            setPendingStart(null);
            applySeek(time);
            return;
        }
        setPendingStart(time);
        try { Promise.resolve(player.play()).catch(() => {}); } catch (_) { /* not ready */ }
    }, [playerRef, applySeek]);

    if (!ordered.length) {
        return null;
    }

    return (
        <div className="fp-chapters">
            <div className="fp-chapters-head">
                <span className="fp-chapters-label">
                    {__('Chapters', 'fluent-player')}{' '}
                    <span className="fp-chapters-count">&middot; {ordered.length}</span>
                </span>
            </div>
            <div className="fp-chapters-rail-wrap">
                <ul className="fp-chapters-rail" role="list" ref={railRef} aria-label={__('Chapters', 'fluent-player')}>
                    {ordered.map((chapter, index) => {
                        const start = Number(chapter.startTime) || 0;
                        const stamp = formatStamp(start);
                        const title = chapter.title || '';
                        const isActive = index === activeIndex;
                        const isPending = pendingStart === start;
                        return (
                            <li role="listitem" className="fp-chapter" key={`${index}-${start}`}>
                                <button
                                    type="button"
                                    className={`fp-chapter-pill${isActive ? ' is-active' : ''}${isPending ? ' is-pending' : ''}`}
                                    title={title}
                                    aria-label={sprintf(
                                        /* translators: 1: chapter title, 2: chapter start timestamp, e.g. 2:40 */
                                        __('%1$s, starts at %2$s', 'fluent-player'),
                                        title,
                                        stamp
                                    )}
                                    {...(isActive ? { 'aria-current': 'true' } : {})}
                                    onClick={() => seekTo(start)}
                                >
                                    <span className="fp-chapter-time" aria-hidden="true">{stamp}</span>
                                    <span className="fp-chapter-title" aria-hidden="true">{title}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};

export default ChapterStrip;
