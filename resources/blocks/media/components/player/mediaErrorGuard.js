/**
 * Debounce guard for media element errors in the block editor preview.
 *
 * Streaming sources (HLS via hls.js, Bunny/Mux/Gumlet CDN) commonly fire a transient
 * `error` before the loader attaches and the stream becomes playable. Surfacing that
 * immediately flashes the error overlay on first load even though playback recovers.
 *
 * This guard defers surfacing an error until a short grace window elapses, and cancels
 * it if the player reports it has become playable (canplay / loadeddata / can-play)
 * within that window.
 *
 * @param {Object} opts
 * @param {number} [opts.delayMs=2500] Grace period before an error is surfaced.
 * @param {(error:any)=>void} opts.onFail Called with the error if it does not recover.
 * @returns {{ onError(error:any):void, onRecovered():void }}
 */
export function createMediaErrorGuard({ delayMs = 2500, onFail } = {}) {
    let timeoutId = null;

    const clear = () => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    return {
        onError(error) {
            // Collapse repeated errors into a single pending timer.
            if (timeoutId !== null) {
                return;
            }
            timeoutId = setTimeout(() => {
                timeoutId = null;
                if (typeof onFail === 'function') {
                    onFail(error);
                }
            }, delayMs);
        },
        onRecovered() {
            clear();
        },
    };
}

export default createMediaErrorGuard;
