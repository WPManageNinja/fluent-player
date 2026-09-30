/**
 * Ambient-preset detection.
 *
 * The Ambient preset is seeded with skin "minimal" (see PresetService.php), so
 * the preset cards cannot distinguish it from the Minimal preset by skin alone.
 * These predicates identify the Ambient preset so its card can show a distinct
 * muted-speaker icon. Mirrors PresetService::isAmbientPresetSettings() on the
 * PHP side (slug "ambient" OR the canonical muted-autoplay-loop-no-controls
 * settings shape).
 *
 * Unit-tested in tests/unit/blocks/ambientPreset.test.js.
 */

export const isAmbientPresetSettings = (settings = {}) => (
	settings?.skin === 'minimal'
	&& settings?.behaviors?.muted_autoplay === true
	&& settings?.behaviors?.on_video_end === 'loop'
	&& settings?.behaviors?.hide_top_controls === true
	&& settings?.behaviors?.hide_center_controls === true
	&& settings?.behaviors?.hide_bottom_controls === true
);

export const isAmbientPreset = (preset = {}) => {
	if (preset?.slug === 'ambient' || preset?.settings?.slug === 'ambient') {
		return true;
	}
	return isAmbientPresetSettings(preset?.settings || {});
};
