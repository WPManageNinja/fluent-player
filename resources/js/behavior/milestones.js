// Pure milestone-bucket logic — mirrored by app/Services/Behavior/Milestones.php.
// Any change here must keep resources/milestones/conformance.json green in both runtimes.

export const QUARTILE_BOUNDARIES = { q25: 0.25, q50: 0.5, q75: 0.75 };
const QUARTILE_KEYS = ['q25', 'q50', 'q75'];

function ascending(a, b) {
    return a - b;
}

export function reachedMilestones(evidence, armed) {
    const coverage = clamp01(evidence && evidence.coverage);
    const durationKnown = !!(evidence && evidence.durationKnown);
    const started = !!(evidence && evidence.started);
    const ended = !!(evidence && evidence.ended);

    // highest coverage the duration math can ever measure (rounding and container
    // padding eat the final second); thresholds above it are capped so a 100%
    // completion stays reachable
    let maxCoverage = clamp01(evidence && evidence.maxCoverage);
    if (!(maxCoverage > 0)) {
        maxCoverage = 1;
    }

    const quartiles = Array.isArray(armed && armed.quartiles) ? armed.quartiles : [];
    const completions = Array.isArray(armed && armed.completions) ? armed.completions : [];

    const reached = [];

    if (armed && armed.started && started) {
        reached.push({ key: 'started', boundary: null });
    }

    if (durationKnown) {
        for (const key of QUARTILE_KEYS) {
            if (quartiles.includes(key) && coverage >= QUARTILE_BOUNDARIES[key]) {
                reached.push({ key, boundary: QUARTILE_BOUNDARIES[key] });
            }
        }
        for (const threshold of [...completions].sort(ascending)) {
            if (isFraction(threshold) && coverage >= Math.min(threshold, maxCoverage)) {
                reached.push({ key: 'completed', boundary: threshold });
            }
        }
    } else if (ended && completions.length > 0) {
        reached.push({ key: 'completed', boundary: null });
    }

    return reached;
}

export function milestoneKey(milestone) {
    const boundary = milestone.boundary === null || milestone.boundary === undefined
        ? 'x'
        : Number(milestone.boundary).toFixed(4);
    return `${milestone.key}:${boundary}`;
}

function clamp01(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return 0;
    }
    return Math.max(0, Math.min(value, 1));
}

function isFraction(value) {
    return typeof value === 'number' && value > 0 && value <= 1;
}
