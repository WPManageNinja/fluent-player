const { __ } = wp.i18n;
const { ToolbarGroup, ToolbarDropdownMenu, MenuGroup, MenuItem } = wp.components;
const { external, moreVertical } = wp.icons || {};

/**
 * Toolbar dropdown with navigation links to FluentPlayer admin pages.
 *
 * @param {Object}  props
 * @param {number}  [props.mediaId]           ID of the currently loaded media.
 * @param {Object}  [props.adminUrls]         URL prefixes from blockVars.adminUrls.
 * @param {string}  [props.adminUrls.editBase]      e.g. "post.php?action=edit&post="
 * @param {string}  [props.adminUrls.analyticsBase] e.g. "admin.php?page=fluent-player#/analytics/video/"
 * @param {string}  [props.adminUrls.media]         e.g. "admin.php?page=fluent-player#/"
 * @param {boolean} [props.isDedicatedPlayer] Hide "Open in editor" when already on the CPT edit page.
 */
const QuickLinks = ({ mediaId, adminUrls = {}, isDedicatedPlayer = false }) => {
    const showOpenInEditor = !isDedicatedPlayer && mediaId && adminUrls.editBase;
    const showAnalytics    = mediaId && adminUrls.analyticsBase;
    const showMediaList    = !!adminUrls.media;

    if (!showOpenInEditor && !showAnalytics && !showMediaList) return null;

    return (
        <ToolbarGroup>
            <ToolbarDropdownMenu
                icon={external || moreVertical || 'admin-links'}
                label={__('FluentPlayer links', 'fluent-player')}
            >
                {({ onClose }) => (
                    <MenuGroup>
                        {showOpenInEditor && (
                            <MenuItem
                                href={`${adminUrls.editBase}${mediaId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={onClose}
                            >
                                {__('Open in FluentPlayer editor', 'fluent-player')}
                            </MenuItem>
                        )}
                        {showAnalytics && (
                            <MenuItem
                                href={`${adminUrls.analyticsBase}${mediaId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={onClose}
                            >
                                {__('View analytics for this media', 'fluent-player')}
                            </MenuItem>
                        )}
                        {showMediaList && (
                            <MenuItem
                                href={adminUrls.media}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={onClose}
                            >
                                {__('Manage all media', 'fluent-player')}
                            </MenuItem>
                        )}
                    </MenuGroup>
                )}
            </ToolbarDropdownMenu>
        </ToolbarGroup>
    );
};

export default QuickLinks;
