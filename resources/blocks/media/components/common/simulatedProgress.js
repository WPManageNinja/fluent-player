/**
 * Simulated upload progress for server-side uploads.
 *
 * When a wp.media attachment is uploaded to a provider (Bunny, Mux) the file is already
 * on the WordPress server and is streamed server → provider, so the browser gets no real
 * byte-progress. This animates an estimated bar toward a 90% ceiling (the caller jumps to
 * 100% on completion), so the user still sees movement. Mirrors BunnyCDN's UX.
 *
 * @param {Object} opts
 * @param {number} [opts.fileSize=1000000] Source size in bytes (drives the estimate).
 * @param {number} [opts.intervalMs=100]   Tick interval.
 * @param {(pct:number)=>void} opts.onProgress Called with a rounded 0–90 percentage per tick.
 * @returns {{ start():void, stop():void }}
 */
export function createUploadProgressSimulator({ fileSize = 1000000, intervalMs = 100, onProgress } = {}) {
    // Estimate total upload seconds from size, clamped to a sane 5–60s window.
    const totalSeconds = Math.min(Math.max(fileSize / 100000, 5), 60);
    const increment = 90 / ((totalSeconds * 1000) / intervalMs);

    let timer = null;
    let pct = 0;

    return {
        start() {
            if (timer !== null) {
                return;
            }
            timer = setInterval(() => {
                pct = Math.min(90, pct + increment);
                if (typeof onProgress === 'function') {
                    onProgress(Math.round(pct));
                }
            }, intervalMs);
        },
        stop() {
            if (timer !== null) {
                clearInterval(timer);
                timer = null;
            }
        },
    };
}

export default createUploadProgressSimulator;
