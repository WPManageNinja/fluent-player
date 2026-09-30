/**
 * Timed-content authoring for a page-builder canvas (Divi, Elementor) — a
 * standalone block editor mounted below the player, reusing the block editor's
 * TimedContentManager + real section block. Uses WP's React (wp.element), not the
 * builder's vendor React, as the block editor's stores/contexts require it.
 */
import TimedContentManager from '../components/TimedContentManager.jsx';
import TimedContentEdit from '../../timed-content/edit.jsx';
import {
    registerCoreEditorBlocks,
    parseTimedContentBlocks,
    createTimedContentSaver,
} from './timedContentEditor.js';
import { ensureCoreEditorStore } from './ensureCoreEditorStore.js';

const CONTAINER_BLOCK = 'fluent-player/divi-timed-content-root';
const SECTION_BLOCK = 'fluent-player/timed-content';
// Registered only so parse() recognises the CPT content and nests the children.
const MEDIA_BLOCK = 'fluent-player/media';

function getWp() {
    return window.wp || (window.vendor && window.vendor.wp) || {};
}

function restBase() {
    const rest = (window.fluentPlayerBlockVars && window.fluentPlayerBlockVars.rest) || {};
    return `/${rest.namespace || 'fluent-player'}/${rest.version || 'v2'}`;
}

/** Register the section + container blocks. Idempotent. */
function registerEditorBlocks(wp) {
    registerCoreEditorBlocks(wp);

    const el = wp.element.createElement;
    const { InnerBlocks, useBlockProps } = wp.blockEditor;
    const { registerBlockType, getBlockType } = wp.blocks;

    if (!getBlockType(MEDIA_BLOCK)) {
        registerBlockType(MEDIA_BLOCK, {
            apiVersion: 3,
            title: 'FluentPlayer',
            category: 'media',
            attributes: { mediaId: { type: 'number' } },
            supports: { inserter: false, html: false },
            edit: () => el('div', useBlockProps()),
            // Dynamic block (save:null) so parse() skips validating this shim against the real markup.
            save: () => null,
        });
    }

    if (!getBlockType(SECTION_BLOCK)) {
        registerBlockType(SECTION_BLOCK, {
            apiVersion: 3,
            title: 'Timed Content',
            category: 'media',
            parent: [CONTAINER_BLOCK],
            attributes: {
                startTime: { type: 'number', default: 0 },
                endTime: { type: 'number', default: 30 },
            },
            supports: { html: false, reusable: false, inserter: false },
            edit: TimedContentEdit,
            // Same markup the block editor saves, so Pro's TimedContentHandler renders identically.
            save: ({ attributes }) => el(
                'div',
                { className: 'fp-timed-content', 'data-start': attributes.startTime, 'data-end': attributes.endTime },
                el(InnerBlocks.Content)
            ),
        });
    }

    if (!getBlockType(CONTAINER_BLOCK)) {
        registerBlockType(CONTAINER_BLOCK, {
            apiVersion: 3,
            title: 'Timed Content Root',
            category: 'media',
            attributes: {
                duration: { type: 'number', default: 0 },
                timedContentStyle: { type: 'object', default: {} },
            },
            supports: { html: false, reusable: false, inserter: false },
            // Needs useBlockProps so the editor tags it [data-block=clientId], which
            // TimedContentManager's injected <style> selector targets for area styling.
            edit: ({ clientId, attributes }) => el(
                'div',
                useBlockProps(),
                el(
                    TimedContentManager,
                    {
                        clientId,
                        duration: attributes.duration || 0,
                        timedContentStyle: attributes.timedContentStyle || {},
                    },
                    el(InnerBlocks, {
                        allowedBlocks: [SECTION_BLOCK],
                        templateLock: false,
                        renderAppender: false,
                    })
                )
            ),
            save: () => el('div', useBlockProps.save(), el(InnerBlocks.Content)),
        });
    }
}

