const { __ } = wp.i18n;
const { useEffect, useRef } = wp.element;

const DEFAULT_INTERVAL = 10;

const getRandomPosition = (el) => {
	const parent = el.parentElement;
	if (!parent) return { top: 5, left: 5 };
	const parentRect = parent.getBoundingClientRect();
	const elRect = el.getBoundingClientRect();
	const maxTop = Math.max(0, Math.floor(((parentRect.height - elRect.height) / parentRect.height) * 100));
	const maxLeft = Math.max(0, Math.floor(((parentRect.width - elRect.width) / parentRect.width) * 100));
	return {
		top: Math.floor(Math.random() * (maxTop + 1)),
		left: Math.floor(Math.random() * (maxLeft + 1)),
	};
};

const setPosition = (el, top, left) => {
	el.style.top = top + '%';
	el.style.left = left + '%';
	el.style.right = 'auto';
	el.style.bottom = 'auto';
};

const OverlayPreview = ({ overlay }) => {
	const overlayRef = useRef(null);

	const isDynamic = !!overlay?.dynamic_position;
	const animation = overlay?.reposition_animation || 'fade';
	const intervalSec = overlay?.reposition_interval || DEFAULT_INTERVAL;

	useEffect(() => {
		if (!isDynamic || !overlayRef.current) return;

		const el = overlayRef.current;
		const timers = [];

		const moveOverlay = () => {
			const pos = getRandomPosition(el);

			if (animation === 'fade') {
				el.style.transition = 'opacity 0.4s ease';
				el.style.opacity = '0';
				const t = setTimeout(() => {
					setPosition(el, pos.top, pos.left);
					el.style.opacity = '1';
				}, 400);
				timers.push(t);
			} else if (animation === 'slide') {
				el.style.transition = 'top 1.5s ease, left 1.5s ease';
				setPosition(el, pos.top, pos.left);
			} else {
				el.style.transition = 'none';
				setPosition(el, pos.top, pos.left);
			}
		};

		// Set initial position without animation, then start moving
		el.style.transition = 'none';
		el.style.opacity = '1';
		const initPos = getRandomPosition(el);
		setPosition(el, initPos.top, initPos.left);

		// First animated move after a frame so initial position is painted
		const startTimer = setTimeout(moveOverlay, 50);
		timers.push(startTimer);

		const intervalId = setInterval(moveOverlay, intervalSec * 1000);

		return () => {
			clearInterval(intervalId);
			timers.forEach(t => clearTimeout(t));
			el.style.transition = '';
			el.style.opacity = '';
			el.style.top = '';
			el.style.left = '';
			el.style.right = '';
			el.style.bottom = '';
		};
	}, [isDynamic, animation, intervalSec]);

	if (!overlay || !overlay.text) return null;

	const hasLink = overlay.link && String(overlay.link).trim() !== "";
	const text = overlay.text || __("Enter overlay text...", "fluent-player");

	return (
		<div
			ref={ overlayRef }
			className={ `fp-media-custom-overlay active ${ isDynamic ? 'position-dynamic' : overlay.position }` }
		>
			<div
				className="fp-media-custom-overlay-block"
				style={ {
					...(overlay.backgroundColor ? { backgroundColor: overlay.backgroundColor } : {}),
					...(overlay.textColor ? { color: overlay.textColor } : {})
				} }
			>
				{ hasLink ? (
					<a
						className="fp-media-custom-overlay-link"
						href={ overlay.link }
						target="_blank"
						rel="noopener noreferrer"
						onClick={ (e) => e.preventDefault() }
					>
						{ text }
					</a>
				) : (
					<span className="fp-media-custom-overlay-text">{ text }</span>
				) }
			</div>
		</div>
	);
};

export default OverlayPreview;
