const {__} = wp.i18n;
const { Button, SelectControl, TextControl, TextareaControl, Spinner, Notice, CheckboxControl, Dropdown, FormTokenField } = wp.components;
const { MediaUpload, MediaUploadCheck } = wp.blockEditor;
const {useState, useEffect, useCallback, useRef} = wp.element;
const {apiFetch} = wp;

import { formTokenFieldHowToProps } from '../../common/formTokenFieldHowTo.js';
import { PlusIconSVG, DeleteIconSVG, EditIconSVG, ChevronDownSVG, CloseIconSVG } from './common/Icons.jsx';
import InfoIcon from './common/InfoIcon.jsx';
import CRMInactiveWarning from './common/CRMInactiveWarning.jsx';
import CustomToggle from './common/CustomToggle.jsx';

const LabelWithHelpTooltip = ({ label, help, children, labelClassName = 'fp-form-token-field__label components-base-control__label' }) => {
	return (
		<>
			<label className={labelClassName}>
				{label}
				{help && <InfoIcon tooltip={help} />}
			</label>
			{children}
		</>
	);
};

const MultiSelectDropdown = ({ label, value, options, placeholder, help, onChange }) => {
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);
    const [popoverWidth, setPopoverWidth] = useState(null);

    const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);

    const filteredOptions = options.filter(opt => {
        if (!search) return true;
        return String(opt.label).toLowerCase().includes(search.toLowerCase());
    });

    const toggleValue = (val) => {
        const exists = selectedValues.includes(val);
        const next = exists ? selectedValues.filter(v => v !== val) : [...selectedValues, val];
        onChange(next);
    };

    const removeValue = (val) => {
        onChange(selectedValues.filter(v => v !== val));
    };

    const getLabel = (val) => {
        const found = options.find(o => o.value === val);
        return found ? found.label : val;
    };

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                const width = containerRef.current.offsetWidth;
                setPopoverWidth(width);
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    return (
        <div className="components-base-control components-select-control fp-multi-select-wrapper">
            <div className="components-base-control__field">
                <div className="components-flex components-input-base">
                    <div className="components-flex-item">
                        <label className="custom-range-control-label components-base-control__label">
                            {label}
                            {help && <InfoIcon tooltip={help} />}
                        </label>
                    </div>
                    <Dropdown
                        popoverProps={{ 
                            className: 'fp-multi-select__popover', 
                            placement: 'bottom-start',
                            style: popoverWidth ? { 
                                '--fp-popover-width': `${popoverWidth}px`
                            } : {}
                        }}
                        renderToggle={({ isOpen, onToggle }) => {
                            if (isOpen && containerRef.current) {
                                const width = containerRef.current.offsetWidth;
                                if (width !== popoverWidth) {
                                    setPopoverWidth(width);
                                }
                                setTimeout(() => {
                                    const popoverContent = document.querySelector('.fp-multi-select__popover .components-popover__content');
                                    if (popoverContent) {
                                        popoverContent.style.width = `${width}px`;
                                        popoverContent.style.minWidth = 'auto';
                                        popoverContent.style.maxWidth = 'none';
                                    }
                                }, 0);
                            }
                            return (
                                <div className="components-input-control__container" ref={containerRef}>
                                    <button
                                        type="button"
                                        className={`components-select-control__input fp-multi-select__input ${isOpen ? 'is-open' : ''}`}
                                        onClick={onToggle}
                                    >
                                        <div className="fp-multi-select__values">
                                            {selectedValues.length === 0 ? (
                                                <span className="fp-multi-select__placeholder">{placeholder}</span>
                                            ) : (
                                                selectedValues.map(val => (
                                                    <span key={val} className="fp-multi-select__tag">
                                                        <span className="fp-multi-select__tag-text">{getLabel(val)}</span>
                                                        <span
                                                            role="button"
                                                            tabIndex={0}
                                                            aria-label={__('Remove', 'fluent-player')}
                                                            className="fp-multi-select__tag-remove"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                removeValue(val);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key !== 'Enter' && e.key !== ' ') return;
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                removeValue(val);
                                                            }}
                                                        >
                                                            ×
                                                        </span>
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </button>
                                    <span className="components-input-control__suffix">
                                        <div className="components-input-control-suffix-wrapper">
                                            <div>
                                                <ChevronDownSVG />
                                            </div>
                                        </div>
                                    </span>
                                    <div aria-hidden="true" className="components-input-control__backdrop"></div>
                                </div>
                            );
                        }}
                        renderContent={() => (
                            <div className="fp-multi-select__menu">
                                <TextControl
                                    value={search}
                                    placeholder={__('Search...', 'fluent-player')}
                                    onChange={(v) => setSearch(v)}
                                />
                                <div className="fp-multi-select__options">
                                    {filteredOptions.map(opt => {
                                        const isSelected = selectedValues.includes(opt.value);
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                className={`fp-multi-select__option ${isSelected ? 'is-selected' : ''}`}
                                                onClick={() => toggleValue(opt.value)}
                                            >
                                                <span className="fp-multi-select__option-label">{opt.label}</span>
                                                {isSelected && <span className="fp-multi-select__check">✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    />
                </div>
            </div>
        </div>
    );
};

export const EmailProviderSettings = ({ settings, updateSettings, requestPath, updateProvidersMeta }) => {
    const [availableProviders, setAvailableProviders] = useState({});
    const [loading, setLoading] = useState(true);
    const [providerMeta, setProviderMeta] = useState({});
    const [providerData, setProviderData] = useState({});
    const [fieldLoading, setFieldLoading] = useState({});
    const [errors, setErrors] = useState({});
    const [editingIndex, setEditingIndex] = useState(null);
    const [isNewProvider, setIsNewProvider] = useState(false);
    const [showAddProviderButton, setShowAddProviderButton] = useState(true);
    const [allowedAttachmentTypes, setAllowedAttachmentTypes] = useState([
        'application/pdf',
        'image',
        'video',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]);

    // Use a ref to track if we've initialized
    const initialized = useRef(false);

    // Initialize showAddProviderButton based on existing providers
    useEffect(() => {
        if (!settings.email_capture?.providers?.length) {
            setShowAddProviderButton(true);
            setEditingIndex(null);
        }
    }, [settings.email_capture?.providers?.length]);

    // Initialize providers array if it doesn't exist - ONCE
    useEffect(() => {
        // Only run this after providers metadata is loaded
        if (!providerMeta || Object.keys(providerMeta).length === 0) {
            return;
        }

        // Only run if we have providers in settings
        if (!settings.email_capture?.providers?.length) {
            return;
        }

        // For each provider in settings
        settings.email_capture.providers.forEach((provider, index) => {
            if (!provider.type || provider.type === 'email') return;

            // If this provider doesn't have data loaded yet
            if (!providerData[provider.type]) {
                // Find field definitions for this provider
                const fieldDefs = providerMeta[provider.type]?.settings_fields || [];

                // For each field that needs data from the API
                fieldDefs.forEach(field => {
                    if (field.context === 'preset_editor' && field.async && field.endpoint) {
                        // Extract the resource name
                        let resource = field.endpoint;
                        if (resource.includes('/')) {
                            const parts = resource.split('/');
                            resource = parts[parts.length - 1];
                        }

                        // Check if dependencies are satisfied
                        const hasDependency = !!field.depends_on;
                        const dependencyValue = provider.config?.[field.depends_on];
                        const isDependencySatisfied = !hasDependency || !!dependencyValue;

                        // If dependencies are satisfied, fetch the data
                        if (isDependencySatisfied) {
                            // Prepare params if there's a dependency
                            const params = {};
                            if (hasDependency) {
                                params[field.depends_on] = dependencyValue;
                            }

                            // Fetch the data
                            fetchProviderResource(provider.type, resource, field.key, params);
                        }
                    }
                });
            }
        });
    }, [providerMeta, settings.email_capture?.providers, providerData]);

    // Fetch available providers and their metadata
    useEffect(() => {
        fetchProvidersData();
    }, []);


    const fetchProvidersData = async () => {
        try {
            setLoading(true);
            const response = await apiFetch({ path: `${requestPath}/email-providers` });

            if (response) {
                // Store all providers in state
                setAvailableProviders(response.providers || {});
                setProviderMeta(response.providers_meta || {});
                if (typeof updateProvidersMeta === 'function') {
                    updateProvidersMeta(response.providers_meta || {});
                }
                if (response.allowed_attachment_types) {
                    setAllowedAttachmentTypes(response.allowed_attachment_types);
                }

                // For each existing provider in settings, fetch data for fields
                if (settings.email_capture?.providers) {
                    settings.email_capture.providers.forEach(provider => {
                        if (provider.type && provider.type !== 'email') {
                            const fields = response.providers_meta?.[provider.type]?.settings_fields || [];

                            // ONLY add API key if the provider has one
                            if (response.providers[provider.type]?.api_key && !provider.config.api_key) {
                                provider.config.api_key = response.providers[provider.type].api_key;
                            }

                            // Now fetch data for fields that need it
                            fields.forEach(field => {
                                if (field.context === 'preset_editor' && field.async && field.endpoint) {
                                    // Extract resource from endpoint
                                    let resource = field.endpoint;
                                    if (resource.includes('/')) {
                                        const parts = resource.split('/');
                                        resource = parts[parts.length - 1];
                                    }

                                    // Check if dependencies are satisfied (or if there are no dependencies)
                                    const isDependencySatisfied = !field.depends_on || !!provider.config[field.depends_on];

                                    if (isDependencySatisfied) {
                                        // If there's a dependency, include it in the request
                                        const params = {};
                                        if (field.depends_on) {
                                            params[field.depends_on] = provider.config[field.depends_on];
                                        }

                                        fetchProviderResource(provider.type, resource, field.key, params);
                                    }
                                }
                            });
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch providers:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch provider-specific resources
    const fetchProviderResource = useCallback(async (providerType, resource, fieldKey, params = {}) => {
        const loadingKey = `${providerType}_${fieldKey}`;

        try {
            setFieldLoading(prev => ({...prev, [loadingKey]: true}));

            // Build the endpoint path
            let path = `${requestPath}/email-providers/${providerType}/${resource}`;

            // Add query parameters if needed
            if (Object.keys(params).length > 0) {
                const queryString = Object.entries(params)
                    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                    .join('&');
                path += `?${queryString}`;
            }

            const response = await apiFetch({
                path,
                // Add a cache-busting parameter
                parse: false
            })
                .then(response => response.json())
                .catch(error => {
                    console.error(`Network error fetching ${resource}:`, error);
                    throw error;
                });

            if (!response) {
                throw new Error(`Empty response from ${path}`);
            }

            // Handle different response formats
            let responseData;
            if (resource === 'items') {
                responseData = response.items || [];
            } else if (response[resource] !== undefined) {
                // Handle responses like { lists: [...] }
                responseData = response[resource];
            } else {
                responseData = response;
            }

            setProviderData(prev => {
                const newData = {
                    ...prev,
                    [providerType]: {
                        ...prev[providerType],
                        [fieldKey]: responseData
                    }
                };
                return newData;
            });

            return responseData;
        } catch (error) {
            console.error(`ERROR fetching ${resource} for ${providerType}:`, error);

            setErrors(prev => ({
                ...prev,
                [loadingKey]: error.message || `Failed to load ${fieldKey}`
            }));

            return null;
        } finally {
            setFieldLoading(prev => ({...prev, [loadingKey]: false}));
        }
    }, [requestPath]);

    // Add provider - fixed to prevent infinite loop
    const addProvider = useCallback(() => {
        // Find first available provider that's enabled
        const availableProviderTypes = Object.keys(availableProviders)
            .filter(key => availableProviders[key]?.enabled);

        let initialType = 'email';
        if (availableProviderTypes.length > 0) {
            initialType = availableProviderTypes[0];
        }

        // Create initial config based on provider type
        let initialConfig = {};

        // For non-email providers, add the API key from available providers
        if (initialType !== 'email' && availableProviders[initialType]?.api_key) {
            initialConfig.api_key = availableProviders[initialType].api_key;
        } else if (initialType === 'email') {
            initialConfig = {
                email_subject: 'Thank you for subscribing',
                email_body: 'Hi there,\n\nThank you for subscribing to our newsletter.\n\nRegards,\nThe Team',
                button_text: 'Subscribe',
                attachments: []
            };
        }

        const newProviders = [
            ...(settings.email_capture?.providers || []),
            {
                enabled: true,
                type: initialType,
                config: initialConfig
            }
        ];

        const newIndex = newProviders.length - 1;
        updateSettings('email_capture', 'providers', newProviders);
        setEditingIndex(newIndex);
        setIsNewProvider(true);
        setShowAddProviderButton(false);
    }, [availableProviders, settings.email_capture?.providers, updateSettings]);

    // Remove provider
    const removeProvider = (index) => {
        const newProviders = [...(settings.email_capture?.providers || [])];
        newProviders.splice(index, 1);
        updateSettings('email_capture', 'providers', newProviders);
        
        if (editingIndex === index) {
            setEditingIndex(null);
            setIsNewProvider(false);
            setShowAddProviderButton(true);
        } else if (editingIndex !== null && editingIndex > index) {
            setEditingIndex(editingIndex - 1);
        }
        
        if (newProviders.length === 0) {
            setShowAddProviderButton(true);
        }
    };

    // Handle Add button click from within provider card - shrink the card
    const handleAddFromCard = useCallback((index) => {
        setEditingIndex(null);
        setShowAddProviderButton(true);
    }, []);

    // Update provider settings
    // Enhance updateProviderSettings to better handle dependent fields
    const updateProviderSettings = (index, field, value) => {
        const newProviders = [...(settings.email_capture?.providers || [])];
        const provider = newProviders[index];

        if (!provider) return;
        // Handle nested properties with dot notation (e.g., 'config.list_id')
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            if (provider[parent]) {
                // Update the field value
                provider[parent] = {
                    ...provider[parent],
                    [child]: value
                };

                // If this field is a dependency for other fields
                if (provider.type !== 'email') {
                    const fieldDefs = providerMeta[provider.type]?.settings_fields || [];

                    // Find all fields that depend on this one
                    const dependentFields = fieldDefs.filter(fieldDef =>
                        fieldDef.depends_on === child ||
                        fieldDef.secondary_depends_on?.includes(child)
                    );

                    // Handle each dependent field
                    dependentFields.forEach(fieldDef => {
                        // Clear the dependent field's value if needed
                        if (provider.config[fieldDef.key]) {
                            provider.config[fieldDef.key] = fieldDef.multiple ? [] : '';
                        }

                        // If we have a value and this field has an endpoint, fetch new data
                        if (value && fieldDef.async && fieldDef.endpoint) {
                            // Extract resource name from endpoint
                            let resource = fieldDef.endpoint;
                            if (resource.includes('/')) {
                                const parts = resource.split('/');
                                resource = parts[parts.length - 1];
                            }

                            // Check if all dependencies are satisfied
                            const primaryDependency = fieldDef.depends_on;
                            const secondaryDependencies = fieldDef.secondary_depends_on || [];

                            const allDependenciesSatisfied =
                                (!primaryDependency || !!provider.config[primaryDependency]) &&
                                secondaryDependencies.every(dep => !!provider.config[dep]);

                            if (allDependenciesSatisfied) {
                                // Build parameters from all dependencies
                                const params = {};
                                if (primaryDependency) {
                                    params[primaryDependency] = provider.config[primaryDependency];
                                }
                                secondaryDependencies.forEach(dep => {
                                    if (provider.config[dep]) {
                                        params[dep] = provider.config[dep];
                                    }
                                });

                                fetchProviderResource(
                                    provider.type,
                                    resource,
                                    fieldDef.key,
                                    params
                                );
                            }
                        }
                    });
                }
            }
        } else {
            provider[field] = value;

            // If changing provider type, initialize config
            if (field === 'type') {
                const providerType = value;

                // Special case for built-in email provider
                if (providerType === 'email') {
                    provider.config = {
                        email_subject: 'Thank you for subscribing',
                        email_body: 'Hi there,\n\nThank you for subscribing to our newsletter.\n\nRegards,\nThe Team',
                        button_text: 'Subscribe',
                        attachments: []
                    };
                }
                // Dynamic handling for other provider types
                else {
                    // Initialize config with API key if available
                    provider.config = {};

                    // Add API key from available providers
                    if (availableProviders[providerType]?.api_key) {
                        provider.config.api_key = availableProviders[providerType].api_key;
                    }

                    // Get field definitions for this provider
                    const fieldDefs = providerMeta[providerType]?.settings_fields || [];

                    // Initialize fields with defaults
                    fieldDefs.forEach(fieldDef => {
                        if (fieldDef.key && fieldDef.default !== undefined && fieldDef.key !== 'api_key') {
                            provider.config[fieldDef.key] = fieldDef.default;
                        }
                    });

                    // Fetch data for fields in preset_editor context that don't have dependencies
                    fieldDefs.forEach(fieldDef => {
                        if (fieldDef.context === 'preset_editor' && fieldDef.async &&
                            fieldDef.endpoint && !fieldDef.depends_on) {

                            // Extract resource name from endpoint
                            let resource = fieldDef.endpoint;
                            if (resource.includes('/')) {
                                const parts = resource.split('/');
                                resource = parts[parts.length - 1];
                            }

                            fetchProviderResource(providerType, resource, fieldDef.key);
                        }
                    });
                }
            }
        }

        updateSettings('email_capture', 'providers', newProviders);
    };

    // Render a field based on its type and metadata
    const renderField = (provider, index, field) => {
        // Skip fields that aren't meant for the preset editor
        if (field.context && field.context !== 'preset_editor') return null;

        // Skip API key fields which are already configured
        if (field.key === 'api_key') return null;

        const fieldKey = field.key;
        const fieldValue = provider.config?.[fieldKey] || field.default || '';
        const configPath = `config.${fieldKey}`;

        // Loading state for this field
        const isLoading = fieldLoading[`${provider.type}_${fieldKey}`];
        const errorMessage = errors[`${provider.type}_${fieldKey}`];

        // Check if dependencies are satisfied
        const primaryDependency = field.depends_on;
        const secondaryDependencies = field.secondary_depends_on || [];

        const allDependenciesSatisfied =
            (!primaryDependency || !!provider.config[primaryDependency]) &&
            secondaryDependencies.every(dep => !!provider.config[dep]);

        if (!allDependenciesSatisfied) {
            // Return nothing if dependencies aren't met
            return null;
        }

        let fieldComponent;

        switch (field.type) {
            case 'text':
            case 'password':
                fieldComponent = (
                    <TextControl
                        label={field.label}
                        value={fieldValue}
                        type={field.type}
                        placeholder={field.placeholder || ''}
                        help={field.help || ''}
                        required={field.required}
                        onChange={(value) => updateProviderSettings(index, configPath, value)}
                    />
                );
                break;

            case 'textarea':
                fieldComponent = (
                    <TextareaControl
                        label={field.label}
                        value={fieldValue}
                        placeholder={field.placeholder || ''}
                        help={field.help || ''}
                        rows={field.rows || 4}
                        onChange={(value) => updateProviderSettings(index, configPath, value)}
                    />
                );
                break;

            case 'select':
                // Handle options from API
                let options = field.options || [];

                if (field.async && field.endpoint) {
                    const asyncData = providerData[provider.type]?.[fieldKey];

                    if (isLoading) {
                        return (
                            <div key={fieldKey} className="loading-field">
                                <label>{field.label}</label>
                                <Spinner />
                                <p className="description">{__('Loading options...', 'fluent-player')}</p>
                            </div>
                        );
                    }

                    if (!asyncData) {
                        return (
                            <div key={fieldKey} className="loading-field">
                                <label>{field.label}</label>
                                <p className="description text-error">
                                    {__('Failed to load options. Please check your settings.', 'fluent-player')}
                                </p>
                            </div>
                        );
                    }

                    // Dynamically detect the data structure and extract options
                    options = extractOptionsFromData(asyncData, field);
                }

                // Create the component based on whether it's multiple or not
                if (field.multiple) {
                    const selectableOptions = options.slice(1);
                    const multiValue = Array.isArray(fieldValue) ? fieldValue :
                        (fieldValue ? [fieldValue] : []);
                    // FormTokenField value: use labels so add/remove and duplicate prevention work (see FormTokenField docs)
                    const valueAsLabels = multiValue.map((v) => {
                        const o = selectableOptions.find(opt => String(opt.value) === String(v));
                        return o ? (o.label || String(o.value)) : String(v);
                    });
                    const allSuggestions = selectableOptions.map(o => o.label || String(o.value));
                    // Exclude already selected so the same option cannot be selected again
                    const suggestions = allSuggestions.filter(l => !valueAsLabels.includes(l));

                    fieldComponent = (
                        <div className="fp-form-token-field components-base-control">
                            <div className="fp-form-token-field__field components-base-control__field">
                                <LabelWithHelpTooltip label={field.label} help={field.help}>
                                    <FormTokenField
                                        __experimentalAutoSelectFirstMatch
                                        __experimentalExpandOnFocus
                                        {...formTokenFieldHowToProps()}
                                        value={valueAsLabels}
                                        suggestions={suggestions}
                                        placeholder={field.placeholder || __('Type or select...', 'fluent-player')}
                                        onChange={(tokens) => {
                                            const vals = tokens.map(t => {
                                                const o = selectableOptions.find(opt => (opt.label || String(opt.value)) === t);
                                                return o ? o.value : t;
                                            });
                                            updateProviderSettings(index, configPath, vals);
                                        }}
                                    />
                                </LabelWithHelpTooltip>
                            </div>
                        </div>
                    );
                } else {
                    fieldComponent = (
                        <SelectControl
                            label={field.label}
                            value={fieldValue}
                            options={options}
                            help={field.help || ''}
                            onChange={(value) => updateProviderSettings(index, configPath, value)}
                        />
                    );
                }
                break;

            case 'toggle':
            case 'checkbox':
                fieldComponent = (
                    <CustomToggle
                        label={field.label}
                        checked={!!fieldValue}
                        help={field.help || ''}
                        onChange={(value) => updateProviderSettings(index, configPath, value)}
                        name={fieldKey}
                        switchPosition="left"
                        justify="start"
                    />
                );
                break;

            default:
                fieldComponent = (
                    <p>Unsupported field type: {field.type}</p>
                );
        }

        return (
            <div key={fieldKey} className="fluent-player-form-row">
                {fieldComponent}

                {errorMessage && (
                    <Notice status="error" isDismissible={false}>
                        {errorMessage}
                    </Notice>
                )}

                {field.link && (
                    <p className="field-link">
                        <a href={field.link} target="_blank" rel="noopener noreferrer">
                            {field.link_text || __('Learn more', 'fluent-player')}
                        </a>
                    </p>
                )}
            </div>
        );
    };

// Helper function to extract options from different data formats
    const extractOptionsFromData = (data, field) => {
        // Start with empty option
        const options = [
            { label: field.placeholder || __('Select...', 'fluent-player'), value: '' }
        ];

        // Try different possible data structures
        if (data.lists) {
            // Format: { lists: [{id, name}, ...] }
            options.push(...data.lists.map(item => ({
                label: item.name,
                value: item.id.toString()
            })));
        } else if (data.tags) {
            // Format: { tags: [{id, name}, ...] }
            options.push(...data.tags.map(item => ({
                label: item.name,
                value: item.id.toString()
            })));
        } else if (data.segments) {
            // Format: { segments: [{id, name}, ...] }
            options.push(...data.segments.map(item => ({
                label: item.name,
                value: item.id.toString()
            })));
        } else if (Array.isArray(data)) {
            // Format: [{id, name}, ...] or [{value, label}, ...]
            options.push(...data.map(item => ({
                label: item.name || item.label || item.title || String(item.id),
                value: (item.id || item.value)?.toString() || ''
            })));
        } else {
            // Try to find arrays in the response
            Object.keys(data).forEach(key => {
                if (Array.isArray(data[key])) {
                    options.push(...data[key].map(item => ({
                        label: item.name || item.label || item.title || String(item.id),
                        value: (item.id || item.value)?.toString() || ''
                    })));
                }
            });
        }

        return options;
    };

    // Render provider-specific fields
    const renderProviderFields = (provider, index) => {
        if (!provider.type) return null;

        // Special case for email provider
        if (provider.type === 'email') {
            return renderEmailFields(provider, index);
        }

        // Get field definitions from provider metadata
        const fieldDefs = providerMeta[provider.type]?.settings_fields || [];

        // Filter fields for preset editor context
        const presetEditorFields = fieldDefs.filter(field =>
            field.context === 'preset_editor' && field.key !== 'api_key'
        );

        if (presetEditorFields.length === 0) {
            return (
                <p className="description">
                    {__('No configuration needed for this provider.', 'fluent-player')}
                </p>
            );
        }

        return (
            <>
                {presetEditorFields.map(field => renderField(provider, index, field))}
            </>
        );
    };

    // Render Email specific fields
    const renderEmailFields = (provider, index) => {
        const emailBodyValue = provider.config?.email_body || '';
        const emailBodyLength = emailBodyValue.length;
        const maxLength = 200;
        const attachments = provider.config?.attachments || [];

        const getMediaType = (media) => {
            if (media.type) {
                return media.type;
            }
            if (media.mime) {
                if (media.mime.startsWith('image/')) return 'image';
                if (media.mime.startsWith('video/')) return 'video';
            }
            return 'file';
        };

        const addAttachment = (media) => {
            const newAttachments = [
                ...attachments,
                {
                    id: media.id,
                    url: media.url,
                    type: getMediaType(media),
                    name: media.filename || media.title || __('Attachment', 'fluent-player')
                }
            ];
            updateProviderSettings(index, 'config.attachments', newAttachments);
        };

        const updateAttachment = (attachmentIndex, media) => {
            const newAttachments = [...attachments];
            newAttachments[attachmentIndex] = {
                id: media.id,
                url: media.url,
                type: getMediaType(media),
                name: media.filename || media.title || __('Attachment', 'fluent-player')
            };
            updateProviderSettings(index, 'config.attachments', newAttachments);
        };

        const removeAttachment = (attachmentIndex) => {
            const newAttachments = attachments.filter((_, i) => i !== attachmentIndex);
            updateProviderSettings(index, 'config.attachments', newAttachments);
        };

        return (
            <>
                <div className="fluent-player-form-row">
                    <TextControl
                        label={__('Email Subject', 'fluent-player')}
                        value={provider.config?.email_subject || 'Thank you for subscribing'}
                        onChange={(value) => updateProviderSettings(index, 'config.email_subject', value)}
                    />
                </div>

                <div className="fluent-player-form-row">
                    <div className="custom-range-control">
                        <div className="custom-range-control-header">
                            <label className="custom-range-control-label components-base-control__label">
                                {__('Email Body', 'fluent-player')}*
                                <InfoIcon tooltip={__('Email body content', 'fluent-player')} />
                            </label>
                        </div>
                        <div className="email-body-textarea-wrapper">
                            <TextareaControl
                                value={emailBodyValue}
                                placeholder={__('Placeholder text...', 'fluent-player')}
                                onChange={(value) => {
                                    if (value.length <= maxLength) {
                                        updateProviderSettings(index, 'config.email_body', value);
                                    }
                                }}
                                rows={5}
                            />
                            <div className="email-body-counter">
                                {emailBodyLength}/{maxLength}
                            </div>
                        </div>
                        <p className="description">
                            {__('Available placeholders: {{email}}, {{site_name}}, {{site_url}}, {{date}}, {{time}}', 'fluent-player')}
                        </p>
                    </div>
                </div>

                <div className="fluent-player-form-row">
                    <label className="components-base-control__label">
                        {__('Attachments', 'fluent-player')}
                    </label>
                    <MediaUploadCheck>
                        {attachments.map((attachment, attIndex) => (
                            <div key={attIndex} className="attachment-upload-item" style={{ marginBottom: '15px' }}>
                                <MediaUpload
                                    onSelect={(media) => updateAttachment(attIndex, media)}
                                    allowedTypes={allowedAttachmentTypes}
                                    value={attachment.id}
                                    render={({ open }) => (
                                        <div className={`image-upload-container ${attachment.url ? 'has-image' : ''}`}>
                                            {attachment.url ? (
                                                <>
                                                    <div className="image-upload-preview">
                                                        {attachment.type === 'image' ? (
                                                            <img src={attachment.url} alt={attachment.name || ''} />
                                                        ) : attachment.type === 'video' ? (
                                                            <video src={attachment.url} />
                                                        ) : (
                                                            <div className="file-preview">
                                                                <span className="file-icon">📄</span>
                                                                <span className="file-name">{attachment.name || __('Attachment', 'fluent-player')}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Button className="image-upload-change-btn fp-btn-secondary" onClick={open}>
                                                        {__("Change", "fluent-player")}
                                                    </Button>
                                                    <Button
                                                        className="fp-delete-button fp-icon-btn fp-icon-btn--danger"
                                                        onClick={() => removeAttachment(attIndex)}
                                                        aria-label={__("Delete attachment", "fluent-player")}
                                                    >
                                                        <DeleteIconSVG />
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button className="fp-btn-primary" onClick={open}>
                                                    {__("Upload", "fluent-player")}
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                />
                            </div>
                        ))}
                        <MediaUpload
                            onSelect={addAttachment}
                            allowedTypes={allowedAttachmentTypes}
                            render={({ open }) => (
                                <Button className="fp-btn-secondary" onClick={open}>
                                    <PlusIconSVG />
                                    {__('Add Attachment', 'fluent-player')}
                                </Button>
                            )}
                        />
                    </MediaUploadCheck>
                </div>
            </>
        );
    };

    if (loading) {
        return <div className="loading-container"><Spinner /> {__('Loading providers...', 'fluent-player')}</div>;
    }

    // Get available provider types for dropdown
    const getAvailableProviderTypes = () => {
        const options = [
            {label: __('Select provider type', 'fluent-player'), value: ''}
        ];

        // Add enabled providers from backend data
        Object.keys(availableProviders).forEach(providerKey => {
            if (availableProviders[providerKey]?.enabled) {
                const name = providerMeta[providerKey]?.name || providerKey;
                options.push({
                    label: name,
                    value: providerKey
                });
            }
        });

        // Always include email option
        if (!options.find(opt => opt.value === 'email')) {
            options.push({label: __('Email Notification (wp_mail)', 'fluent-player'), value: 'email'});
        }

        return options;
    };

    // Get provider display name
    const getProviderDisplayName = (provider) => {
        if (provider.type === 'email') {
            return __('Email Notification (wp_mail)', 'fluent-player');
        }
        return providerMeta[provider.type]?.name || provider.type;
    };

    // Format time as hh:mm:ss
    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const displayTimeSeconds =
        (parseInt(settings.start_time_hours, 10) || 0) * 3600 +
        (parseInt(settings.start_time_minutes, 10) || 0) * 60 +
        (parseInt(settings.start_time_seconds, 10) || 0);

    return (
        <div className="email-providers-section">
            {editingIndex !== null && settings.email_capture?.providers?.[editingIndex] && (
                <div className="provider-card is-editing">
                    {(() => {
                        const provider = settings.email_capture.providers[editingIndex];
                        return (
                            <>
                                <div className="provider-settings">
                                    <div className="fluent-player-form-row">
                                        <SelectControl
                                            label={__('Select Provider', 'fluent-player') + ' *'}
                                            value={provider.type || ''}
                                            options={getAvailableProviderTypes()}
                                            onChange={(value) => updateProviderSettings(editingIndex, 'type', value)}
                                        />
                                    </div>

                                    <p className="description" style={{ marginTop: '-8px', marginBottom: '8px' }}>
                                        {__('Every submitted email is saved to your collected emails and can be exported as a list, no matter which provider you choose.', 'fluent-player')}
                                    </p>

                                    {provider.type === 'email' && (
                                        <p className="description" style={{ marginTop: '-8px', marginBottom: '8px' }}>
                                            {__('Sends an email using WordPress wp_mail() when a viewer submits the form. Customize the subject and body below.', 'fluent-player')}
                                        </p>
                                    )}

                                    {provider.type === 'fluentcrm' && !availableProviders.fluentcrm?.enabled && (
                                        <Notice status="warning" isDismissible={false}>
                                            {settings.email_capture?.providers?.some(p => p.enabled && p.type !== 'fluentcrm')
                                                ? __('FluentCRM is not installed/active. FluentCRM provider will not collect emails.', 'fluent-player')
                                                : __('FluentCRM is not installed/active. This email capture will not be working.', 'fluent-player')
                                            }
                                            {window.fluentPlayerBlockVars?.fluentcrm_install_url && (
                                                <>
                                                    {' '}
                                                    <a href={window.fluentPlayerBlockVars.fluentcrm_install_url} target="_blank" rel="noopener noreferrer">
                                                        {__('Install/Activate', 'fluent-player')}
                                                    </a>
                                                </>
                                            )}
                                        </Notice>
                                    )}

                                    {provider.type && (
                                        <div className={`fluent-player-form-row ${provider.enabled ? 'enabled' : 'disabled'}`}>
                                            {renderProviderFields(provider, editingIndex)}
                                        </div>
                                    )}
                                </div>

                                <div className="provider-footer">
                                    <div className="custom-toggle-control">
                                        <div className="custom-toggle-control-content">
                                            <label className="custom-toggle-switch">
                                                <input
                                                    className="custom-toggle-input"
                                                    type="checkbox"
                                                    checked={provider.enabled}
                                                    onChange={(e) => updateProviderSettings(editingIndex, 'enabled', e.target.checked)}
                                                />
                                                <span className="custom-toggle-slider"></span>
                                            </label>
                                            <div className="custom-toggle-control-text">
                                                <label className="custom-toggle-control-label">
                                                    {provider.enabled ? __('Active', 'fluent-player') : __('Inactive', 'fluent-player')}
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => removeProvider(editingIndex)}
                                        className="fp-delete-button fp-icon-btn fp-icon-btn--secondary"
                                        aria-label={isNewProvider ? __('Cancel provider', 'fluent-player') : __('Delete provider', 'fluent-player')}
                                    >
                                        {isNewProvider ? <CloseIconSVG /> : <DeleteIconSVG />}
                                    </Button>
                                </div>
                                <div className="add-provider-button-container">
                                    <Button
                                        onClick={() => {
                                            setEditingIndex(null);
                                            setIsNewProvider(false);
                                            setShowAddProviderButton(true);
                                        }}
                                        isPrimary
                                        className="provider-add-button fp-btn-primary"
                                    >
                                        {isNewProvider ? __('Add', 'fluent-player') : __('Update', 'fluent-player')}
                                    </Button>
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}

            {settings.email_capture?.providers?.length > 0 && settings.email_capture.providers.map((provider, index) => {
                if (editingIndex === index) return null;
                
                return (
                    <div key={index} className="provider-card provider-card-saved" onClick={() => { setEditingIndex(index); setIsNewProvider(false); }}>
                        <div className="provider-card-header">
                            <div className="provider-card-info">
                                <div className="provider-card-title">
                                    {getProviderDisplayName(provider)}
                                    {provider.type === 'fluentcrm' && provider.enabled && !availableProviders.fluentcrm?.enabled && (
                                        <CRMInactiveWarning hasOtherProviders={settings.email_capture?.providers?.some(p => p.enabled && p.type !== 'fluentcrm')} />
                                    )}
                                </div>
                                <div className="provider-card-subtitle">
                                    {formatTime(displayTimeSeconds)}
                                </div>
                            </div>
                            <div className="provider-card-actions fp-card-actions">
                                <span className={`provider-card-badge provider-card-badge--${provider.enabled ? 'active' : 'inactive'}`}>
                                    {provider.enabled ? __('Active', 'fluent-player') : __('Inactive', 'fluent-player')}
                                </span>
                                <Button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingIndex(index);
                                    }}
                                    className="provider-card-edit-button fp-icon-btn"
                                >
                                    <EditIconSVG />
                                </Button>
                                <Button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeProvider(index);
                                    }}
                                    className="provider-card-delete-button fp-icon-btn fp-icon-btn--danger"
                                >
                                    <DeleteIconSVG />
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })}

            {showAddProviderButton && editingIndex === null && (
                <Button
                    onClick={addProvider}
                    className="add-provider-button fp-btn-secondary"
                >
                    <PlusIconSVG />
                    {__('Add Provider', 'fluent-player')}
                </Button>
            )}
        </div>
    );
};
