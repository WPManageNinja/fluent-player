import { SearchIconSVG } from './Icons.jsx';
import { PROVIDER_LABELS } from '../../../common/providerLabels.js';
import { shouldServerSearch, mergeItemsById, SEARCH_MIN_CHARS } from './mediaSearch.js';
const { __, sprintf } = wp.i18n;
const { useState, useEffect, useRef, useCallback } = wp.element;
const { Button } = wp.components;

/* ── Provider icons (inline SVG, same artwork as the Vue admin) ── */
export const ProviderIcon = ({ provider }) => {
    if (provider === 'youtube') {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M22.0612 6.84699C21.8197 5.92316 21.1081 5.19559 20.2046 4.94867C18.5669 4.5 12 4.5 12 4.5C12 4.5 5.43315 4.5 3.79544 4.94867C2.89193 5.19563 2.18033 5.92316 1.93882 6.84699C1.5 8.52148 1.5 12.0152 1.5 12.0152C1.5 12.0152 1.5 15.5088 1.93882 17.1833C2.18033 18.1071 2.89193 18.8044 3.79544 19.0513C5.43315 19.5 12 19.5 12 19.5C12 19.5 18.5669 19.5 20.2046 19.0513C21.1081 18.8044 21.8197 18.1071 22.0612 17.1833C22.5 15.5088 22.5 12.0152 22.5 12.0152C22.5 12.0152 22.5 8.52148 22.0612 6.84699ZM9.85226 15.1871V8.84316L15.3409 12.0152L9.85226 15.1871Z" fill="#FF0000"/>
            </svg>
        );
    }
    if (provider === 'vimeo') {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M22.4898 7.16428C22.3964 9.18992 20.9686 11.9637 18.2071 15.4841C15.3519 19.1615 12.9363 21 10.9601 21C9.73646 21 8.70011 19.8805 7.85422 17.6408C7.2889 15.5877 6.7242 13.5349 6.15909 11.4818C5.53056 9.24329 4.85666 8.12258 4.13615 8.12258C3.97907 8.12258 3.42928 8.45011 2.48806 9.10268L1.5 7.84136C2.53636 6.93893 3.55885 6.03671 4.56476 5.13324C5.94699 3.9496 6.98461 3.32714 7.67614 3.26421C9.31058 3.10864 10.3165 4.21565 10.6941 6.58544C11.1021 9.14215 11.3843 10.7325 11.5431 11.3549C12.0141 13.4761 12.5324 14.5353 13.0988 14.5353C13.5383 14.5353 14.1986 13.8474 15.0789 12.4717C15.9584 11.0955 16.4294 10.0485 16.493 9.32928C16.6182 8.14169 16.147 7.54644 15.0789 7.54644C14.5762 7.54644 14.0579 7.66108 13.5247 7.88768C14.5566 4.53778 16.5285 2.91092 19.4392 3.00376C21.5969 3.06648 22.6142 4.45325 22.4898 7.16428Z" fill="#32B8E8"/>
            </svg>
        );
    }
    if (provider === 'bunnycdn' || provider === 'bunny' || provider === 'bunny_storage') {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M6.889 1.925L20.801 9.635C21.154 9.789 21.255 10.2 21.104 10.56C21.054 10.715 20.953 10.817 20.801 10.869C19.743 11.537 18.584 12 17.374 12.205L14.45 18.271C14.45 18.271 13.543 20.378 11.022 19.556C12.081 18.476 13.341 17.5 13.341 15.855C13.341 14.107 11.98 12.719 10.266 12.719C8.552 12.719 7.191 14.107 7.191 15.855C7.191 18.014 9.309 18.939 10.468 20.43C10.972 21.2 10.922 22.228 10.317 22.897C8.905 21.458 6.133 18.99 4.973 17.397C4.369 16.574 4.016 15.598 3.965 14.57C4.066 12.308 5.578 10.355 7.696 9.686C8.351 9.481 9.006 9.429 9.661 9.429C10.569 9.481 11.476 9.789 12.283 10.252C13.543 10.972 14.097 10.817 14.954 10.046C15.458 9.635 16.013 8.247 15.156 7.939C14.853 7.836 14.601 7.785 14.299 7.733C12.736 7.425 9.964 7.116 8.956 6.551C7.343 5.626 6.234 3.724 6.889 1.925Z" fill="#F47920"/>
            </svg>
        );
    }
    // wordpress, audio, or unknown — upload icon
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4.8 18.3H19.2V12H21V19.2C21 19.439 20.905 19.668 20.736 19.836C20.568 20.005 20.339 20.1 20.1 20.1H3.9C3.661 20.1 3.432 20.005 3.264 19.836C3.095 19.668 3 19.439 3 19.2V12H4.8V18.3ZM12.9 9.3V15.6H11.1V9.3H6.6L12 3.9L17.4 9.3H12.9Z" fill="#525866"/>
        </svg>
    );
};

export const getProviderLabel = (provider) => PROVIDER_LABELS[provider] || 'Uploaded';

