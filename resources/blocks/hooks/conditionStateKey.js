const LAYER_STATE_FIELDS = new Set(['layer.seen', 'layer.completed']);

export const usesLayerConditionState = (conditionals) => {
    const rules = conditionals?.rules;

    if (!conditionals?.enabled || !Array.isArray(rules) || !rules.length) {
        return false;
    }

    return rules.some((rule) => LAYER_STATE_FIELDS.has(rule?.field));
};

export const createConditionStateKey = () => {
    return `cs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const applyConditionStateKey = (layerData) => {
    if (!usesLayerConditionState(layerData?.conditionals)) {
        delete layerData.condition_state_key;
        return layerData;
    }

    layerData.condition_state_key = createConditionStateKey();
    return layerData;
};
