/**
 * Gestures component for Fluent Player
 * Based on player/gestures.php
 */

const Gestures = () => {
    return (
        <>
            <media-gesture event="pointerup" action="toggle:paused"></media-gesture>
            <media-gesture event="dblpointerup" action="toggle:fullscreen"></media-gesture>
            <media-gesture event="pointerup" action="toggle:controls"></media-gesture>
            <media-gesture event="dblpointerup" action="seek:-10"></media-gesture>
            <media-gesture event="dblpointerup" action="seek:10"></media-gesture>
        </>
    );
};

export default Gestures;