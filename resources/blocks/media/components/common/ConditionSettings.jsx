const { __, sprintf } = wp.i18n;
const { Button, SelectControl, TextControl } = wp.components;
const { useEffect, useRef, useState } = wp.element;
const { apiFetch } = wp;

import CustomToggle from './CustomToggle.jsx';
import TooltipPortal from './TooltipPortal.jsx';
import { ChevronDownSVG, InfoIconSVG, PlusIconSVG } from './Icons.jsx';

const FIELD_DEFINITIONS = {
    'viewer.is_logged_in': {
        label: __('Viewer is logged in', 'fluent-player'),
        summaryLabel: __('Logged in', 'fluent-player'),
        negativeSummaryLabel: __('Guest', 'fluent-player'),
        type: 'boolean',
        operators: ['=', '!='],
    },
    'viewer.is_crm_contact': {
        label: __('Viewer is CRM contact', 'fluent-player'),
        summaryLabel: __('CRM contact', 'fluent-player'),
        negativeSummaryLabel: __('Not CRM contact', 'fluent-player'),
        type: 'boolean',
        operators: ['=', '!='],
    },
    'viewer.crm_tag': {
        label: __('Viewer has CRM tag', 'fluent-player'),
        summaryLabel: __('CRM tag', 'fluent-player'),
        negativeSummaryLabel: __('Not CRM tag', 'fluent-player'),
        type: 'string',
        operators: ['=', '!='],
    },
    'viewer.crm_list': {
        label: __('Viewer is in CRM list', 'fluent-player'),
        summaryLabel: __('CRM list', 'fluent-player'),
        negativeSummaryLabel: __('Not in CRM list', 'fluent-player'),
        type: 'string',
        operators: ['=', '!='],
    },
    'viewer.email_submitted': {
        label: __('Email submitted', 'fluent-player'),
        summaryLabel: __('Email sent', 'fluent-player'),
        negativeSummaryLabel: __('Email not sent', 'fluent-player'),
        type: 'boolean',
        operators: ['=', '!='],
    },
    'page.query': {
        label: __('URL query parameter', 'fluent-player'),
        summaryLabel: __('Query match', 'fluent-player'),
        negativeSummaryLabel: __('Query mismatch', 'fluent-player'),
        type: 'string',
        operators: ['=', '!=', 'contains'],
        requiresKey: true,
    },
    'layer.seen': {
        label: __('This layer has been seen', 'fluent-player'),
        summaryLabel: __('Seen', 'fluent-player'),
        negativeSummaryLabel: __('Not seen', 'fluent-player'),
        type: 'boolean',
        operators: ['=', '!='],
    },
    'layer.completed': {
        label: __('This layer is completed', 'fluent-player'),
        summaryLabel: __('Completed', 'fluent-player'),
        negativeSummaryLabel: __('Not completed', 'fluent-player'),
        type: 'boolean',
        operators: ['=', '!='],
    },
};

const DEFAULT_FIELDS = Object.keys(FIELD_DEFINITIONS);
const CRM_RESOURCE_FIELDS = {
    'viewer.crm_tag': 'tags',
    'viewer.crm_list': 'lists',
};
const CRM_ONLY_FIELDS = new Set([
    'viewer.is_crm_contact',
    'viewer.crm_tag',
    'viewer.crm_list',
]);
const crmOptionsCache = {};

const EMPTY_RULE = {
    field: '',
    operator: '',
    value: '',
    key: '',
};

const BOOLEAN_OPTIONS = [
    { label: __('Select', 'fluent-player'), value: '' },
    { label: __('Yes', 'fluent-player'), value: 'true' },
    { label: __('No', 'fluent-player'), value: 'false' },
];

const createEmptyRule = () => ({ ...EMPTY_RULE });

const normalizeSavedConditionals = (conditionals) => ({
    enabled: Boolean(conditionals?.enabled),
    match: conditionals?.match === 'any' ? 'any' : 'all',
    rules: Array.isArray(conditionals?.rules) ? conditionals.rules : [],
});

const getDefinition = (field) => FIELD_DEFINITIONS[field] || null;

const isRuleComplete = (rule) => {
    const definition = getDefinition(rule?.field);
    if (!definition || !rule?.operator) {
        return false;
    }

    if (definition.requiresKey && !String(rule?.key || '').trim()) {
        return false;
    }

    if (definition.type === 'boolean') {
        return rule?.value === true || rule?.value === false;
    }

    return String(rule?.value || '').trim() !== '';
};

