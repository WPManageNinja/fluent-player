/**
 * TimeSlider component for Fluent Player
 */

const TimeSlider = ({settings}) => {
    return (
        <media-time-slider class="fp-media-slider">
            <media-slider-chapters>
                <template>
                    <div className="fp-media-slider-chapter">
                        <div className="fp-media-slider-track"></div>
                        <div className="fp-media-slider-track-fill fp-media-slider-track"></div>
                        <div className="fp-media-slider-progress fp-media-slider-track"></div>
                    </div>
                </template>
            </media-slider-chapters>
            <div className="fp-media-slider-thumb"></div>
            <media-slider-preview>
                {settings.thumbnails && (
                    <media-slider-thumbnail src={settings.thumbnails}></media-slider-thumbnail>
                )}
                <div data-part="chapter-title"></div>
                <media-slider-value></media-slider-value>
            </media-slider-preview>
        </media-time-slider>
    );
};

export default TimeSlider;
