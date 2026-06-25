export const LAYER_SECTION_IDS = {
	DISPLAY: 'display',
	CONTENT: 'content',
	CONTROLS: 'controls',
	LAYOUT: 'layout',
	APPEARANCE: 'appearance',
	CONDITIONS: 'conditions',
	PROVIDER_SETUP: 'provider-setup',
	HOTSPOTS: 'hotspots',
	FORM_CONTENT: 'form-content'
};

const DEFAULT_OPEN_SECTIONS = {
	cta: [LAYER_SECTION_IDS.DISPLAY, LAYER_SECTION_IDS.CONTENT],
	email: [LAYER_SECTION_IDS.CONTENT, LAYER_SECTION_IDS.DISPLAY],
	form: [LAYER_SECTION_IDS.CONTENT, LAYER_SECTION_IDS.LAYOUT],
	hotspot: [LAYER_SECTION_IDS.HOTSPOTS, LAYER_SECTION_IDS.DISPLAY],
	ad: [LAYER_SECTION_IDS.CONTENT, LAYER_SECTION_IDS.DISPLAY],
	shortcode: [LAYER_SECTION_IDS.CONTENT]
};

export const getDefaultOpenSections = (layerKey) => {
	return DEFAULT_OPEN_SECTIONS[layerKey] || [];
};
