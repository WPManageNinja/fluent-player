let pageQueryCache = null;

const BOOLEAN_FIELDS = new Set([
    'viewer.is_logged_in',
    'viewer.is_crm_contact',
    'viewer.email_submitted',
    'layer.seen',
    'layer.completed',
]);

export function hasEnabledConditionals(conditionals) {
    return Boolean(conditionals?.enabled) && Array.isArray(conditionals?.rules) && conditionals.rules.length > 0;
}

export function mergeConditionStates(baseState = {}, dynamicState = {}) {
    return {
        ...baseState,
        ...dynamicState,
        viewer: {
            ...(baseState.viewer || {}),
            ...(dynamicState.viewer || {}),
        },
        page: {
            ...(baseState.page || {}),
            ...(dynamicState.page || {}),
            query: {
                ...((baseState.page && baseState.page.query) || {}),
                ...((dynamicState.page && dynamicState.page.query) || {}),
            },
        },
        layer: {
            ...(baseState.layer || {}),
            ...(dynamicState.layer || {}),
        },
    };
}

export function evaluateConditionals(conditionals, context = {}) {
    if (!hasEnabledConditionals(conditionals)) {
        return true;
    }

    const results = conditionals.rules.map((rule) => matchRule(rule, context));
    if (conditionals.match === 'any') {
        return results.some(Boolean);
    }

    return results.every(Boolean);
}

export function resolveRuleValue(rule, context = {}) {
    switch (rule.field) {
        case 'viewer.is_logged_in':
            return Boolean(context?.viewer?.is_logged_in);
        case 'viewer.is_crm_contact':
            return Boolean(context?.viewer?.is_crm_contact);
        case 'viewer.crm_tag':
            return Array.isArray(context?.viewer?.crm_tags) ? context.viewer.crm_tags : [];
        case 'viewer.crm_list':
            return Array.isArray(context?.viewer?.crm_lists) ? context.viewer.crm_lists : [];
        case 'viewer.email_submitted':
            return Boolean(context?.viewer?.email_submitted);
        case 'layer.seen':
            return Boolean(context?.layer?.seen);
        case 'layer.completed':
            return Boolean(context?.layer?.completed);
        case 'page.query':
            return getPageQueryValue(rule.key, context);
        default:
            return null;
    }
}

function matchRule(rule, context) {
    const actual = resolveRuleValue(rule, context);
    const expected = BOOLEAN_FIELDS.has(rule.field)
        ? toBoolean(rule.value)
        : stringifyValue(rule.value);

    switch (rule.operator) {
        case '=':
            if (Array.isArray(actual)) {
                return actual.map(stringifyValue).includes(stringifyValue(expected));
            }
            return BOOLEAN_FIELDS.has(rule.field)
                ? Boolean(actual) === expected
                : stringifyValue(actual) === expected;
        case '!=':
            if (Array.isArray(actual)) {
                return !actual.map(stringifyValue).includes(stringifyValue(expected));
            }
            return BOOLEAN_FIELDS.has(rule.field)
                ? Boolean(actual) !== expected
                : stringifyValue(actual) !== expected;
        case 'contains': {
            const actualValue = stringifyValue(actual).toLowerCase();
            const expectedValue = stringifyValue(expected).toLowerCase();
            if (!actualValue || !expectedValue) {
                return false;
            }
            return actualValue.includes(expectedValue);
        }
        default:
            return false;
    }
}

function getPageQueryValue(key, context) {
    if (!key) {
        return null;
    }

    if (context?.page?.query && Object.prototype.hasOwnProperty.call(context.page.query, key)) {
        return context.page.query[key];
    }

    if (typeof window === 'undefined' || !window.location) {
        return null;
    }

    if (pageQueryCache === null) {
        pageQueryCache = {};
        const params = new URLSearchParams(window.location.search || '');
        params.forEach((value, paramKey) => {
            pageQueryCache[paramKey] = value;
        });
    }

    return Object.prototype.hasOwnProperty.call(pageQueryCache, key) ? pageQueryCache[key] : null;
}

function stringifyValue(value) {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value);
}

function toBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'number') {
        return value !== 0;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1') {
            return true;
        }
        if (normalized === 'false' || normalized === '0' || normalized === '') {
            return false;
        }
    }

    return Boolean(value);
}
