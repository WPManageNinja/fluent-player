const {__} = wp.i18n;
const {useMemo} = wp.element;
import { getIconByName, getLayerIconKey } from "@share/helper.js";

/**
 * Layer Type Selector Component
 */
const LayerTypeSelector = ({ onSelect, activeTab, setActiveTab }) => {
    const hasPro = !!window.fluentPlayerBlockVars?.hasPro;

    const lockIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
            <path d="M17 9h-1V7a4 4 0 00-8 0v2H7a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2v-8a2 2 0 00-2-2zm-7-2a2 2 0 114 0v2h-4V7z"/>
        </svg>
    `;

    const layerTypes = [
        {
            formType: 'fluentforms',
            title: __('Fluent Forms', 'fluent-player'),
            icon: getIconByName(getLayerIconKey({ type: 'form', form_type: 'fluentforms' })),
            description: __('Collect user input using Fluent Forms', 'fluent-player'),
            color: '#4CAF50',
            type: 'form',
            disabled: !window.fluentPlayerBlockVars?.formTypes?.fluentforms?.enable
        },
        {
            cta_type: 'text',
            title: __('CTA', 'fluent-player'),
            icon: getIconByName('cta'),
            description: __('Display a call to action layer', 'fluent-player'),
            color: '#2196F3',
            type: 'cta',
            requiresPro: true
        },
        {
            cta_type: 'email',
            title: __('Email Capture', 'fluent-player'),
            icon: getIconByName('email'),
            description: __('Collect email addresses from viewers', 'fluent-player'),
            color: '#2196F3',
            type: 'cta'
        },
        {
            title: __('Hotspot', 'fluent-player'),
            icon: getIconByName('hotspot'),
            description: __('Add interactive clickable areas on the video', 'fluent-player'),
            color: '#FF9800',
            type: 'hotspot',
            requiresPro: true
        },
        {
            adType: 'video',
            title: __('Ad', 'fluent-player'),
            icon: getIconByName('ad'),
            description: __('Display a advertisement layer', 'fluent-player'),
            color: '#9C27B0',
            type: 'ad',
            requiresPro: true
        },
        {
            title: __('Shortcode', 'fluent-player'),
            icon: getIconByName('shortcode'),
            description: __('Display custom shortcode content as a layer', 'fluent-player'),
            color: '#9C27B0',
            type: 'shortcode',
            requiresPro: true
        }
    ];

    // Get unique categories for tabs
    const uniqueCategories = useMemo(() => {
        return layerTypes.reduce((acc, layer) => {
            if (!acc.includes(layer.type)) {
                acc.push(layer.type);
            }
            return acc;
        }, []);
    }, []);

    // Create tabs array with "all" as the first item
    const allTabs = useMemo(() => {
        return ['all', ...uniqueCategories];
    }, [uniqueCategories]);

    // Filter layers based on active tab
    const filteredLayers = useMemo(() => {
        if (activeTab === 'all') {
            return layerTypes;
        }
        return layerTypes.filter(layer => layer.type === activeTab);
    }, [activeTab, layerTypes]);

    /**
     * Gets the display text for a tab type.
     */
    const getTabDisplayText = (type) => {
        switch (type) {
            case 'all':
                return __('All', 'fluent-player');
            case 'form':
                return __('Forms', 'fluent-player');
            case 'cta':
                return __('CTA', 'fluent-player');
            case 'hotspot':
                return __('Hotspot', 'fluent-player');
            case 'ad':
                return __('Ad', 'fluent-player');
            case 'shortcode':
                return __('Shortcode', 'fluent-player');
            default:
                return type.charAt(0).toUpperCase() + type.slice(1);
        }
    };

    return (
        <div className="layer-type-selector">
            {/* Tab Navigation */}
            <div className="layer-tabs">
                {allTabs.map((tab) => {
                    const displayText = getTabDisplayText(tab);
                    if (!displayText) return null;
                    return (
                        <button
                            key={tab}
                            className={`layer-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {displayText}
                        </button>
                    );
                })}
            </div>

            {/* Layer Cards */}
            <div className="layer-cards-grid">
                {filteredLayers.map((layerType, index) => (
                    (() => {
                        const isLocked = !hasPro && layerType.requiresPro;
                        return (
                    <div
                        key={`${layerType.type}-${index}`}
                        className={`layer-type-card ${layerType.disabled ? 'layer-type-card-disabled' : ''} ${isLocked ? 'layer-type-card-locked' : ''}`}
                        onClick={() => onSelect(layerType)}
                        style={{ '--accent-color': layerType.color }}
                    >
                        {isLocked && (
                            <span
                                className="layer-type-lock"
                                dangerouslySetInnerHTML={{ __html: lockIcon }}
                            />
                        )}
                        <div className="layer-type-icon" dangerouslySetInnerHTML={{ __html: layerType.icon }}></div>
                        <div className="layer-type-content">
                            <h4>{layerType.title}</h4>
                            {!layerType.disabled && <p>{layerType.description}</p>}
                            {layerType.disabled && layerType.type === 'form' && (
                                <p className="disabled-message">
                                    {__(`${layerType.title} is not active. Please install and activate the plugin.`, 'fluent-player')}
                                </p>
                            )}
                        </div>
                    </div>
                        );
                    })()
                ))}
            </div>

            {filteredLayers.length === 0 && (
                <div className="no-layers-message">
                    <p>{__('No layers available for this category.', 'fluent-player')}</p>
                </div>
            )}
        </div>
    );
};

export default LayerTypeSelector;