const toUiRule = (rule) => {
    const definition = getDefinition(rule?.field);
    if (!definition) {
        return createEmptyRule();
    }

    const uiRule = {
        field: rule.field,
        operator: definition.operators.includes(rule?.operator) ? rule.operator : definition.operators[0],
        value: definition.type === 'boolean' ? toBoolean(rule?.value) : String(rule?.value || ''),
        key: definition.requiresKey ? String(rule?.key || '') : '',
    };

    return uiRule;
};

const toSavedRule = (rule) => {
    const definition = getDefinition(rule.field);
    const savedRule = {
        field: rule.field,
        operator: rule.operator,
        value: definition.type === 'boolean' ? Boolean(rule.value) : String(rule.value || '').trim(),
    };

    if (definition.requiresKey) {
        savedRule.key = String(rule.key || '').trim();
    }

    return savedRule;
};

const createRuleForField = (field) => {
    const definition = getDefinition(field);
    if (!definition) {
        return createEmptyRule();
    }

    return {
        field,
        operator: definition.operators[0],
        value: definition.type === 'boolean' ? '' : '',
        key: definition.requiresKey ? '' : '',
    };
};

const withCurrentValueOption = (options, value) => {
    const normalizedValue = String(value || '');
    if (!normalizedValue) {
        return options;
    }

    if (options.some((option) => option.value === normalizedValue)) {
        return options;
    }

    return [
        ...options,
        { label: normalizedValue, value: normalizedValue },
    ];
};

const getCRMOptions = async (field, apiPath) => {
    const resource = CRM_RESOURCE_FIELDS[field];
    if (!resource || !apiPath) {
        return [];
    }

    const cacheKey = `${field}:${apiPath}`;
    if (crmOptionsCache[cacheKey]) {
        return crmOptionsCache[cacheKey];
    }

    crmOptionsCache[cacheKey] = apiFetch({ path: `${apiPath}/email-providers/fluentcrm/${resource}` })
        .then((response) => {
            const items = Array.isArray(response?.[resource]) ? response[resource] : [];

            return items.map((item) => ({
                label: item?.name ? `${item.name} (#${item.id})` : `#${item?.id}`,
                value: String(item?.id || ''),
            })).filter((item) => item.value);
        })
        .catch(() => {
            delete crmOptionsCache[cacheKey];
            return [];
        });

    return crmOptionsCache[cacheKey];
};

const getRuleSummaryLabel = (rule) => {
    const definition = getDefinition(rule?.field);
    if (!definition || !isRuleComplete(rule)) {
        return '';
    }

    if (definition.type === 'boolean') {
        const value = Boolean(rule.value);
        const isPositiveCondition = rule.operator === '=' ? value : !value;
        return isPositiveCondition
            ? (definition.summaryLabel || definition.label)
            : (definition.negativeSummaryLabel || definition.label);
    }

    if (definition.type === 'string') {
        return rule.operator === '!='
            ? (definition.negativeSummaryLabel || definition.summaryLabel || definition.label)
            : (definition.summaryLabel || definition.label);
    }

    return definition.summaryLabel || definition.label;
};

