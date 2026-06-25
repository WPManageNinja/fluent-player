const { __, sprintf } = wp.i18n;
const { SelectControl, BaseControl } = wp.components;
import CustomToggle from '../../../media/components/common/CustomToggle.jsx';
import CustomRangeSlider from '../../../media/components/common/CustomRangeSlider.jsx';
import { LayoutStandardIconSVG, LayoutGridIconSVG } from '../../../media/components/common/Icons.jsx';
import { getDefaultAspectRatio, normalizeRatioForSelect } from '../../utils/ratio.js';

/**
 * Layout type visual selector component
 */
const LayoutTypeSelector = ({ value, onChange }) => {
    const layouts = [
        {
            type: 'standard',
            name: __('Standard', 'fluent-player'),
            description: __('Classic sidebar layout', 'fluent-player'),
            icon: LayoutStandardIconSVG
        },
        {
            type: 'grid',
            name: __('Grid', 'fluent-player'),
            description: __('Streaming style grid', 'fluent-player'),
            icon: LayoutGridIconSVG
        }
    ];

    return (
        <div className="fp-layout-selector">
            <p className="fp-layout-selector-label">{__('Choose Layout Style', 'fluent-player')}</p>
            <div className="fp-layout-cards">
                {layouts.map(layout => {
                    const Icon = layout.icon;
                    const isSelected = value === layout.type;
                    return (
                        <button
                            key={layout.type}
                            type="button"
                            className={`fp-layout-card ${isSelected ? 'fp-layout-card--selected' : ''}`}
                            onClick={() => onChange(layout.type)}
                        >
                            <div className="fp-layout-card-icon">
                                <Icon />
                            </div>
                            <div className="fp-layout-card-content">
                                <span className="fp-layout-card-title">{layout.name}</span>
                                <span className="fp-layout-card-desc">{layout.description}</span>
                            </div>
                            <div className={`fp-layout-card-radio ${isSelected ? 'fp-layout-card-radio--selected' : ''}`}>
                                {isSelected && <div className="fp-layout-card-radio-dot"></div>}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

/**
 * Position selector for standard layout
 */
const PositionSelector = ({ value, onChange }) => {
    const positions = [
        { value: 'left', label: __('Left', 'fluent-player') },
        { value: 'right', label: __('Right', 'fluent-player') },
        { value: 'top', label: __('Top', 'fluent-player') },
        { value: 'bottom', label: __('Bottom', 'fluent-player') }
    ];

    return (
        <div className="fp-position-selector">
            <div className="fp-position-grid">
                {positions.map(pos => {
                    const isSelected = value === pos.value;
                    return (
                        <button
                            key={pos.value}
                            type="button"
                            className={`fp-position-option ${isSelected ? 'fp-position-option--selected' : ''}`}
                            onClick={() => onChange(pos.value)}
                        >
                            <div className={`fp-position-preview fp-position-preview--${pos.value}`}>
                                <div className="fp-position-preview-box">
                                    <div className="fp-position-preview-player">
                                        <svg width="8" height="9" viewBox="0 0 8 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M7.5 4.5L0.75 8.39711L0.75 0.602886L7.5 4.5Z" fill="currentColor"/>
                                        </svg>
                                    </div>
                                    <div className="fp-position-preview-playlist"></div>
                                </div>
                            </div>
                            <span className={`fp-position-label ${isSelected ? 'fp-position-label--selected' : ''}`}>{pos.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

/**
 * Layout Settings panel for playlist block
 */
const LayoutSettings = ({ playlistData, updatePlaylistData }) => {
    const settings = playlistData?.settings || {};
    const layout = settings.layout || {};
    const behavior = settings.behavior || {};
    const grid = settings.grid || {};

    const updateLayout = (key, value) => {
        updatePlaylistData({
            ...playlistData,
            settings: {
                ...settings,
                layout: {
                    ...layout,
                    [key]: value
                }
            }
        });
    };

    const updateBehavior = (key, value) => {
        updatePlaylistData({
            ...playlistData,
            settings: {
                ...settings,
                behavior: {
                    ...behavior,
                    [key]: value
                }
            }
        });
    };

    const updateGrid = (key, value) => {
        updatePlaylistData({
            ...playlistData,
            settings: {
                ...settings,
                grid: {
                    ...grid,
                    [key]: value
                }
            }
        });
    };

    const defaultAspectRatio = getDefaultAspectRatio();
    const selectedRatio = normalizeRatioForSelect(layout.thumbnailRatio);
    const baseRatioOptions = [
        { label: __('Default', 'fluent-player') + (defaultAspectRatio !== 'original' ? ` (${defaultAspectRatio})` : ' (Original)'), value: 'default' },
        { label: __('Original', 'fluent-player'), value: 'original' },
        { label: __('Wide - 16:9', 'fluent-player'), value: '16:9' },
        { label: __('Standard - 4:3', 'fluent-player'), value: '4:3' },
        { label: __('Square - 1:1', 'fluent-player'), value: '1:1' },
        { label: __('Tall - 9:16', 'fluent-player'), value: '9:16' },
        { label: __('Classic - 3:2', 'fluent-player'), value: '3:2' },
        { label: __('Classic Portrait - 2:3', 'fluent-player'), value: '2:3' }
    ];

    const ratioOptions = [...baseRatioOptions];
    if (selectedRatio && !ratioOptions.some((option) => option.value === selectedRatio)) {
        ratioOptions.push({
            label: sprintf(__('Custom (%s)', 'fluent-player'), selectedRatio),
            value: selectedRatio
        });
    }

    return (
        <BaseControl>
            <div className="fluent-player-general-settings">
                {/* Layout Type Selector */}
                <LayoutTypeSelector
                    value={layout.type || 'standard'}
                    onChange={(value) => updateLayout('type', value)}
                />

                {/* Player Aspect Ratio — applies to all layouts */}
                <div className="fluent-player-form-row">
                    <SelectControl
                        label={__('Player Ratio', 'fluent-player')}
                        value={selectedRatio}
                        options={ratioOptions}
                        onChange={(value) => updateLayout('thumbnailRatio', value)}
                    />
                </div>

                {/* Standard Layout Options */}
                {(layout.type === 'standard' || !layout.type) && (
                    <div className="fp-layout-options-panel">
                        <PositionSelector
                            value={layout.position || 'right'}
                            onChange={(value) => updateLayout('position', value)}
                        />

                        <CustomToggle
                            label={__('Show Playlist Header', 'fluent-player')}
                            help={__('Display playlist title and video count', 'fluent-player')}
                            checked={layout.showHeader !== false}
                            onChange={(value) => updateLayout('showHeader', value)}
                        />

                        <CustomToggle
                            label={__('Show Thumbnails', 'fluent-player')}
                            help={__('Display video thumbnails in playlist', 'fluent-player')}
                            checked={behavior.showThumbnails !== false}
                            onChange={(value) => updateBehavior('showThumbnails', value)}
                        />

                        {behavior.showThumbnails !== false && (
                            <>
                                <CustomToggle
                                    label={__('Grid-style Thumbnails', 'fluent-player')}
                                    help={__('Arrange thumbnails in a grid (default: vertical list)', 'fluent-player')}
                                    checked={behavior.thumbnailGridLayout || false}
                                    onChange={(value) => updateBehavior('thumbnailGridLayout', value)}
                                />

                                {behavior.thumbnailGridLayout && (
                                    <>
                                        <CustomToggle
                                            label={__('Show Video Title', 'fluent-player')}
                                            help={__('Display title on video thumbnails', 'fluent-player')}
                                            checked={behavior.showThumbnailInfo !== false}
                                            onChange={(value) => updateBehavior('showThumbnailInfo', value)}
                                        />

                                        {behavior.showThumbnailInfo !== false && (
                                            <div className="fluent-player-form-row">
                                                <SelectControl
                                                    label={__('Title Position', 'fluent-player')}
                                                    value={behavior.titlePosition || 'overlay'}
                                                    options={[
                                                        { label: __('Overlay on Thumbnail', 'fluent-player'), value: 'overlay' },
                                                        { label: __('Below Thumbnail', 'fluent-player'), value: 'below' }
                                                    ]}
                                                    onChange={(value) => updateBehavior('titlePosition', value)}
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        {/* Sidebar Width - only for left/right positions */}
                        {(layout.position === 'left' || layout.position === 'right') && (
                            <CustomRangeSlider
                                label={__('Sidebar Width', 'fluent-player')}
                                value={layout.sidebarWidth || 40}
                                onChange={(value) => updateLayout('sidebarWidth', value)}
                                min={20}
                                max={60}
                                unit="%"
                            />
                        )}
                    </div>
                )}

                {/* Learning Layout Options - commented out
                {layout.type === 'learning' && (
                    <>
                        <ToggleControl
                            label={__('Enable Progress Tracking', 'fluent-player')}
                            help={__('Track user progress through lessons', 'fluent-player')}
                            checked={learning.enableProgress !== false}
                            onChange={(value) => updateLearning('enableProgress', value)}
                        />

                        <ToggleControl
                            label={__('Enable Chapters', 'fluent-player')}
                            help={__('Organize content into chapters', 'fluent-player')}
                            checked={learning.enableChapters !== false}
                            onChange={(value) => updateLearning('enableChapters', value)}
                        />

                        <ToggleControl
                            label={__('Show Locked Content', 'fluent-player')}
                            help={__('Display locked lessons to users', 'fluent-player')}
                            checked={learning.showLockedContent !== false}
                            onChange={(value) => updateLearning('showLockedContent', value)}
                        />

                        <RangeControl
                            label={__('Completion Threshold (%)', 'fluent-player')}
                            help={__('Percentage of video to mark as complete', 'fluent-player')}
                            value={learning.completionThreshold || 80}
                            onChange={(value) => updateLearning('completionThreshold', value)}
                            min={50}
                            max={100}
                            step={5}
                        />
                    </>
                )}
                */}

                {/* Grid Layout Options */}
                {layout.type === 'grid' && (
                    <div className="fp-layout-options-panel">
                        <div className="fluent-player-form-row">
                            <SelectControl
                                label={__('Video Player Mode', 'fluent-player')}
                                help={__('How the video player appears when a thumbnail is clicked', 'fluent-player')}
                                value={grid.displayMode || 'inline'}
                                options={[
                                    { label: __('Inline Player', 'fluent-player'), value: 'inline' },
                                    { label: __('Modal Overlay', 'fluent-player'), value: 'modal' }
                                ]}
                                onChange={(value) => updateGrid('displayMode', value)}
                            />
                        </div>

                        {grid.displayMode === 'inline' && (
                            <CustomToggle
                                label={__('Player Above Grid', 'fluent-player')}
                                help={__('Show the video player above the thumbnail grid', 'fluent-player')}
                                checked={grid.showPlayerOnTop !== false}
                                onChange={(value) => updateGrid('showPlayerOnTop', value)}
                            />
                        )}

                        <CustomRangeSlider
                            label={__('Grid Columns', 'fluent-player')}
                            help={__('Number of columns in the thumbnail grid', 'fluent-player')}
                            value={grid.columns || 3}
                            onChange={(value) => updateGrid('columns', value)}
                            min={2}
                            max={6}
                        />

                        <CustomRangeSlider
                            label={__('Videos Per Page', 'fluent-player')}
                            help={__('Number of videos shown before pagination', 'fluent-player')}
                            value={grid.itemsPerPage || 12}
                            onChange={(value) => updateGrid('itemsPerPage', value)}
                            min={3}
                            max={24}
                            step={3}
                        />

                        {grid.displayMode === 'modal' && (
                            <div className="fluent-player-form-row">
                                <SelectControl
                                    label={__('Modal Layout', 'fluent-player')}
                                    value={grid.modalLayout || 'centered'}
                                    options={[
                                        { label: __('Centered', 'fluent-player'), value: 'centered' },
                                        { label: __('Fullscreen', 'fluent-player'), value: 'fullscreen' }
                                    ]}
                                    onChange={(value) => updateGrid('modalLayout', value)}
                                />
                            </div>
                        )}

                        <CustomToggle
                            label={__('Show Video Title', 'fluent-player')}
                            help={__('Display title on video thumbnails', 'fluent-player')}
                            checked={behavior.showThumbnailInfo !== false}
                            onChange={(value) => updateBehavior('showThumbnailInfo', value)}
                        />

                        {behavior.showThumbnailInfo !== false && (
                            <div className="fluent-player-form-row">
                                <SelectControl
                                    label={__('Title Position', 'fluent-player')}
                                    value={behavior.titlePosition || 'below'}
                                    options={[
                                        { label: __('Overlay on Thumbnail', 'fluent-player'), value: 'overlay' },
                                        { label: __('Below Thumbnail', 'fluent-player'), value: 'below' }
                                    ]}
                                    onChange={(value) => updateBehavior('titlePosition', value)}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </BaseControl>
    );
};

export default LayoutSettings;