export default function TimedContentEditor({ mediaId }) {
    const wp = getWp();
    const el = wp.element.createElement;
    const { useState, useEffect, useRef, useCallback, useMemo } = wp.element;
    const be = wp.blockEditor || {};
    const { BlockEditorProvider, BlockList, WritingFlow, ObserveTyping, BlockTools } = be;
    const { Popover, SlotFillProvider, Spinner } = wp.components || {};
    const apiFetch = wp.apiFetch;

    // Without this stub, BlockEditorProvider throws on the missing core/editor store (blank canvas).
    ensureCoreEditorStore(wp);

    // Parse needs the section block registered first.
    registerEditorBlocks(wp);

    const [blocks, setBlocks] = useState([]);
    const [status, setStatus] = useState('loading'); // loading | ready | error
    const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
    const saverRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        if (!mediaId || !apiFetch) { setStatus('error'); return undefined; }
        setStatus('loading');
        apiFetch({ path: `${restBase()}/media/${mediaId}` })
            .then((res) => {
                if (cancelled) return;
                const media = (res && res.media) || res || {};
                const sections = parseTimedContentBlocks(wp, media.post_content || '');
                const settings = media.settings || {};
                const root = wp.blocks.createBlock(
                    CONTAINER_BLOCK,
                    { duration: settings.duration || 0, timedContentStyle: settings.timedContentStyle || {} },
                    sections
                );
                setBlocks([root]);
                setStatus('ready');
            })
            .catch(() => { if (!cancelled) setStatus('error'); });
        return () => { cancelled = true; };
    }, [mediaId]);

    // Live-sync only the root's timedContentStyle on mediaUpdated, preserving
    // sections (incl. unsaved edits), so sidebar style changes reflect without reload.
    useEffect(() => {
        if (!mediaId || !apiFetch) return undefined;
        const onUpdated = () => {
            apiFetch({ path: `${restBase()}/media/${mediaId}` })
                .then((res) => {
                    const settings = ((res && res.media) || res || {}).settings || {};
                    setBlocks((prev) => {
                        const root = prev && prev[0];
                        if (!root) return prev;
                        return [{
                            ...root,
                            attributes: {
                                ...root.attributes,
                                timedContentStyle: settings.timedContentStyle || {},
                                duration: settings.duration || root.attributes.duration || 0,
                            },
                        }];
                    });
                })
                .catch(() => {});
        };
        document.addEventListener('fluentPlayer/mediaUpdated', onUpdated);
        return () => document.removeEventListener('fluentPlayer/mediaUpdated', onUpdated);
    }, [mediaId]);

    // One saver per media. Recreate on media change and flush (not cancel) on
    // change/unmount, so edits made inside the debounce window aren't dropped when
    // the author switches media or closes the builder; save state is routed out so
    // a failed PUT surfaces instead of being swallowed.
    useEffect(() => {
        if (!apiFetch || !mediaId) return undefined;
        const saver = createTimedContentSaver({
            apiFetch,
            wp,
            mediaId,
            restBase: restBase(),
            onStateChange: setSaveState,
            onSaved: () => document.dispatchEvent(
                new CustomEvent('fluentPlayer/mediaUpdated', { detail: { mediaId: String(mediaId) } })
            ),
        });
        saverRef.current = saver;
        return () => { saver.flush(); saverRef.current = null; };
    }, [mediaId]);

    // Pro-only route; no-op without Pro, matching the block editor's gate.
    const scheduleSave = useCallback((next) => {
        const saver = saverRef.current;
        if (!saver || !(window.fluentPlayerBlockVars && window.fluentPlayerBlockVars.hasPro)) return;
        const root = next && next[0];
        saver.schedule((root && root.innerBlocks) || []);
    }, []);

    // BlockEditorProvider's scoped registry means these callbacks are the only way
    // to observe edits (the global store is empty).
    const onInput = useCallback((next) => { setBlocks(next); scheduleSave(next); }, [scheduleSave]);
    const onChange = useCallback((next) => { setBlocks(next); scheduleSave(next); }, [scheduleSave]);

    // Stable ref — a fresh object each render re-inits the provider and drops selection/focus.
    const editorSettings = useMemo(() => ({ hasFixedToolbar: true }), []);

    const __ = (wp.i18n && wp.i18n.__) ? wp.i18n.__ : (s) => s;

    if (!BlockEditorProvider || !BlockList) {
        return el('div', { style: { padding: 12, color: '#b91c1c', fontSize: 13 } },
            __('Timed content editor: block-editor packages unavailable.', 'fluent-player'));
    }
    if (status === 'loading') {
        return el('div', { className: 'fp-divi-tc-loading', style: { padding: 12 } }, Spinner ? el(Spinner) : __('Loading…', 'fluent-player'));
    }
    if (status === 'error') {
        return el('div', { style: { padding: 12, color: '#b91c1c', fontSize: 13 } }, __('Could not load timed content.', 'fluent-player'));
    }

    const canvas = el('div', { className: 'fp-divi-tc-editor block-editor-block-canvas' },
        el(WritingFlow || 'div', null,
            el(ObserveTyping || 'div', null,
                el(BlockList)
            )
        )
    );

    const provider = el(BlockEditorProvider, {
        value: blocks,
        onInput,
        onChange,
        settings: editorSettings,
    },
        BlockTools ? el(BlockTools, null, canvas) : canvas,
        Popover && el(Popover.Slot)
    );

    const saveNotice = saveState === 'error'
        ? el('div', {
            className: 'fp-divi-tc-save-error',
            role: 'alert',
            style: { display: 'flex', gap: 8, alignItems: 'center', padding: '6px 12px', margin: '0 0 8px', background: '#fcf0f1', color: '#b91c1c', borderRadius: 4, fontSize: 13 },
        },
            el('span', null, __('Couldn’t save timed content.', 'fluent-player')),
            el('button', {
                type: 'button',
                className: 'components-button is-link',
                onClick: () => { const s = saverRef.current; if (s) s.flush(); },
            }, __('Retry', 'fluent-player'))
        )
        : null;

    const tree = el(wp.element.Fragment, null,
        saveNotice,
        SlotFillProvider ? el(SlotFillProvider, null, provider) : provider
    );
    return tree;
}
