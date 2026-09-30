/**
 * Divi 5 sidebar field: an async, server-searched picker for the media / playlist id.
 *
 * Divi's native `divi/select` filters a STATIC options object client-side, so a large library
 * would have to preload every row into the builder payload (the reviewer's "unbounded" finding).
 * This wraps the native select — reused via `window.divi.fieldLibrary.getFieldComponent` — and
 * owns the options state: it fetches a bounded page from REST as the user types (and the saved
 * value's label on mount), then writes the chosen id back through Divi's own `props.onChange`.
 *
 * `configFactory` is a pickerSearch.js search config builder (mediaSearchConfig /
 * playlistSearchConfig) — the endpoint URL shape + response parsing shared with the Elementor
 * picker, so the two integrations can't drift.
 *
 * Everything here rides Divi's minified/undocumented field internals, so each access is
 * feature-guarded and degrades to an inert field rather than throwing.
 */

import { mapPickerOptionsToDivi, jsonOrThrow, fallbackOptionLabel } from '../elementor/pickerSearch.js';

const React = (window.vendor && window.vendor.React) || window.React;
const { useState, useEffect, useRef, useCallback, useMemo } = React;
const __ = (window.wp && window.wp.i18n && window.wp.i18n.__)
    ? window.wp.i18n.__.bind(window.wp.i18n)
    : (s) => s;

function restConfig() {
    const rest = (window.fluentPlayerBlockVars && window.fluentPlayerBlockVars.rest) || {};
    return { url: rest.url || '', nonce: rest.nonce || '' };
}

function nativeSelect() {
    const fl = window.divi && window.divi.fieldLibrary;
    return (fl && typeof fl.getFieldComponent === 'function') ? fl.getFieldComponent('divi/select') : null;
}

// Divi passes the resolved scalar value; accept only a scalar so we never build a bad request.
function readValue(props) {
    const v = props && props.value;
    return (typeof v === 'string' || typeof v === 'number') ? String(v) : '';
}

export default function makePickerSearchField(configFactory) {
    return function PickerSearchField(props) {
        const Select = nativeSelect();
        const { url, nonce } = restConfig();
        const cfg = useMemo(() => configFactory(url), [url]);
        const value = readValue(props);
        const [options, setOptions] = useState({});
        const debounceRef = useRef(null);
        const pageAbortRef = useRef(null);

        const headers = useMemo(() => (nonce ? { 'X-WP-Nonce': nonce } : {}), [nonce]);

        const mergeOptions = useCallback((rows) => {
            const mapped = mapPickerOptionsToDivi(rows, cfg.singular);
            if (Object.keys(mapped).length) setOptions((prev) => ({ ...prev, ...mapped }));
        }, [cfg]);

        const fetchPage = useCallback((q) => {
            // Abort the previous page request so a slow earlier query can't resolve last and
            // merge stale results over a fresher one.
            if (pageAbortRef.current) pageAbortRef.current.abort();
            const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
            pageAbortRef.current = controller;
            fetch(cfg.buildPageUrl({ q, page: 1 }), { headers, credentials: 'include', signal: controller ? controller.signal : undefined })
                .then(jsonOrThrow)
                .then((json) => mergeOptions(cfg.parse(json).items))
                .catch(() => { /* aborted or failed — keep existing options so the field stays usable */ });
        }, [cfg, headers, mergeOptions]);

        // Load a bounded "recent" page once so the dropdown isn't empty on first open.
        useEffect(() => { fetchPage(''); }, [fetchPage]);

        // Resolve the saved selection's label so the native select renders the current choice
        // even when it isn't on the recent page — preserving it (with a fallback label) on error.
        useEffect(() => {
            if (!value || options[value]) return;
            let cancelled = false;
            const keepFallback = () => {
                if (cancelled) return;
                setOptions((prev) => (prev[value] ? prev : { ...prev, [value]: { label: fallbackOptionLabel(value, cfg.singular), name: value } }));
            };
            fetch(cfg.buildByIdUrl(value), { headers, credentials: 'include' })
                .then(jsonOrThrow)
                .then((json) => {
                    if (cancelled) return;
                    const item = cfg.parseById(json);
                    if (item) mergeOptions([item]);
                    else keepFallback();
                })
                .catch(keepFallback);
            return () => { cancelled = true; };
        // Re-run only when the selected id changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [value]);

        const onSearch = useCallback((q) => {
            const query = String(q || '');
            // Mirror Divi's own post-picker: fetch on clear, or once the query is specific (>2).
            if (query.length !== 0 && query.length <= 2) return;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => fetchPage(query), 250);
        }, [fetchPage]);

        useEffect(() => () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (pageAbortRef.current) pageAbortRef.current.abort();
        }, []);

        if (!Select) {
            return React.createElement('div', { style: { padding: '4px 0', color: '#b91c1c', fontSize: 13 } },
                __('Picker unavailable.', 'fluent-player'));
        }

        return React.createElement(Select, {
            ...props,
            options,
            value,
            searchable: true,
            searchPlaceholder: __('Search…', 'fluent-player'),
            updateSearchQuery: onSearch,
            onChange: props.onChange,
        });
    };
}
