/**
 * In-canvas playlist picker for the Elementor / Divi builders — the empty-widget state.
 * Wraps the shared PlaylistSelector (New Playlist / By Tags / Select Existing) and turns
 * a selection into a builder writeback via the injected callbacks. Playlists live in Pro,
 * so the list/create endpoints are Pro's /playlist; without Pro the list is empty.
 */
const { useState, useEffect, useCallback } = wp.element;
const apiFetch = wp.apiFetch;

import PlaylistSelector from '../components/PlaylistSelector.jsx';
import { DEFAULT_PLAYLIST_SETTINGS } from '../utils/settings.js';

function restBase() {
    const rest = window.fluentPlayerBlockVars?.rest || {};
    return `/${rest.namespace || 'fluent-player'}/${rest.version || 'v2'}`;
}

export default function CanvasPlaylistPicker({ onSelectPlaylist, onSelectTags }) {
    const [playlists, setPlaylists] = useState([]);

    useEffect(() => {
        let cancelled = false;
        apiFetch({ path: `${restBase()}/playlist` })
            .then((res) => {
                if (cancelled || !res?.data) return;
                setPlaylists(res.data.map((item) => ({
                    label: `${item.post_title || 'Playlist'} (#${item.ID})`,
                    value: item.ID,
                    title: item.post_title || 'Playlist',
                    status: item.post_status || '',
                })));
            })
            .catch(() => { /* Pro absent / offline → empty list, picker still works for create */ });
        return () => { cancelled = true; };
    }, []);

    const createPlaylist = useCallback(async (title) => {
        try {
            const res = await apiFetch({
                path: `${restBase()}/playlist`,
                method: 'POST',
                data: {
                    settings: JSON.stringify({ ...DEFAULT_PLAYLIST_SETTINGS, title: title || 'New Playlist' }),
                    not_dedicated_page: 'yes',
                },
            });
            if (res?.playlist?.ID) onSelectPlaylist(res.playlist.ID);
        } catch (e) { /* create failed; the picker stays open for retry */ }
    }, [onSelectPlaylist]);

    return wp.element.createElement(PlaylistSelector, {
        playlists,
        selectedPlaylist: null,
        onSelect: (id) => onSelectPlaylist(id),
        onCreate: createPlaylist,
        onCreateTagPlaylist: (tags) => onSelectTags(tags, { limit: 20, orderby: 'date', order: 'DESC' }),
        isTagMode: false,
        tags: [],
    });
}
