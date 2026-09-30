const EPSILON = 0.1;

export function mergeSegments(segments, epsilon = EPSILON) {
    if (!Array.isArray(segments) || segments.length === 0) {
        return [];
    }

    const sorted = segments
        .filter((s) => s && s.end > s.start)
        .map((s) => ({ start: s.start, end: s.end }))
        .sort((a, b) => a.start - b.start);

    if (sorted.length === 0) {
        return [];
    }

    const merged = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        const last = merged[merged.length - 1];
        const current = sorted[i];
        if (current.start <= last.end + epsilon) {
            last.end = Math.max(last.end, current.end);
        } else {
            merged.push(current);
        }
    }
    return merged;
}

export function sumWatched(segments) {
    return mergeSegments(segments).reduce((total, s) => total + (s.end - s.start), 0);
}

export function computeCoverage(segments, duration) {
    if (!duration || duration <= 0) {
        return 0;
    }
    return Math.min(sumWatched(segments) / duration, 1);
}
