import { formatTime, getIconByName, getLayerSubType } from "@share/helper.js";
import './VideoTimeSliderStyle.scss';
const {useState, useRef, useEffect} = wp.element;
const { Dashicon } = wp.components;

/**
 * Video Time Slider Component
 */
const VideoTimeSlider = ({
    currentTime,
    duration,
    items,
    onTimeChange,
    onItemEdit,
    type,
    positionOptions
}) => {
    const [hoverTime, setHoverTime] = useState(null);
    const [hoverPosition, setHoverPosition] = useState(0);
    const [hoveredMarker, setHoveredMarker] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const sliderRef = useRef(null);
    const seekerIdRef = useRef(`seeker-${Math.random().toString(36).substr(2, 9)}`);

    const getTimeDetailsFromClientX = (clientX) => {
        if (!sliderRef.current || duration <= 0) {
            return null;
        }

        const rect = sliderRef.current.getBoundingClientRect();
        if (!rect.width) {
            return null;
        }

        const x = clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, x / rect.width));
        const percentage = ratio * 100;
        const time = ratio * duration;

        return { time, percentage };
    };

    const handleMouseMove = (e) => {
        const details = getTimeDetailsFromClientX(e.clientX);
        if (!details) {
            return;
        }

        setHoverTime(details.time);
        setHoverPosition(details.percentage);
    };

    const handleMouseLeave = () => {
        setHoverTime(null);
        setHoveredMarker(null);
    };

    const handleClick = (e) => {
        const details = getTimeDetailsFromClientX(e.clientX);
        if (details) {
            onTimeChange(details.time);
        }
    };

    const handleMouseDown = (e) => {
        if (e.button !== 0) {
            return;
        }

        e.preventDefault();

        const details = getTimeDetailsFromClientX(e.clientX);
        if (!details) {
            return;
        }

        onTimeChange(details.time);
        setIsDragging(true);
    };

    const handleMarkerClick = (e, item) => {
        e.stopPropagation();
        if (onItemEdit) {
            onItemEdit(item);
        }
    };

    const handleMarkerHover = (item) => {
        setHoveredMarker(item);
    };

    const handleSeekerMouseDown = (e) => {
        if (e.button !== 0) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        handleMouseDown(e);
    };


    useEffect(() => {
        if (isDragging) {
            const handleMouseMove = (e) => {
                const details = getTimeDetailsFromClientX(e.clientX);
                if (details) {
                    onTimeChange(details.time);
                }
            };

            const handleMouseUp = () => {
                setIsDragging(false);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, duration, onTimeChange]);

    const safeDuration = Math.max(0, duration || 0);
    const safeCurrentTime = Math.max(0, Math.min(safeDuration, currentTime || 0));
    const playedPercentage = safeDuration > 0 ? (safeCurrentTime / safeDuration) * 100 : 0;

    return (
        <div className="fluent-player-video-time-slider">
            <div
                ref={sliderRef}
                className="time-slider-track"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
                onMouseDown={handleMouseDown}
            >
                {/* Item markers */}
                <div className="time-slider-markers">
                    {items.map((item) => {
                        const markerPosition = safeDuration > 0 ? (item.displayTime / safeDuration) * 100 : 0;
                        const safeMarkerPosition = Math.max(0, Math.min(100, markerPosition));
                        return (
                            <div
                                key={item.id}
                                className={`item-marker ${item.type ? item.type + '-marker' : ''}`}
                                style={{ left: `${safeMarkerPosition}%` }}
                                onClick={(e) => handleMarkerClick(e, item)}
                                onMouseDown={(e) => e.stopPropagation()}
                                onMouseEnter={() => handleMarkerHover(item)}
                                onMouseLeave={() => setHoveredMarker(null)}
                            >
                                <div className="marker-pin">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M7.39929 12.767C6.02889 12.612 4.76968 11.9387 3.87988 10.885C2.99008 9.8313 2.53711 8.47711 2.61384 7.10011C2.69058 5.72311 3.2912 4.42764 4.29257 3.47933C5.29393 2.53102 6.62016 2.00173 7.99929 2C9.38013 1.999 10.7089 2.527 11.7124 3.47548C12.716 4.42397 13.318 5.72085 13.3949 7.09955C13.4717 8.47824 13.0174 9.83399 12.1255 10.8881C11.2336 11.9422 9.97169 12.6146 8.59929 12.767V15.2H7.39929V12.767ZM7.99929 11.6C8.55084 11.6 9.097 11.4914 9.60656 11.2803C10.1161 11.0692 10.5791 10.7599 10.9691 10.3699C11.3591 9.97984 11.6685 9.51684 11.8796 9.00727C12.0907 8.4977 12.1993 7.95155 12.1993 7.4C12.1993 6.84845 12.0907 6.3023 11.8796 5.79273C11.6685 5.28316 11.3591 4.82016 10.9691 4.43015C10.5791 4.04015 10.1161 3.73078 9.60656 3.51971C9.097 3.30864 8.55084 3.2 7.99929 3.2C6.88538 3.2 5.8171 3.6425 5.02944 4.43015C4.24179 5.21781 3.79929 6.28609 3.79929 7.4C3.79929 8.51391 4.24179 9.5822 5.02944 10.3699C5.8171 11.1575 6.88538 11.6 7.99929 11.6Z" fill="#525866"/>
                                    </svg>
                                    {
                                        type === 'overlays' && (
                                            <Dashicon icon="clock" />
                                        )
                                    }
                                </div>
                                
                                {hoveredMarker?.id === item.id && (
                                    <div className="marker-tooltip">
                                        <div className="marker-tooltip-content">
                                            {
                                                type === "layers" && (
                                                    <div>
                                                        <span className="marker-type">{ item.type }</span>
                                                        <span> - </span>
                                                        <span className="marker-subtype">{ getLayerSubType(item) }</span>
                                                    </div>
                                                )
                                            }
                                            {
                                                type === "overlays" && (
                                                    <div>
                                                        <span className="marker-type">{ item.text || __('Untitled Overlay', 'fluent-player') }</span>
                                                        <span> - </span>
                                                        <span className="marker-subtype"> { positionOptions.find(option => option.value === item.position)?.label }</span>
                                                    </div>
                                                )
                                            }
                                            <div className="marker-time">
                                                { formatTime(item.displayTime) }
                                            </div>
                                        </div>
                                    </div>
                                ) }
                            </div>
                        );
                    })}
                </div>

                {/* Current time marker */}
                <div
                    className={`time-slider-track-fill ${isDragging ? 'is-dragging' : ''}`}
                    style={{ width: `${Math.max(0, Math.min(100, playedPercentage))}%` }}
                />

                {/* Seeker thumb */}
                {safeDuration > 0 && (
                    <div
                        className={`time-slider-track-seeker ${isDragging ? 'is-dragging' : ''}`}
                        style={{
                            left: `${Math.max(0, Math.min(100, playedPercentage))}%`
                        }}
                        onMouseDown={handleSeekerMouseDown}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
                            <g filter={`url(#seeker-filter-${seekerIdRef.current})`}>
                                <circle cx="18" cy="12" r="8" fill="white"/>
                                <circle cx="18" cy="12" r="3" fill="#0E121B"/>
                            </g>
                            <defs>
                                <filter id={`seeker-filter-${seekerIdRef.current}`} x="0" y="0" width="36" height="36" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                                    <feOffset dy="2"/>
                                    <feGaussianBlur stdDeviation="2"/>
                                    <feColorMatrix type="matrix" values="0 0 0 0 0.054902 0 0 0 0 0.0705882 0 0 0 0 0.105882 0 0 0 0.03 0"/>
                                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_597_12737"/>
                                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                                    <feOffset dy="6"/>
                                    <feGaussianBlur stdDeviation="5"/>
                                    <feColorMatrix type="matrix" values="0 0 0 0 0.054902 0 0 0 0 0.0705882 0 0 0 0 0.105882 0 0 0 0.06 0"/>
                                    <feBlend mode="normal" in2="effect1_dropShadow_597_12737" result="effect2_dropShadow_597_12737"/>
                                    <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_597_12737" result="shape"/>
                                </filter>
                            </defs>
                        </svg>
                    </div>
                )}

                {/* Hover tooltip */}
                {hoverTime !== null && !hoveredMarker && (
                    <div
                        className="time-slider-tooltip"
                        style={{ left: `${hoverPosition}%` }}
                    >
                        {formatTime(hoverTime)}
                    </div>
                )}
            </div>

            <div className="time-info">
                <span className="current-time">
                    {formatTime(safeCurrentTime)}
                </span>
                <span className="total-time">
                    {formatTime(safeDuration)}
                </span>
            </div>
        </div>
    );
};

export default VideoTimeSlider;