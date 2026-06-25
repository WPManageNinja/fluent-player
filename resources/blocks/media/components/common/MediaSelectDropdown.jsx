import { SearchIconSVG } from './Icons.jsx';
const { __ } = wp.i18n;
const { useState, useEffect, useRef } = wp.element;

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

export const getProviderLabel = (provider) => {
    const labels = {
        youtube: 'YouTube', vimeo: 'Vimeo',
        bunnycdn: 'Bunny Stream', bunny: 'Bunny Stream', bunny_storage: 'BunnyCDN Storage',
        audio: 'Audio',
    };
    return labels[provider] || 'Uploaded';
};

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
 *
 * items shape: { value, title, provider?, posterSrc?, duration? }
 * When provider is falsy, the provider icon and label are hidden.
 */
const MediaSelectDropdown = ({
    items,
    value,
    onChange,
    placeholder,
    searchPlaceholder,
    emptyText,
    showThumb = true,
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);
    const searchRef = useRef(null);
    const selected = items.find(i => String(i.value) === String(value)) || null;

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

    const reversed = [...items].sort((a, b) => Number(b.value) - Number(a.value));
    const filtered = search.trim()
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
                        {filtered.length === 0 ? (
                            <li className="fp-media-select-empty">
                                {emptyText || __('No results found', 'fluent-player')}
                            </li>
                        ) : filtered.map(item => (
                            <li
                                key={item.value}
                                role="option"
                                aria-selected={String(item.value) === String(value)}
                                className={`fp-media-select-option${String(item.value) === String(value) ? ' is-selected' : ''}`}
                                onClick={() => { onChange(item.value); setOpen(false); }}
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
                </div>
            )}
        </div>
    );
};

export default MediaSelectDropdown;