/**
 * Format duration in seconds to a compact string (e.g. "3:45" or "1:02:30").
 */
const formatDuration = (seconds) => {
    if (seconds == null || isNaN(seconds) || seconds <= 0) return null;
    const h = Math.floor(Number(seconds) / 3600);
    const m = Math.floor((Number(seconds) % 3600) / 60);
    const s = Math.floor(Number(seconds) % 60);
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

/**
 * Custom searchable select dropdown for media/playlist items.
 * items shape: { value, title, provider?, posterSrc?, duration? }.
 *
 * Client mode (default): filters `items` in-memory. Server mode: pass
 * `loadPage({ query, page }) => Promise<{ items, hasMore }>` to fetch bounded pages (searching
 * once the query is >= minSearchChars) with a "Load more" button; `items` still resolves the
 * selected option's label.
 */
const MediaSelectDropdown = ({
    items,
    value,
    onChange,
    placeholder,
    searchPlaceholder,
    emptyText,
    showThumb = true,
    loadPage,
    minSearchChars = SEARCH_MIN_CHARS,
}) => {
    const isServer = typeof loadPage === 'function';
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);
    const searchRef = useRef(null);

    // Server-mode state.
    const [remoteItems, setRemoteItems] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(false);
    const reqIdRef = useRef(0);
    const debounceRef = useRef(null);
    // Keep runSearch stable + unmount-safe regardless of how the caller memoizes loadPage.
    const loadPageRef = useRef(loadPage);
    loadPageRef.current = loadPage;
    const mountedRef = useRef(true);
    // Set true in the body too: under StrictMode the effect runs mount→unmount→mount, and the
    // cleanup would otherwise leave mountedRef false on a still-mounted component.
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const baseItems = items || [];
    const selected = baseItems.find(i => String(i.value) === String(value))
        || remoteItems.find(i => String(i.value) === String(value))
        || null;

    // reqId guards against a slow earlier request resolving last and overwriting fresher results;
    // mountedRef guards against setState after the dropdown unmounts mid-request.
    const runSearch = useCallback((query, pageNum, append) => {
        const load = loadPageRef.current;
        if (typeof load !== 'function') return;
        const reqId = ++reqIdRef.current;
        const alive = () => mountedRef.current && reqId === reqIdRef.current;
        setError(false);
        if (append) setLoadingMore(true); else setLoading(true);
        load({ query, page: pageNum })
            .then(({ items: rows, hasMore: more }) => {
                if (!alive()) return;
                setRemoteItems(prev => (append ? mergeItemsById(prev, rows) : (rows || [])));
                setHasMore(!!more);
                setPage(pageNum);
            })
            .catch(() => {
                if (!alive()) return;
                setError(true);
                // A failed page-1 search must not keep the previous query's rows on screen; a
                // failed "load more" keeps what's already loaded and lets the button retry.
                if (!append) { setRemoteItems([]); setHasMore(false); }
            })
            .finally(() => { if (alive()) { setLoading(false); setLoadingMore(false); } });
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (open) {
            setTimeout(() => searchRef.current && searchRef.current.focus(), 0);
        } else {
            setSearch('');
        }
    }, [open]);

    // Fetch page 1 on open and whenever the query becomes searchable; a 1-2 char fragment is
    // left alone (the list keeps its results and a hint asks the user to keep typing).
    useEffect(() => {
        if (!isServer || !open) return undefined;
        const q = search.trim();
        if (!shouldServerSearch(q, minSearchChars)) return undefined;
        // Invalidate any in-flight request (including a load-more) NOW, not only when the new
        // runSearch fires after the debounce — otherwise a load-more resolving inside the
        // debounce window would still pass the reqId guard, merge stale rows, and clear this
        // query's loading state.
        reqIdRef.current += 1;
        // Reflect the pending search immediately: the previous query's rows must not stay
        // visible (or selectable) during the debounce window, presented as if they matched
        // the new query. The loading state replaces them until the fresh page resolves.
        setLoading(true);
        setLoadingMore(false);
        setError(false);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const delay = q === '' ? 0 : 300;
        debounceRef.current = setTimeout(() => runSearch(q, 1, false), delay);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [open, search, isServer, minSearchChars, runSearch]);

    const handleLoadMore = () => runSearch(search.trim(), page + 1, true);

    const reversed = [...baseItems].sort((a, b) => Number(b.value) - Number(a.value));
    const clientFiltered = search.trim()
        ? reversed.filter(i => {
            const q = search.toLowerCase();
            return (
                String(i.value).includes(search) ||
                (i.title || '').toLowerCase().includes(q) ||
                (i.provider || '').toLowerCase().includes(q) ||
                getProviderLabel(i.provider).toLowerCase().includes(q)
            );
        })
        : reversed;

    const belowThreshold = isServer && search.trim().length > 0 && search.trim().length < minSearchChars;
    const filtered = isServer ? remoteItems : clientFiltered;

    return (
        <div className="fp-media-select" ref={ref}>
            <button
                type="button"
                className={`fp-media-select-trigger${open ? ' is-open' : ''}`}
                onClick={() => setOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                {selected ? (
                    <span className="fp-media-select-row">
                        {showThumb && (
                            <span className="fp-media-select-thumb-wrap">
                                {selected.posterSrc
                                    ? <img className="fp-media-select-thumb" src={selected.posterSrc} alt="" />
                                    : <span className="fp-media-select-thumb fp-media-select-thumb--empty" />
                                }
                                {formatDuration(selected.duration) && (
                                    <span className="fp-media-select-duration">{formatDuration(selected.duration)}</span>
                                )}
                            </span>
                        )}
                        {selected.provider && (
                            <span className="fp-media-select-icon">
                                <ProviderIcon provider={selected.provider} />
                            </span>
                        )}
                        <span className="fp-media-select-label">
                            #{selected.value} &ndash; {selected.title}
                        </span>
                        {selected.status && (
                            <span className={`fp-media-select-status fp-media-select-status--${selected.status}`}>
                                {selected.status}
                            </span>
                        )}
                    </span>
                ) : (
                    <span className="fp-media-select-placeholder">
                        {placeholder || __('Select…', 'fluent-player')}
                    </span>
                )}
                <svg className="fp-media-select-chevron" aria-hidden="true" width="10" height="10" viewBox="0 0 10 10">
                    <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                </svg>
            </button>

            {open && (
                <div className="fp-media-select-dropdown">
                    <div className="fp-media-select-search">
                        <div className="fp-media-select-search-wrapper">
                            <SearchIconSVG size={16} className="fp-media-select-search-icon" />
                            <input
                                ref={searchRef}
                                type="text"
                                className="fp-media-select-search-input"
                                placeholder={searchPlaceholder || __('Search…', 'fluent-player')}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onClick={e => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    <ul className="fp-media-select-list" role="listbox">
                        {belowThreshold ? (
                            <li className="fp-media-select-empty">
                                {sprintf(
                                    /* translators: %d: minimum number of characters to search */
                                    __('Type at least %d characters to search…', 'fluent-player'),
                                    minSearchChars
                                )}
                            </li>
                        ) : (isServer && loading) ? (
                            <li className="fp-media-select-empty">{__('Loading…', 'fluent-player')}</li>
                        ) : (isServer && error && filtered.length === 0) ? (
                            <li className="fp-media-select-empty fp-media-select-error" role="alert">
                                {__('Couldn’t load results.', 'fluent-player')}{' '}
                                <Button variant="link" className="fp-media-select-retry" onClick={() => runSearch(search.trim(), 1, false)}>
                                    {__('Retry', 'fluent-player')}
                                </Button>
                            </li>
                        ) : filtered.length === 0 ? (
                            <li className="fp-media-select-empty">
                                {emptyText || __('No results found', 'fluent-player')}
                            </li>
                        ) : filtered.map(item => (
                            <li
                                key={item.value}
                                role="option"
                                tabIndex={0}
                                aria-selected={String(item.value) === String(value)}
                                className={`fp-media-select-option${String(item.value) === String(value) ? ' is-selected' : ''}`}
                                onClick={() => { onChange(item.value); setOpen(false); }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onChange(item.value);
                                        setOpen(false);
                                    }
                                }}
                            >
                                {showThumb && (
                                    <span className="fp-media-select-thumb-wrap">
                                        {item.posterSrc
                                            ? <img className="fp-media-select-thumb" src={item.posterSrc} alt="" />
                                            : <span className="fp-media-select-thumb fp-media-select-thumb--empty" />
                                        }
                                        {formatDuration(item.duration) && (
                                            <span className="fp-media-select-duration">{formatDuration(item.duration)}</span>
                                        )}
                                    </span>
                                )}
                                <span className="fp-media-select-label">
                                    #{item.value} &ndash; {item.title}
                                </span>
                                {item.status && (
                                    <span className={`fp-media-select-status fp-media-select-status--${item.status}`}>
                                        {item.status}
                                    </span>
                                )}
                                {item.provider && (
                                    <span className="fp-media-select-provider-label">
                                        <ProviderIcon provider={item.provider} />
                                        {getProviderLabel(item.provider)}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                    {isServer && (hasMore || (error && filtered.length > 0)) && !loading && !belowThreshold && (
                        <div className="fp-media-search__load-more-wrap">
                            {error && filtered.length > 0 && (
                                <span className="fp-media-search__error" role="alert">
                                    {__('Couldn’t load more.', 'fluent-player')}
                                </span>
                            )}
                            <Button
                                className="fp-media-search__load-more"
                                onClick={handleLoadMore}
                                isBusy={loadingMore}
                                disabled={loadingMore}
                            >
                                {loadingMore
                                    ? __('Loading…', 'fluent-player')
                                    : (error && filtered.length > 0 ? __('Retry', 'fluent-player') : __('Load more', 'fluent-player'))}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MediaSelectDropdown;
