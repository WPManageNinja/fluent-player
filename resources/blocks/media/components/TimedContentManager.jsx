import TimeRangeSlider, { secondsToMMSS } from './common/TimeRangeSlider.jsx';
import ShortcodeInserter from './common/ShortcodeInserter.jsx';
import { TimedContentContext } from './TimedContentContext.js';
import ProModal from './common/ProModal.jsx';
import { LockIconSVG } from './common/Icons.jsx';

const { __ } = wp.i18n;
const { useState, useEffect, useCallback, useMemo, useRef } = wp.element;
const { useSelect, useDispatch } = wp.data;
const { Button, Popover } = wp.components;

const EMPTY_ARRAY = [];

const sanitizeTimedContentPaddingValue = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();

        if (!trimmed) {
            return '0';
        }

        const match = trimmed.match(/-?\d*\.?\d+/);

        if (match) {
            return match[0];
        }
    }

    return '0';
};

const normalizeTimedContentPadding = (padding = {}) => {
    const unit = typeof padding.unit === 'string' && padding.unit ? padding.unit : 'px';
    const linked = padding.linked !== false;
    const top = sanitizeTimedContentPaddingValue(padding.top ?? '20');

    return {
        top,
        right: sanitizeTimedContentPaddingValue(padding.right ?? (linked ? top : '0')),
        bottom: sanitizeTimedContentPaddingValue(padding.bottom ?? (linked ? top : '0')),
        left: sanitizeTimedContentPaddingValue(padding.left ?? (linked ? top : '0')),
        unit,
        linked,
    };
};

const normalizeTimedContentStyle = (style = {}) => ({
    enabled: style.enabled !== false,
    padding: normalizeTimedContentPadding(style.padding),
    backgroundColor: style.backgroundColor ?? '',
    textColor: style.textColor ?? '',
});

const formatTimedContentPaddingCss = (padding) => {
    const normalizedPadding = normalizeTimedContentPadding(padding);

    return [
        `${normalizedPadding.top}${normalizedPadding.unit}`,
        `${normalizedPadding.right}${normalizedPadding.unit}`,
        `${normalizedPadding.bottom}${normalizedPadding.unit}`,
        `${normalizedPadding.left}${normalizedPadding.unit}`,
    ].join(' ');
};

const parseMMSS = (str) => {
    const match = str.trim().match(/^(\d{1,3}):(\d{1,2})$/);
    if (!match) return null;
    const secs = parseInt(match[2], 10);
    if (secs > 59) return null;
    return parseInt(match[1], 10) * 60 + secs;
};

const ClockIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const PlusIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const TimedContentManager = ({ clientId, duration, timedContentStyle, children }) => {
    const hasPro = !!window.fluentPlayerBlockVars?.hasPro;
    const [showProModal, setShowProModal] = wp.element.useState(false);
    const normalizedTimedContentStyle = useMemo(
        () => normalizeTimedContentStyle(timedContentStyle),
        [timedContentStyle]
    );

    if (!hasPro) {
        return (
            <>
                <div className="fp-tc-box fp-tc-box-locked">
                    <div className="fp-tc-box-header">
                        <div className="fp-tc-box-label">
                            <ClockIcon />
                            <span>{__('Timed Content', 'fluent-player')}</span>
                            <LockIconSVG size={14} />
                        </div>
                        <button
                            className="fp-tc-add-btn fp-btn-secondary components-button"
                            onClick={() => setShowProModal(true)}
                        >
                            <span>{__('Upgrade to Pro', 'fluent-player')}</span>
                        </button>
                    </div>
                    <div className="fp-tc-box-empty">
                        <p>{__('Show dynamic content at specific times during video playback.', 'fluent-player')}</p>
                    </div>
                </div>
                <div style={{ display: 'none' }}>
                    {children}
                </div>
                {showProModal && (
                    <ProModal
                        onClose={() => setShowProModal(false)}
                        feature={__('Timed Content', 'fluent-player')}
                    />
                )}
            </>
        );
    }

    const safeDuration = duration || 300;

    const childBlocks = useSelect(
        (select) => select('core/block-editor').getBlocks(clientId) || EMPTY_ARRAY,
        [clientId]
    );

    const selectedBlockClientId = useSelect(
        (select) => select('core/block-editor').getSelectedBlockClientId(),
        []
    );

    const selectedBlockParents = useSelect(
        (select) => {
            if (!selectedBlockClientId) {
                return EMPTY_ARRAY;
            }

            return select('core/block-editor').getBlockParents(selectedBlockClientId) || EMPTY_ARRAY;
        },
        [selectedBlockClientId]
    );

    const { insertBlock, removeBlock, updateBlockAttributes, selectBlock } = useDispatch('core/block-editor');

    // Track last known RichText selection inside a timed content section
    const savedSelectionRef = useRef(null);

    const isBlockInSection = useCallback((blockClientId, sectionClientId) => {
        if (blockClientId === sectionClientId) return true;
        const sectionBlock = wp.data.select('core/block-editor').getBlock(sectionClientId);
        if (!sectionBlock) return false;
        const find = (blocks) => {
            for (const b of blocks) {
                if (b.clientId === blockClientId) return true;
                if (b.innerBlocks?.length && find(b.innerBlocks)) return true;
            }
            return false;
        };
        return find(sectionBlock.innerBlocks || []);
    }, []);

    const currentSelection = useSelect(
        (select) => select('core/block-editor').getSelectionStart(),
        []
    );

    useEffect(() => {
        if (!currentSelection?.clientId || !currentSelection.attributeKey) return;
        const isInside = childBlocks.some((section) => isBlockInSection(currentSelection.clientId, section.clientId));
        if (isInside) {
            savedSelectionRef.current = { ...currentSelection };
        }
    }, [currentSelection, childBlocks, isBlockInSection]);

    const [activeClientId, setActiveClientId] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [editingTabClientId, setEditingTabClientId] = useState(null);
    const [newStartTime, setNewStartTime] = useState(0);
    const [newEndTime, setNewEndTime] = useState(30);
    const [startInput, setStartInput] = useState('00:00');
    const [endInput, setEndInput] = useState('00:30');
    const [addBtnEl, setAddBtnEl] = useState(null);

    // Sync activeClientId when child blocks change
    useEffect(() => {
        if (childBlocks.length === 0) {
            setActiveClientId(null);
            return;
        }
        const activeStillExists = childBlocks.some(b => b.clientId === activeClientId);
        if (!activeStillExists) {
            setActiveClientId(childBlocks[0].clientId);
        }
    }, [childBlocks, activeClientId]);

    // Sync with List View selection
    useEffect(() => {
        if (!selectedBlockClientId) return;

        const directMatch = childBlocks.find(b => b.clientId === selectedBlockClientId);
        if (directMatch) {
            setActiveClientId(directMatch.clientId);
            return;
        }

        for (const block of childBlocks) {
            if (selectedBlockParents.includes(block.clientId)) {
                setActiveClientId(block.clientId);
                return;
            }
        }
    }, [selectedBlockClientId, selectedBlockParents, childBlocks]);

    // Effective active ID — avoids flash on first render by falling back to first child
    const effectiveActiveId = activeClientId || (childBlocks.length > 0 ? childBlocks[0].clientId : null);

    const handleSmartcodeInsert = useCallback((code) => {
        const selection = savedSelectionRef.current;
        const blockEditor = wp.data.select('core/block-editor');
        const { create, insert, toHTMLString } = wp.richText;

        if (selection && selection.clientId && selection.attributeKey && effectiveActiveId) {
            // Ensure saved selection belongs to the currently active section
            if (isBlockInSection(selection.clientId, effectiveActiveId)) {
                const block = blockEditor.getBlock(selection.clientId);
                if (block) {
                    const currentHTML = block.attributes[selection.attributeKey] || '';
                    const richValue = create({ html: currentHTML });
                    const codeValue = create({ text: code });
                    const offset = selection.offset ?? richValue.text.length;
                    const merged = insert(richValue, codeValue, offset, offset);
                    const newHTML = toHTMLString({ value: merged });
                    updateBlockAttributes(selection.clientId, { [selection.attributeKey]: newHTML });
                    return;
                }
            }
        }

        // Fallback: insert a new paragraph block with the smartcode
        if (effectiveActiveId) {
            const newBlock = wp.blocks.createBlock('core/paragraph', { content: code });
            const activeBlock = blockEditor.getBlock(effectiveActiveId);
            const innerCount = activeBlock?.innerBlocks?.length || 0;
            insertBlock(newBlock, innerCount, effectiveActiveId);
        }
    }, [effectiveActiveId, updateBlockAttributes, insertBlock]);

    // Container CSS for InnerBlocks area (padding, bg, text color)
    const containerCss = useMemo(() => {
        const s = normalizedTimedContentStyle;
        const parts = [];

        if (s.padding) {
            parts.push(`padding: ${formatTimedContentPaddingCss(s.padding)}`);
        }

        if (s.backgroundColor) parts.push(`background-color: ${s.backgroundColor}`);
        if (s.textColor) parts.push(`color: ${s.textColor}`);
        return parts.length ? parts.join('; ') : '';
    }, [normalizedTimedContentStyle]);

    // Sync text inputs with slider
    useEffect(() => { setStartInput(secondsToMMSS(newStartTime)); }, [newStartTime]);
    useEffect(() => { setEndInput(secondsToMMSS(newEndTime)); }, [newEndTime]);

    const openAddPopover = useCallback(() => {
        const lastBlock = childBlocks[childBlocks.length - 1];
        const start = lastBlock ? lastBlock.attributes.endTime : 0;
        const end = Math.min(start + 30, safeDuration);
        setNewStartTime(start);
        setNewEndTime(end);
        setStartInput(secondsToMMSS(start));
        setEndInput(secondsToMMSS(end));
        setEditingTabClientId(null);
        setIsAddingNew(true);
    }, [childBlocks, safeDuration]);

    const openEditPopover = useCallback((block, anchorEl) => {
        setNewStartTime(block.attributes.startTime);
        setNewEndTime(block.attributes.endTime);
        setStartInput(secondsToMMSS(block.attributes.startTime));
        setEndInput(secondsToMMSS(block.attributes.endTime));
        setEditingTabClientId(block.clientId);
        setAddBtnEl(anchorEl);
        setIsAddingNew(true);
    }, []);

    const handleConfirmAdd = useCallback(() => {
        if (editingTabClientId) {
            updateBlockAttributes(editingTabClientId, {
                startTime: newStartTime,
                endTime: newEndTime,
            });
        } else {
            const block = wp.blocks.createBlock('fluent-player/timed-content', {
                startTime: newStartTime,
                endTime: newEndTime,
            });
            insertBlock(block, childBlocks.length, clientId);
            setTimeout(() => setActiveClientId(block.clientId), 50);
        }
        setIsAddingNew(false);
        setEditingTabClientId(null);
    }, [editingTabClientId, newStartTime, newEndTime, updateBlockAttributes, insertBlock, childBlocks.length, clientId]);

    const handleDeleteTab = useCallback((blockClientId) => {
        removeBlock(blockClientId);
    }, [removeBlock]);

    const commitStartInput = () => {
        const parsed = parseMMSS(startInput);
        if (parsed !== null) setNewStartTime(Math.min(parsed, newEndTime));
        else setStartInput(secondsToMMSS(newStartTime));
    };

    const commitEndInput = () => {
        const parsed = parseMMSS(endInput);
        if (parsed !== null) setNewEndTime(Math.max(parsed, newStartTime));
        else setEndInput(secondsToMMSS(newEndTime));
    };

    // --- RENDER ---

    const hasChildren = childBlocks.length > 0;

    return (
        <TimedContentContext.Provider value={effectiveActiveId}>
            <div className={`fp-tc-box${hasChildren ? ' has-content' : ''}`}>
                {/* Header */}
                <div className="fp-tc-box-header">
                    <div className="fp-tc-box-label">
                        <ClockIcon />
                        <span>{__('Timed Content', 'fluent-player')}</span>
                    </div>

                    {hasChildren && (
                        <div className="fp-tc-tab-list" role="tablist">
                            {childBlocks.map((block) => {
                                const { startTime, endTime } = block.attributes;
                                const isActive = block.clientId === effectiveActiveId;
                                return (
                                    <div
                                        key={block.clientId}
                                        role="tab"
                                        tabIndex={0}
                                        aria-selected={isActive}
                                        className={`fp-tc-tab${isActive ? ' is-active' : ''}`}
                                        onClick={() => {
                                            setActiveClientId(block.clientId);
                                            selectBlock(block.clientId);
                                        }}
                                        onDoubleClick={(e) => openEditPopover(block, e.currentTarget)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                openEditPopover(block, e.currentTarget);
                                            }
                                        }}
                                        title={__('Double-click or press Enter to edit time', 'fluent-player')}
                                    >
                                        <span className="fp-tc-tab-time">
                                            {secondsToMMSS(startTime)} → {secondsToMMSS(endTime)}
                                        </span>
                                        <button
                                            className="fp-tc-tab-delete"
                                            aria-label={__('Remove section', 'fluent-player')}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTab(block.clientId);
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {hasChildren && (
                        <ShortcodeInserter
                            onInsert={handleSmartcodeInsert}
                        />
                    )}

                    <button
                        className="fp-tc-add-btn fp-btn-secondary components-button"
                        ref={setAddBtnEl}
                        onClick={openAddPopover}
                        title={__('Add timed content section', 'fluent-player')}
                    >
                        <PlusIcon />
                        <span>{__('Add Content', 'fluent-player')}</span>
                    </button>
                </div>

                {/* Empty state body */}
                {!hasChildren && (
                    <div className="fp-tc-box-empty">
                        <p>{__('Show dynamic content at specific times during video playback', 'fluent-player')}</p>
                    </div>
                )}

                {/* Popover for add/edit */}
                {isAddingNew && addBtnEl && (
                    <Popover
                        anchor={addBtnEl}
                        placement="bottom-end"
                        onClose={() => { setIsAddingNew(false); setEditingTabClientId(null); }}
                        className="fp-tc-add-popover"
                        flip={true}
                        shift={true}
                    >
                        <div className="fp-tc-add-popover-content">
                            <h4>{editingTabClientId ? __('Edit Time Range', 'fluent-player') : __('Set Time Range', 'fluent-player')}</h4>

                            <TimeRangeSlider
                                min={0}
                                max={safeDuration}
                                startValue={newStartTime}
                                endValue={newEndTime}
                                onStartChange={setNewStartTime}
                                onEndChange={setNewEndTime}
                            />

                            <div className="fp-tc-time-inputs">
                                <div className="fp-tc-time-field">
                                    <label>{__('Start', 'fluent-player')}</label>
                                    <input
                                        type="text"
                                        className="fp-tc-time-input"
                                        value={startInput}
                                        onChange={(e) => setStartInput(e.target.value)}
                                        onBlur={commitStartInput}
                                        onKeyDown={(e) => e.key === 'Enter' && commitStartInput()}
                                        placeholder="00:00"
                                    />
                                </div>
                                <span className="fp-tc-separator">→</span>
                                <div className="fp-tc-time-field">
                                    <label>{__('End', 'fluent-player')}</label>
                                    <input
                                        type="text"
                                        className="fp-tc-time-input"
                                        value={endInput}
                                        onChange={(e) => setEndInput(e.target.value)}
                                        onBlur={commitEndInput}
                                        onKeyDown={(e) => e.key === 'Enter' && commitEndInput()}
                                        placeholder="00:30"
                                    />
                                </div>
                            </div>

                            <div className="fp-tc-add-popover-footer">
                                <Button variant="secondary" onClick={() => { setIsAddingNew(false); setEditingTabClientId(null); }}>
                                    {__('Cancel', 'fluent-player')}
                                </Button>
                                <Button variant="primary" onClick={handleConfirmAdd}>
                                    {editingTabClientId ? __('Update', 'fluent-player') : __('Add', 'fluent-player')}
                                </Button>
                            </div>
                        </div>
                    </Popover>
                )}
            </div>

            {/* Container styles for InnerBlocks area */}
            {hasChildren && containerCss && (
                <style>{`[data-block="${clientId}"] > .block-editor-inner-blocks { ${containerCss} }`}</style>
            )}

            {/* InnerBlocks passed as children */}
            {children}
        </TimedContentContext.Provider>
    );
};

export default TimedContentManager;
