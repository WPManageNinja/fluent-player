const {__} = wp.i18n;
const {Button, Dropdown, MenuGroup, MenuItem} = wp.components;
const {useState} = wp.element;
import { formatTime, getIconByName, getLayerIconKey, getLayerSubType } from "@share/helper.js";

const getLayerDisplayTitle = (layer) => {
    if (layer.type === 'hotspot' && layer.hotspots?.length) {
        const titles = layer.hotspots.map((h) => (h.tooltip_text || '').trim()).filter(Boolean);
        return titles.length ? titles.join(', ') : __('Hotspot', 'fluent-player');
    }
    return layer.title || '';
};
import ConfirmPopover from "../common/ConfirmPopover.jsx";

/**
 * Individual Layer Item Component
 * Displays a single layer with edit/remove options
 */
const LayerItem = ({ layer, onEdit, onRemove }) => {
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, anchor: null });

    const showDeleteConfirm = (event) => {
        setDeleteConfirm({
            isOpen: true,
            anchor: event.currentTarget,
        });
    };

    const hideDeleteConfirm = () => {
        setDeleteConfirm({ isOpen: false, anchor: null });
    };

    const handleRemove = () => {
        onRemove();
        hideDeleteConfirm();
    };

    return (
        <div className="fluent-layer-item">
            <div className="layer-item-header">
                <div className="layer-info">
                    <span className="layer-icon"
                          dangerouslySetInnerHTML={{__html: getIconByName(getLayerIconKey(layer))}}
                    ></span>
                    <div className="layer-details">
                        <div>
                            <span className="layer-type">{ getLayerDisplayTitle(layer) }</span>
                            <span className="layer-type-separator"> - </span>
                            <span className="layer-subtype">{ getLayerSubType(layer) }</span>
                        </div>
                        <span className="layer-time">{ formatTime(layer.displayTime)}</span>
                    </div>
                </div>
                
                <div className="layer-actions">
                    <Dropdown
                        renderToggle={({ isOpen, onToggle }) => (
                            <Button
                                size="small"
                                variant="secondary"
                                onClick={onToggle}
                                aria-expanded={isOpen}
                            >
                                ⋯
                            </Button>
                        )}
                        renderContent={() => (
                            <MenuGroup>
                                <MenuItem onClick={() => onEdit(layer)}>
                                    {__('Edit', 'fluent-player')}
                                </MenuItem>
                                <MenuItem 
                                    onClick={showDeleteConfirm}
                                    className="is-destructive"
                                >
                                    {__('Remove', 'fluent-player')}
                                </MenuItem>
                            </MenuGroup>
                        )}
                    />
                </div>
            </div>

            <ConfirmPopover
                isOpen={deleteConfirm.isOpen}
                anchor={deleteConfirm.anchor}
                title={__('Remove Layer', 'fluent-player')}
                message={__('Are you sure you want to remove this layer? This action cannot be undone.', 'fluent-player')}
                confirmText={__('Remove', 'fluent-player')}
                cancelText={__('Cancel', 'fluent-player')}
                onConfirm={handleRemove}
                onCancel={hideDeleteConfirm}
            />
        </div>
    );
};

export default LayerItem;
