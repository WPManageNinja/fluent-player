/**
 * VolumeSlider component for Fluent Player
 */

const VolumeSlider = () => {
    return (
        <media-volume-slider class="fp-media-slider">
            <div className="fp-media-slider-track"></div>
            <div className="fp-media-slider-track-fill fp-media-slider-track"></div>
            <div className="fp-media-slider-thumb"></div>
            <media-slider-preview no-clamp>
                <media-slider-value></media-slider-value>
            </media-slider-preview>
        </media-volume-slider>
    );
};

export default VolumeSlider;