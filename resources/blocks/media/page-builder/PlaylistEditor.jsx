/**
 * Playlist authoring for a page-builder canvas: the standalone WP block editor for the
 * real fluent-player/playlist block — item body in the canvas, settings (BlockInspector)
 * portaled into the builder panel. Reuses the block's edit.jsx (which persists over REST)
 * wholesale. The block requires Pro; without it the block is unregistered.
 */
import { resolvePlaylistPanelMount } from './panelMount.js';
import { ensureCoreEditorStore } from './ensureCoreEditorStore.js';

const PLAYLIST_BLOCK = 'fluent-player/playlist';

function getWp() {
    return window.wp || (window.vendor && window.vendor.wp) || {};
}

// Selects the single block inside the scoped BlockEditorProvider store so the block
// inspector shows its settings (otherwise it reads "No block selected").
function AutoSelect({ wp, clientId }) {
    const dispatch = wp.data && wp.data.useDispatch ? wp.data.useDispatch('core/block-editor') : null;
    wp.element.useEffect(() => {
        if (clientId && dispatch && dispatch.selectBlock) dispatch.selectBlock(clientId);
    }, [clientId]);
    return null;
}

// Portals the block's settings (BlockInspector) from the canvas iframe into the
// widget panel's .fp-el-playlist-settings-mount (same-origin parent document). As a
// child of BlockEditorProvider, BlockInspector reads the scoped store. The mount is
// scoped to THIS widget by its element id (widgetId) — the panel hook stamps the open
// widget's id on the mount, so on a multi-widget canvas each editor only portals into
// its own panel. A MutationObserver tracks the mount appearing / being (re)stamped.
function InspectorPortal({ wp, BlockInspector, widgetId }) {
    const el = wp.element.createElement;
    const { useState, useEffect, createPortal } = wp.element;
    const [node, setNode] = useState(null);

    useEffect(() => {
        const pdoc = window.parent && window.parent.document;
        if (!pdoc || !pdoc.body) return undefined;
        const update = () => setNode(resolvePlaylistPanelMount(pdoc, widgetId));
        update();
        const obs = new MutationObserver(update);
        obs.observe(pdoc.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-fp-widget-id'],
        });
        return () => obs.disconnect();
    }, [widgetId]);

    if (!node || !createPortal) return null;
    return createPortal(el(BlockInspector), node);
}

export default function PlaylistEditor({ playlistId, widgetId, sourceType, tags, query }) {
    const wp = getWp();
    const __ = (wp.i18n && wp.i18n.__) ? wp.i18n.__.bind(wp.i18n) : (s) => s;
    const el = wp.element.createElement;
    const { useState } = wp.element;
    const be = wp.blockEditor || {};
    const { BlockEditorProvider, BlockList, BlockTools, BlockInspector, WritingFlow, ObserveTyping } = be;
    const { Popover, SlotFillProvider } = wp.components || {};

    // Without this stub, BlockEditorProvider throws on the missing core/editor store (blank canvas).
    ensureCoreEditorStore(wp);

    const hasBlock = wp.blocks && wp.blocks.getBlockType && wp.blocks.getBlockType(PLAYLIST_BLOCK);

    const [blocks, setBlocks] = useState(() => {
        if (!hasBlock || !wp.blocks.createBlock) return [];
        // Tag source: preview a dynamic tag playlist; otherwise a saved playlist by id.
        const attrs = sourceType === 'tags'
            ? { sourceType: 'tags', tags: Array.isArray(tags) ? tags : [], query: query || {} }
            : { playlistId: Number(playlistId) || 0 };
        return [wp.blocks.createBlock(PLAYLIST_BLOCK, attrs)];
    });

    if (!BlockEditorProvider || !BlockList || !hasBlock) {
        return el('div', { style: { padding: 12, color: '#b91c1c', fontSize: 13 } },
            __('Playlist editor unavailable — the playlist block requires Fluent Player Pro.', 'fluent-player'));
    }

    const mainCanvas = el('div', { className: 'block-editor-block-canvas' },
        el(WritingFlow || 'div', null,
            el(ObserveTyping || 'div', null,
                el(BlockList)
            )
        )
    );

    const main = el('div', { className: 'fp-pb-playlist-editor' },
        BlockTools ? el(BlockTools, null, mainCanvas) : mainCanvas
    );

    const provider = el(BlockEditorProvider, {
        value: blocks,
        onInput: setBlocks,
        onChange: setBlocks,
        settings: { hasFixedToolbar: true },
    },
        blocks[0] ? el(AutoSelect, { wp, clientId: blocks[0].clientId }) : null,
        main,
        BlockInspector ? el(InspectorPortal, { wp, BlockInspector, widgetId }) : null,
        Popover && el(Popover.Slot)
    );

    return SlotFillProvider ? el(SlotFillProvider, null, provider) : provider;
}
