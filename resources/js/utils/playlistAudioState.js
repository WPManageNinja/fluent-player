/**
 * Per-item audio/video state for the playlist player container. A mixed
 * playlist renders both skins; the runtime toggles `.fp-audio` on the player
 * container per item (and the container background for audio posters). Pure so
 * it can be unit-tested without the DOM/player.
 */
export function audioContainerState(viewType, posterSrc) {
    const isAudio = viewType === 'audio';
    return {
        isAudio,
        // fp-audio is present iff the current item is audio.
        fpAudio: isAudio,
        // Audio items show their poster as the container background; video items
        // (and audio without a poster) clear it.
        backgroundImage: isAudio && posterSrc ? `url("${posterSrc}")` : '',
    };
}
