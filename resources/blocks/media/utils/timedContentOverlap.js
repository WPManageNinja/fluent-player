/**
 * Find sections whose range is overlapped by an EARLIER sibling.
 *
 * The frontend resolves overlaps by list order (first match wins, with the
 * range treated as [start, end) — see timed-content-frontend.js), so the later
 * chip is the one that loses priority and should be flagged. Ranges that merely
 * touch (a.start === b.end) do NOT overlap, matching the frontend's `< end`.
 *
 * @param {Array<{clientId: string, attributes: {startTime: number, endTime: number}}>} blocks
 * @return {Set<string>} clientIds of sections overlapped by an earlier sibling.
 */
export const findOverlappingSectionIds = (blocks) => {
    const ids = new Set();
    if (!Array.isArray(blocks)) return ids;

    for (let i = 0; i < blocks.length; i++) {
        const a = blocks[i]?.attributes;
        if (!a) continue;
        for (let j = 0; j < i; j++) {
            const b = blocks[j]?.attributes;
            if (!b) continue;
            if (a.startTime < b.endTime && b.startTime < a.endTime) {
                ids.add(blocks[i].clientId);
                break;
            }
        }
    }
    return ids;
};