const ConditionSettings = ({
    value,
    onChange,
    fieldKeys = DEFAULT_FIELDS,
    title = __('Conditions', 'fluent-player'),
    description = __('Show this item only when the selected conditions match.', 'fluent-player'),
}) => {
    const hasPro = !!window?.fluentPlayerBlockVars?.hasPro;
    const hasFluentCRM = Boolean(window?.fluentPlayerBlockVars?.has_fluentcrm);
    const apiPath = `${window?.fluentPlayerBlockVars?.rest?.namespace}/${window?.fluentPlayerBlockVars?.rest?.version}`;

    if (!hasPro) {
        return (
            <div className="fp-settings-section-card is-static">
                <div className="fp-settings-section-card__header">
                    <div className="fp-settings-section-card__toggle">
                        <span className="fp-settings-section-card__title">
                            {__('Conditions is pro feature', 'fluent-player')}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <Button
                            href="https://fluentplayer.com/?feature=conditions"
                            target="_blank"
                            style={{
                                padding: '8px 16px',
                                fontSize: '13px',
                                borderRadius: 'var(--fp-radius-8)',
                                background: 'var(--fp-brand-color)',
                                border: '1px solid var(--fp-brand-color-dark)',
                                color: '#FFFFFF',
                                boxShadow: 'none',
                                transition: '0.2s',
                                textDecoration: 'none',
                            }}
                        >
                            {__('Upgrade to Pro', 'fluent-player')}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const allowedFields = fieldKeys.filter((fieldKey) => {
        if (!FIELD_DEFINITIONS[fieldKey]) {
            return false;
        }

        if (!hasFluentCRM && CRM_ONLY_FIELDS.has(fieldKey)) {
            return false;
        }

        return true;
    });
    const availableFields = allowedFields.length ? allowedFields : DEFAULT_FIELDS;
    const [uiRules, setUiRules] = useState([createEmptyRule()]);
    const [match, setMatch] = useState('all');
    const [enabled, setEnabled] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [crmOptions, setCrmOptions] = useState({});
    const [showInfo, setShowInfo] = useState(false);
    const infoIconRef = useRef(null);
    const lastCommittedRef = useRef('');
    const matchGroupNameRef = useRef(`condition-match-${Math.random().toString(36).slice(2, 10)}`);
    const bodyIdRef = useRef(`condition-settings-${Math.random().toString(36).slice(2, 10)}`);

    useEffect(() => {
        const normalized = normalizeSavedConditionals(value);
        const serializedValue = JSON.stringify(normalized);

        if (serializedValue === lastCommittedRef.current) {
            return;
        }

        lastCommittedRef.current = serializedValue;
        setMatch(normalized.match);
        setEnabled(normalized.enabled);
        setUiRules(normalized.rules.length ? normalized.rules.map(toUiRule) : [createEmptyRule()]);
    }, [value]);

    useEffect(() => {
        if (!hasFluentCRM) {
            return;
        }

        const neededFields = Array.from(new Set(uiRules.map((rule) => rule.field).filter((field) => CRM_RESOURCE_FIELDS[field])));
        if (!neededFields.length) {
            return;
        }

        neededFields.forEach((field) => {
            if (crmOptions[field]) {
                return;
            }

            getCRMOptions(field, apiPath).then((options) => {
                setCrmOptions((current) => current[field] ? current : { ...current, [field]: options });
            });
        });
    }, [apiPath, crmOptions, hasFluentCRM, uiRules]);

    const commit = (nextRules, nextMatch = match, nextEnabled = enabled) => {
        const savedRules = nextRules.filter(isRuleComplete).map(toSavedRule);
        const nextValue = {
            enabled: nextEnabled,
            match: nextMatch,
            rules: savedRules,
        };

        lastCommittedRef.current = JSON.stringify(nextValue);
        onChange(nextValue);
    };

    const updateRule = (index, updates) => {
        const nextRules = uiRules.map((rule, ruleIndex) => {
            if (ruleIndex !== index) {
                return rule;
            }

            if (Object.prototype.hasOwnProperty.call(updates, 'field')) {
                return createRuleForField(updates.field);
            }

            return {
                ...rule,
                ...updates,
            };
        });

        setUiRules(nextRules);
        commit(nextRules);
    };

    const handleMatchChange = (nextMatch) => {
        setMatch(nextMatch);
        commit(uiRules, nextMatch, enabled);
    };

    const handleEnabledChange = (nextEnabled) => {
        setEnabled(nextEnabled);
        if (nextEnabled) {
            setIsOpen(true);
        }
        commit(uiRules, match, nextEnabled);
    };

    const getSummary = () => {
        if (!enabled) {
            return __('Disabled', 'fluent-player');
        }

        const matchLabel = match === 'any' ? __('Any', 'fluent-player') : __('All', 'fluent-player');
        const completeRulesCount = uiRules.filter(isRuleComplete).length;
        if (!completeRulesCount) {
            return __('No rules', 'fluent-player');
        }

        if (completeRulesCount <= 3) {
            const labels = uiRules
                .filter(isRuleComplete)
                .map(getRuleSummaryLabel)
                .filter(Boolean);

            if (labels.length) {
                return `${matchLabel} ${__('of', 'fluent-player')}: ${labels.join(', ')}`;
            }
        }

        return sprintf(
            /* translators: 1: rule match type, 2: number of rules */
            __('%1$s • %2$d rules match', 'fluent-player'),
            matchLabel,
            completeRulesCount
        );
    };

    const addRule = (index) => {
        const nextRules = [...uiRules];
        nextRules.splice(index + 1, 0, createEmptyRule());
        setUiRules(nextRules);
        commit(nextRules);
    };

    const removeRule = (index) => {
        const nextRules = uiRules.filter((_, ruleIndex) => ruleIndex !== index);
        const normalizedRules = nextRules.length ? nextRules : [createEmptyRule()];
        setUiRules(normalizedRules);
        commit(normalizedRules);
    };

    const toggleOpen = () => {
        setIsOpen((prev) => !prev);
    };

    const handleHeaderToggle = () => {
        if (!enabled) {
            return;
        }

        toggleOpen();
    };

    const handleHeaderKeyDown = (event) => {
        if (!enabled) {
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleOpen();
        }
    };

    return (
        <div className={`condition-settings-box ${isOpen ? 'is-open' : 'is-collapsed'}`}>
            <div className="condition-settings-box__header">
                    <div
                        className={`condition-settings-box__topbar ${enabled ? 'is-clickable' : ''}`}
                        onClick={handleHeaderToggle}
                        onKeyDown={handleHeaderKeyDown}
                        role={enabled ? 'button' : undefined}
                        tabIndex={enabled ? 0 : undefined}
                        aria-expanded={enabled ? isOpen : undefined}
                        aria-controls={enabled ? bodyIdRef.current : undefined}
                    >
                        <div className="condition-settings-box__title-group">
                            <div className="condition-settings-box__title-row">
                            <span className="condition-settings-box__title fp-settings-section-card__title">{title}</span>
                            <button
                                type="button"
                                ref={infoIconRef}
                                className="condition-settings-box__info"
                                aria-label={__('Show condition help', 'fluent-player')}
                                aria-expanded={showInfo}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setShowInfo(!showInfo);
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.stopPropagation();
                                    }
                                }}
                                onMouseEnter={() => setShowInfo(true)}
                                onMouseLeave={() => setShowInfo(false)}
                                onFocus={() => setShowInfo(true)}
                                onBlur={() => setShowInfo(false)}
                            >
                                <InfoIconSVG />
                            </button>
                            <TooltipPortal isOpen={showInfo} anchorRef={infoIconRef}>
                                {description}
                            </TooltipPortal>
                        </div>
                    </div>

                    <div className="condition-settings-box__actions">
                        <div
                            className="condition-settings-box__toggle"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                        >
                            <CustomToggle
                                checked={enabled}
                                onChange={handleEnabledChange}
                                label=""
                                ariaLabel={__('Enable conditions', 'fluent-player')}
                                switchPosition="left"
                                justify="start"
                                clickableLabel={false}
                            />
                        </div>
                    </div>
                </div>

                {enabled && (
                    <button
                        type="button"
                        className="condition-settings-box__collapse-row"
                        aria-expanded={isOpen}
                        aria-controls={bodyIdRef.current}
                        onClick={toggleOpen}
                    >
                        <span className="condition-settings-box__summary">
                            {getSummary()}
                        </span>
                        <span className="condition-settings-box__collapse" aria-hidden="true">
                            <ChevronDownSVG />
                        </span>
                    </button>
                )}
            </div>

            <div id={bodyIdRef.current} className="condition-settings-box__body" hidden={!enabled || !isOpen}>
                {enabled && (
                    <>
                        <div className="condition-settings-box__match">
                            <div className="condition-match-radio-group">
                                <label className={`condition-match-radio components-base-control__label ${match === 'any' ? 'is-selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name={matchGroupNameRef.current}
                                        value="any"
                                        checked={match === 'any'}
                                        onChange={() => handleMatchChange('any')}
                                    />
                                    <span className="condition-match-radio-indicator"></span>
                                    <span className="condition-match-radio-label">{__('Any', 'fluent-player')}</span>
                                </label>
                                <label className={`condition-match-radio components-base-control__label ${match === 'all' ? 'is-selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name={matchGroupNameRef.current}
                                        value="all"
                                        checked={match === 'all'}
                                        onChange={() => handleMatchChange('all')}
                                    />
                                    <span className="condition-match-radio-indicator"></span>
                                    <span className="condition-match-radio-label">{__('All', 'fluent-player')}</span>
                                </label>
                            </div>
                        </div>

                        <div className="condition-settings-box__rows">
                {uiRules.map((rule, index) => {
                    const definition = getDefinition(rule.field);
                    const operatorOptions = definition
                        ? definition.operators.map((operator) => ({ label: operator, value: operator }))
                        : [{ label: __('Select', 'fluent-player'), value: '' }];
                    const fieldControl = (
                        <div className="condition-row__field">
                            <SelectControl
                                label={__('Field', 'fluent-player')}
                                value={rule.field}
                                options={[
                                    { label: __('Select', 'fluent-player'), value: '' },
                                    ...availableFields.map((fieldKey) => ({
                                        label: FIELD_DEFINITIONS[fieldKey].label,
                                        value: fieldKey,
                                    })),
                                ]}
                                onChange={(field) => updateRule(index, { field })}
                                __nextHasNoMarginBottom
                            />
                        </div>
                    );
                    const keyControl = definition?.requiresKey ? (
                        <div className="condition-row__key">
                            <TextControl
                                label={__('Key', 'fluent-player')}
                                value={rule.key || ''}
                                onChange={(key) => updateRule(index, { key })}
                                placeholder={__('campaign', 'fluent-player')}
                                __nextHasNoMarginBottom
                            />
                        </div>
                    ) : null;
                    const operatorControl = (
                        <div className="condition-row__operator">
                            <SelectControl
                                label={__('Operator', 'fluent-player')}
                                value={rule.operator}
                                options={operatorOptions}
                                onChange={(operator) => updateRule(index, { operator })}
                                disabled={!definition}
                                __nextHasNoMarginBottom
                            />
                        </div>
                    );
                    const valueControl = (
                        <div className={definition?.type === 'boolean' ? 'condition-row__value condition-row__value--boolean' : 'condition-row__value'}>
                            {definition?.type === 'boolean' ? (
                                <SelectControl
                                    label={__('Value', 'fluent-player')}
                                    value={rule.value === '' ? '' : (rule.value ? 'true' : 'false')}
                                    options={BOOLEAN_OPTIONS}
                                    onChange={(selectedValue) => updateRule(index, {
                                        value: selectedValue === '' ? '' : selectedValue === 'true',
                                    })}
                                    __nextHasNoMarginBottom
                                />
                            ) : CRM_RESOURCE_FIELDS[rule.field] ? (
                                <SelectControl
                                    label={__('Value', 'fluent-player')}
                                    value={rule.value || ''}
                                    options={withCurrentValueOption([
                                        { label: __('Select', 'fluent-player'), value: '' },
                                        ...(crmOptions[rule.field] || []),
                                    ], rule.value)}
                                    onChange={(nextValue) => updateRule(index, { value: nextValue })}
                                    disabled={!definition}
                                    __nextHasNoMarginBottom
                                />
                            ) : (
                                <TextControl
                                    label={__('Value', 'fluent-player')}
                                    value={rule.value || ''}
                                    onChange={(nextValue) => updateRule(index, { value: nextValue })}
                                    placeholder={__('Value', 'fluent-player')}
                                    disabled={!definition}
                                    __nextHasNoMarginBottom
                                />
                            )}
                        </div>
                    );
                    const actionControls = (
                        <div className="condition-row__actions">
                            <Button
                                onClick={() => addRule(index)}
                                className="condition-row__action condition-row__action--add"
                                aria-label={__('Add condition', 'fluent-player')}
                            >
                                <PlusIconSVG />
                            </Button>
                            <Button
                                onClick={() => removeRule(index)}
                                className="condition-row__action condition-row__action--remove"
                                aria-label={__('Remove condition', 'fluent-player')}
                            >
                                <span className="condition-row__action-symbol">−</span>
                            </Button>
                        </div>
                    );

                    return (
                        <div key={`condition-rule-${index}`} className={`condition-row${definition?.requiresKey ? ' condition-row--with-key' : ''}`}>
                            {fieldControl}
                            {keyControl}
                            {operatorControl}
                            {valueControl}
                            {actionControls}
                        </div>
                    );
                })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

function toBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const normalizedValue = value.trim().toLowerCase();
        if (normalizedValue === 'true' || normalizedValue === '1') {
            return true;
        }
        if (normalizedValue === 'false' || normalizedValue === '0' || normalizedValue === '') {
            return false;
        }
    }

    if (typeof value === 'number') {
        return value !== 0;
    }

    return false;
}

export default ConditionSettings;
