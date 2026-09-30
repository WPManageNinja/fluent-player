import { computeCoverage } from './coverage.js';

function clamp01(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(n, 1));
}

export function evaluate(evidence, policy) {
    const ratio = clamp01(evidence && evidence.ratio);
    const ended = !!(evidence && evidence.ended);
    const mutedAutoplayActive = !!(evidence && evidence.mutedAutoplayActive);

    const threshold = clamp01(policy && policy.threshold);
    const countMutedAutoplay = !!(policy && policy.countMutedAutoplay);

    if (mutedAutoplayActive && !countMutedAutoplay) {
        return { complete: false, reason: null };
    }

    if (ratio >= threshold) {
        return { complete: true, reason: ended ? 'ended' : 'threshold' };
    }

    return { complete: false, reason: null };
}

export function evaluateFromSegments(segments, duration, flags, policy) {
    const ratio = computeCoverage(segments, duration);
    return evaluate(
        {
            ratio,
            ended: !!(flags && flags.ended),
            mutedAutoplayActive: !!(flags && flags.mutedAutoplayActive)
        },
        policy
    );
}
