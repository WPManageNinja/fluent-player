const { __ } = wp.i18n;
const { useState, useCallback } = wp.element;
const { Button, Placeholder, TextControl } = wp.components;
const apiFetch = wp.apiFetch;
import { FluentPlayerBlockIconSVG, BackArrowSmallSVG, PlusIconSVG, TagIconSVG } from '../../media/components/common/Icons';
import MediaSelectDropdown from '../../media/components/common/MediaSelectDropdown';
import { playlistLoadPage } from '../../media/components/common/mediaSearch.js';
import TagsPanel from './TagsPanel.jsx';
import useTags from '../../hooks/useTags.js';

/**
 * PlaylistSelector component for selecting existing or creating new playlists
 */
const PlaylistSelector = ({
    playlists,
    selectedPlaylist,
    onSelect,
    onCreate,
    onCreateTagPlaylist = () => {},
    isTagMode = false,
    tags = []
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [isSelectingTags, setIsSelectingTags] = useState(isTagMode);
    const [draftTags, setDraftTags] = useState(tags);
    const { availableTags, tagsLoading, tagsError, retryTags } = useTags({ enabled: isSelectingTags });

    // Server-side, paged playlist search for the dropdown.
    const loadPlaylistPage = useCallback(({ query, page }) => playlistLoadPage(apiFetch, { query, page }), []);

    const handleCreate = () => {
        if (newTitle.trim()) {
            onCreate(newTitle.trim());
            setNewTitle('');
            setIsCreating(false);
        }
    };

    const openTagSelector = () => {
        setDraftTags(tags);
        setIsSelectingTags(true);
    };

    // Buttons under the tag field: pressing one blurs the field, closing the suggestion popup
    // and reflowing the panel, so the button moves before mouseup and no click is dispatched.
    // Commit on mousedown (default prevented, so focus stays put); onClick serves keyboard
    // activation only, which `detail === 0` identifies, so the action can't run twice.
    const activate = (fn) => ({
        onMouseDown: (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            fn();
        },
        onClick: (e) => {
            if (e.detail === 0) fn();
        },
    });

    const handleCreateTags = () => {
        if (draftTags.length) {
            onCreateTagPlaylist(draftTags);
            setIsSelectingTags(false);
        }
    };

    if (isCreating) {
        return (
            <Placeholder
                icon={<FluentPlayerBlockIconSVG />}
                label={__('Create New Playlist', 'fluent-player')}
                instructions={__('Enter a title for your new playlist.', 'fluent-player')}
            >
                <div className="fluent-playlist-create-form">
                    <TextControl
                        label={__('Playlist Title', 'fluent-player')}
                        value={newTitle}
                        onChange={setNewTitle}
                        placeholder={__('My Playlist', 'fluent-player')}
                        className="fluent-playlist-title-input"
                        autoFocus
                    />
                    <div className="fluent-player-form-actions">
                        <Button
                            className="components-button fp-btn-secondary"
                            onClick={() => { setIsCreating(false); setNewTitle(''); }}
                        >
                            <BackArrowSmallSVG />
                            {__('Back', 'fluent-player')}
                        </Button>
                        <Button
                            className="components-button fp-btn-primary"
                            onClick={handleCreate}
                            disabled={!newTitle.trim()}
                        >
                            <PlusIconSVG />
                            {__('Create Playlist', 'fluent-player')}
                        </Button>
                    </div>
                </div>
            </Placeholder>
        );
    }

    if (isSelectingTags) {
        return (
            <Placeholder
                icon={<FluentPlayerBlockIconSVG />}
                label={isTagMode ? __('Update Tag Playlist', 'fluent-player') : __('Playlist by Tags', 'fluent-player')}
                instructions={__('Choose one or more tags. Media with these tags appears in the playlist automatically.', 'fluent-player')}
            >
                <div className="fluent-playlist-create-form">
                    <TagsPanel
                        tagsLoading={tagsLoading}
                        availableTags={availableTags}
                        tags={draftTags}
                        tagsError={tagsError}
                        onTagsChange={setDraftTags}
                        onRetry={retryTags}
                    />
                    <div className="fluent-player-form-actions">
                        <Button
                            className="components-button fp-btn-secondary"
                            {...activate(() => { setIsSelectingTags(false); setDraftTags(tags); })}
                        >
                            <BackArrowSmallSVG />
                            {__('Back', 'fluent-player')}
                        </Button>
                        <Button
                            className="components-button fp-btn-primary"
                            {...activate(handleCreateTags)}
                            disabled={!draftTags.length}
                        >
                            <PlusIconSVG />
                            {isTagMode
                                ? __('Update Tag Playlist', 'fluent-player')
                                : __('Create Tag Playlist', 'fluent-player')}
                        </Button>
                    </div>
                </div>
            </Placeholder>
        );
    }

    return (
        <Placeholder
            icon={<FluentPlayerBlockIconSVG />}
            label={__('FluentPlayer Playlist', 'fluent-player')}
            instructions={__('Select an existing playlist or create a new one.', 'fluent-player')}
        >
            <div className="fluent-player-media-options">
                <div className="fluent-player-media-buttons">
                    <Button
                        className="components-button fp-btn-secondary"
                        onClick={() => setIsCreating(true)}
                    >
                        <PlusIconSVG />
                        {__('New Playlist', 'fluent-player')}
                    </Button>
                    <Button
                        className="components-button fp-btn-secondary fp-btn-dynamic"
                        onClick={openTagSelector}
                    >
                        <TagIconSVG />
                        {__('By Tags', 'fluent-player')}
                    </Button>
                </div>

                {playlists && playlists.length > 0 && (
                    <>
                        <div className="fluent-player-media-separator">
                            <span>{__('OR', 'fluent-player')}</span>
                        </div>
                        <div className="fluent-player-existing-media">
                            <h4>{__('Select Existing Playlist', 'fluent-player')}</h4>
                            <MediaSelectDropdown
                                items={playlists}
                                value={selectedPlaylist || ''}
                                onChange={onSelect}
                                loadPage={loadPlaylistPage}
                                placeholder={__('Select a playlist', 'fluent-player')}
                                searchPlaceholder={__('Search playlists…', 'fluent-player')}
                                emptyText={__('No playlist found', 'fluent-player')}
                                showThumb={false}
                            />
                        </div>
                    </>
                )}
            </div>
        </Placeholder>
    );
};

export default PlaylistSelector;
