const { __ } = wp.i18n;
const { useState } = wp.element;
const { Button, Placeholder, TextControl } = wp.components;
import { FluentPlayerBlockIconSVG, BackArrowSmallSVG, PlusIconSVG, TagIconSVG } from '../../media/components/common/Icons';
import MediaSelectDropdown from '../../media/components/common/MediaSelectDropdown';
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
                            onClick={() => { setIsSelectingTags(false); setDraftTags(tags); }}
                        >
                            <BackArrowSmallSVG />
                            {__('Back', 'fluent-player')}
                        </Button>
                        <Button
                            className="components-button fp-btn-primary"
                            onClick={handleCreateTags}
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
