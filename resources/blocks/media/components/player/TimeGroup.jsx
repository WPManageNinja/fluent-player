/**
 * TimeGroup component for Fluent Player
 * Based on player/controls/time-group.php
 */

const TimeGroup = () => {
    return (
        <div className="fp-media-time-group">
            <media-time type="current"></media-time>
            <div className="fp-media-time-divider">/</div>
            <media-time type="duration"></media-time>
        </div>
    );
};

export default TimeGroup;