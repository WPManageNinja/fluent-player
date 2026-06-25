/**
 * Shared Icon Renderer Component
 * Provides consistent SVG icons across components
 */
const IconRenderer = ({ iconName, className = '', style = {} }) => {
    const svgIconPath = window.fluentPlayerBlockVars?.svgIcons?.[iconName];
    if (!svgIconPath) {
        return null;
    }
    return (
        <svg
            viewBox="0 0 512 512"
            className={ className }
            style={{fill: '#ffffff', ...style }}
            dangerouslySetInnerHTML={{ __html: svgIconPath }}
        >
        </svg>
    );
};

export default IconRenderer;