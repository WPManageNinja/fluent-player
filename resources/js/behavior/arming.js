/**
 * An anonymous viewer can become identifiable through media-level email capture OR
 * an email-capture layer (stored as a cta subtype) — both must arm the reporters.
 */
export function mediaHasEmailCapture(settings) {
    if (settings?.email_capture?.enabled) {
        return true;
    }
    const layers = Array.isArray(settings?.layers) ? settings.layers : [];
    return layers.some((l) => l && (l.type === 'email' || (l.type === 'cta' && l.cta_type === 'email')));
}

// mirrors BehaviorRegistry::normalizedLayerType — email capture is a cta subtype
export function normalizedLayerType(layer) {
    const type = layer?.type || '';
    if (type === 'cta' && layer?.cta_type === 'email') {
        return 'email';
    }
    return type;
}

export function resolveArmedLayers(config, mediaId, mediaLayers = []) {
    if (!config || !config.active) {
        return null;
    }

    const media = config.media || {};
    const entry = media[mediaId] || media[String(mediaId)] || {};
    const any = config.any || {};

    const merged = { ...(any.layers || {}) };

    // all-media scope arms by event/type; expand it against this media's local layers
    const layersAll = Array.isArray(any.layers_all) ? any.layers_all : [];
    const layerTypes = any.layer_types || {};
    if (layersAll.length || Object.keys(layerTypes).length) {
        for (const layer of Array.isArray(mediaLayers) ? mediaLayers : []) {
            const layerId = layer?.id;
            if (!layerId) continue;
            const events = [...layersAll, ...(layerTypes[normalizedLayerType(layer)] || [])];
            if (events.length) {
                merged[String(layerId)] = Array.from(new Set([...(merged[String(layerId)] || []), ...events]));
            }
        }
    }

    for (const [layerId, events] of Object.entries(entry.layers || {})) {
        const existing = merged[layerId] || [];
        merged[layerId] = Array.from(new Set([...existing, ...(Array.isArray(events) ? events : [])]));
    }

    return Object.keys(merged).length ? merged : null;
}

export function resolveArmedMilestones(config, mediaId) {
    if (!config || !config.active) {
        return null;
    }

    const media = config.media || {};
    const specific = media[mediaId] || media[String(mediaId)] || null;
    const any = config.any || null;
    if (!specific && !any) {
        return null;
    }

    const a = specific || {};
    const b = any || {};
    const union = (x, y) => Array.from(new Set([
        ...(Array.isArray(x) ? x : []),
        ...(Array.isArray(y) ? y : []),
    ]));

    return {
        started: !!(a.started || b.started),
        quartiles: union(a.quartiles, b.quartiles),
        completions: union(a.completions, b.completions),
    };
}
