import SkipButton from "../common/SkipButton.jsx";

const { __ } = wp.i18n;

/**
 * CTA Preview Component
 * Shows CTA layer preview
 */
const EmailPreview = ({ layer }) => {
  if (!layer) return null;
  const borderRadius = layer.email_capture?.border_radius || 4;
  const containerStyles = {
    borderRadius: `${borderRadius}px`
  };
  const inputStyles = {
    borderRadius: window.innerWidth >= 576 ?
      `${borderRadius}px 0 0 ${borderRadius}px` :
      `${borderRadius}px`
  };
  const buttonStyles = {
    ...(layer.email_capture?.button_bg_color ? { backgroundColor: layer.email_capture.button_bg_color } : {}),
    ...(layer.email_capture?.button_color ? { color: layer.email_capture.button_color } : {}),
    borderRadius: window.innerWidth >= 576 ?
      `0 ${borderRadius}px ${borderRadius}px 0` :
      `${borderRadius}px`
  };
  const handleClick = (e) => {
    e.preventDefault();
  };
  return (
    <div
      className="fluent-player-layer-cta-email-content"
      style={layer.bg_color ? { backgroundColor: layer.bg_color } : undefined}
    >
      <div
        className="media-email-capture-overlay"
      >
        <div className="email-capture-container" style={ containerStyles }>
          <h2 className="email-capture-headline">{ layer.email_capture.headline}</h2>

          <div className="email-capture-form">
            <input
              type="email"
              placeholder={ layer.email_capture.placeholder}
              className="email-capture-input"
              style={ inputStyles }
            />
            <button
              className="email-capture-button"
              style={ buttonStyles }
              onClick={ handleClick }
            >
              { layer.email_capture.button_text}
            </button>
          </div>

          <p className="email-capture-bottom-text">{ layer.email_capture.bottom_text}</p>

        </div>
      </div>
      { layer.allow_skip && <SkipButton /> }
    </div>
  );
};

export default EmailPreview;