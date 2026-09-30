const { __ } = wp.i18n;
const { useState } = wp.element;
// Fallback covers WordPress versions that only expose the experimental alias.
const BoxControl = wp.components.BoxControl || wp.components.__experimentalBoxControl;

import {
    TimedContentWatchIconSVG,
    LockIconSVG
} from '../common/Icons.jsx';
import ProModal from '../common/ProModal.jsx';
import ColorPickerInput from '../common/ColorPickerInput.jsx';
import CustomToggle from '../common/CustomToggle.jsx';

const createDefaultTimedContentPadding = () => ({
    top: '20',
    right: '20',
    bottom: '20',
    left: '20',
    unit: 'px',
    linked: true,
});

const createZeroTimedContentPadding = (unit = 'px', linked = true) => ({
    top: '0',
    right: '0',
    bottom: '0',
    left: '0',
    unit,
    linked,
});

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

const normalizeTimedContentPadding = (padding) => {
    const fallback = createDefaultTimedContentPadding();
    const source = padding || fallback;
    const unit = typeof source.unit === 'string' && source.unit ? source.unit : fallback.unit;
    const linked = source.linked !== false;
    const sharedValue = sanitizeTimedContentPaddingValue(source.top ?? fallback.top);

    return {
        top: sanitizeTimedContentPaddingValue(source.top ?? sharedValue),
        right: sanitizeTimedContentPaddingValue(source.right ?? (linked ? sharedValue : '0')),
        bottom: sanitizeTimedContentPaddingValue(source.bottom ?? (linked ? sharedValue : '0')),
        left: sanitizeTimedContentPaddingValue(source.left ?? (linked ? sharedValue : '0')),
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

const TimedContentStylePanel = ({ style, onChange }) => {
    const hasPro = !!window.fluentPlayerBlockVars?.hasPro;
    const [isProModalOpen, setIsProModalOpen] = useState(false);
    const normalizedStyle = normalizeTimedContentStyle(style);

    if (!hasPro) {
        return (
            <>
                <div className="components-base-control">
                    <div className="layer-card" style={{ cursor: 'pointer' }} onClick={() => setIsProModalOpen(true)}>
                        <div className="layer-info">
                            <div className="layer-title-row">
                                <div className="layer-type-info">
                                    <span className="layer-icon"><TimedContentWatchIconSVG /></span>
                                    <span className="layer-title">{__('Timed Content', 'fluent-player')}</span>
                                </div>
                                <LockIconSVG size={14} />
                            </div>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--fp-text-sub-600, #525866)' }}>
                            {__('Show dynamic content at specific times during video playback.', 'fluent-player')}
                        </p>
                    </div>
                </div>
                {isProModalOpen && (
                    <ProModal
                        onClose={() => setIsProModalOpen(false)}
                        feature={__('Timed Content', 'fluent-player')}
                    />
                )}
            </>
        );
    }

    const update = (key, value) => onChange({ ...normalizedStyle, [key]: value });
    const isEnabled = normalizedStyle.enabled;

    return (
        <div className="components-base-control" data-fp-timed-content-style-panel="true">
            <div className="fluent-player-form-row">
                <CustomToggle
                    label={__('Show Timed Content', 'fluent-player')}
                    checked={isEnabled}
                    onChange={(val) => update('enabled', val)}
                />
            </div>
            {isEnabled && (
                <>
                    <div className="fluent-player-form-row fp-custom-boxcontrol">
                        <BoxControl
                            label={__('Padding', 'fluent-player')}
                            values={normalizedStyle.padding}
                            resetValues={createDefaultTimedContentPadding()}
                            onChange={(val) => update(
                                'padding',
                                normalizeTimedContentPadding(
                                    val || createZeroTimedContentPadding(normalizedStyle.padding.unit, normalizedStyle.padding.linked)
                                )
                            )}
                            __nextHasNoMarginBottom
                            __next40pxDefaultSize
                        />
                    </div>
                    <div className="fluent-player-form-row">
                        <div className="fp-color-section">
                            <label className="fp-color-section-label components-base-control__label">
                                {__('Colors', 'fluent-player')}
                            </label>
                            <div className="fp-color-trigger-list">
                                <ColorPickerInput
                                    asTrigger
                                    label={__('Background', 'fluent-player')}
                                    value={normalizedStyle.backgroundColor}
                                    defaultValue=""
                                    onChange={(val) => update('backgroundColor', val)}
                                />
                                <ColorPickerInput
                                    asTrigger
                                    label={__('Text', 'fluent-player')}
                                    value={normalizedStyle.textColor}
                                    defaultValue=""
                                    onChange={(val) => update('textColor', val)}
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TimedContentStylePanel;
