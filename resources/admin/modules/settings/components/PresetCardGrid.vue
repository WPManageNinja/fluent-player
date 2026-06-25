<script setup>
const props = defineProps({
	presets: { type: Array, default: () => [] },
	selectedSlug: { type: String, default: null },
	loading: { type: Boolean, default: false },
	hasPro: { type: Boolean, default: false }
});

const emit = defineEmits(['select', 'locked']);

const getSkin = (preset) => {
	return preset.settings?.skin || preset.settings?.slug || 'modern';
};

// The Ambient preset uses the minimal skin, so it is identified by slug or by
// its canonical muted-autoplay-loop-no-controls shape. Mirrors ambientPreset.js
// and PresetService::isAmbientPresetSettings().
const isAmbient = (preset) => {
	if (preset.slug === 'ambient' || preset.settings?.slug === 'ambient') {
		return true;
	}
	const s = preset.settings || {};
	return s.skin === 'minimal'
		&& s.behaviors?.muted_autoplay === true
		&& s.behaviors?.on_video_end === 'loop'
		&& s.behaviors?.hide_top_controls === true
		&& s.behaviors?.hide_center_controls === true
		&& s.behaviors?.hide_bottom_controls === true;
};

// The Ambient preset is Pro-only; free users see a locked card that opens the
// upgrade modal instead of selecting it.
const isLocked = (preset) => isAmbient(preset) && !props.hasPro;

const onCardClick = (preset) => {
	if (isLocked(preset)) {
		emit('locked', preset);
		return;
	}
	emit('select', preset);
};

const getPreviewClass = (preset) => {
	const skin = getSkin(preset);
	const classMap = {
		'classic': 'fplayer-preset-preview-classic',
		'modern': 'fplayer-preset-preview-modern',
		'course': 'fplayer-preset-preview-modern',
		'default': 'fplayer-preset-preview-classic',
		'simple': 'fplayer-preset-preview-simple',
		'minimal': 'fplayer-preset-preview-minimal',
		'standard': 'fplayer-preset-preview-standard',
		'floating': 'fplayer-preset-preview-floating',
	};
	return classMap[skin] || 'fplayer-preset-preview-default';
};
</script>

<template>
	<div v-if="loading" class="fplayer-preset-skeleton" aria-hidden="true">
		<el-skeleton animated>
			<template #template>
				<div class="fplayer-preset-grid">
					<div v-for="n in 4" :key="n">
						<el-skeleton-item variant="image" class="fplayer-preset-skeleton-preview" />
						<div class="fplayer-preset-card-footer">
							<el-skeleton-item variant="text" class="fplayer-preset-skeleton-name" />
						</div>
					</div>
				</div>
			</template>
		</el-skeleton>
	</div>
	<div
		v-else-if="presets.length"
		class="fplayer-preset-grid"
		role="group"
		aria-label="Default preset"
	>
		<div v-for="preset in presets" :key="preset.slug">
			<button
				type="button"
				class="fplayer-preset-card"
				:class="{ 'is-selected': selectedSlug === preset.slug, 'is-locked': isLocked(preset) }"
				:aria-pressed="selectedSlug === preset.slug"
				:aria-disabled="isLocked(preset)"
				:aria-label="`Select ${preset.name} preset`"
				@click="onCardClick(preset)"
			>
				<span
					v-if="isLocked(preset)"
					class="fplayer-preset-lock-badge"
					role="img"
					:aria-label="$t('Pro feature')"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
				</span>
				<div :class="['fplayer-preset-preview', getPreviewClass(preset)]">
					<div class="fplayer-preset-video-area">
						<svg v-if="isAmbient(preset)" class="fplayer-preset-muted-icon fplayer-preset-replay-muted-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5" style="fill:none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><svg x="6.25" y="6.25" width="12" height="12" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z" fill="currentColor"/></svg></svg>
						<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.1 33.5 24 42.2s33.1 8.9 48.2-.4l288-176c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z" fill="currentColor"/></svg>
					</div>

					<!-- classic / default -->
					<div v-if="getSkin(preset) === 'classic' || getSkin(preset) === 'default'" class="fplayer-preset-controls fplayer-preset-controls-default">
						<div class="fplayer-preset-progress-row">
							<div class="fplayer-preset-progress"></div>
						</div>
						<div class="fplayer-preset-buttons-row">
							<span class="fplayer-preset-time"></span>
							<div class="fplayer-preset-center-buttons">
								<span class="fplayer-preset-dot-sm"></span>
								<span class="fplayer-preset-dot-sm"></span>
								<span class="fplayer-preset-dot"></span>
								<span class="fplayer-preset-dot-sm"></span>
								<span class="fplayer-preset-dot-sm"></span>
							</div>
							<div class="fplayer-preset-buttons">
								<span class="fplayer-preset-dot"></span>
								<span class="fplayer-preset-dot"></span>
								<span class="fplayer-preset-dot"></span>
							</div>
						</div>
					</div>

					<!-- modern / course -->
					<div v-else-if="getSkin(preset) === 'modern' || getSkin(preset) === 'course'" class="fplayer-preset-controls fplayer-preset-controls-modern">
						<span class="fplayer-preset-dot"></span>
						<span class="fplayer-preset-dot"></span>
						<span class="fplayer-preset-dot"></span>
						<span class="fplayer-preset-time"></span>
						<div class="fplayer-preset-progress"></div>
						<span class="fplayer-preset-dot"></span>
						<span class="fplayer-preset-dot"></span>
					</div>

					<!-- simple -->
					<div v-else-if="getSkin(preset) === 'simple'" class="fplayer-preset-controls fplayer-preset-controls-simple">
						<span class="fplayer-preset-dot"></span>
						<div class="fplayer-preset-progress"></div>
						<span class="fplayer-preset-dot"></span>
					</div>

					<!-- standard -->
					<div v-else-if="getSkin(preset) === 'standard'" class="fplayer-preset-controls fplayer-preset-controls-standard">
						<div class="fplayer-preset-progress-row">
							<span class="fplayer-preset-time"></span>
							<div class="fplayer-preset-progress"></div>
							<span class="fplayer-preset-time"></span>
						</div>
						<div class="fplayer-preset-buttons-row">
							<span class="fplayer-preset-dot"></span>
							<div class="fplayer-preset-center-buttons">
								<span class="fplayer-preset-dot-sm"></span>
								<span class="fplayer-preset-dot-sm"></span>
								<span class="fplayer-preset-dot"></span>
								<span class="fplayer-preset-dot-sm"></span>
								<span class="fplayer-preset-dot-sm"></span>
							</div>
							<span class="fplayer-preset-dot"></span>
						</div>
					</div>

					<!-- floating -->
					<div v-else-if="getSkin(preset) === 'floating'" class="fplayer-preset-floating-wrapper">
						<div class="fplayer-preset-controls fplayer-preset-controls-floating">
							<span class="fplayer-preset-dot"></span>
							<span class="fplayer-preset-time"></span>
							<div class="fplayer-preset-progress"></div>
							<span class="fplayer-preset-dot"></span>
							<span class="fplayer-preset-dot"></span>
						</div>
					</div>

					<!-- minimal has no controls -->
				</div>
			</button>
			<div class="fplayer-preset-card-footer">
				<span class="fplayer-preset-name">{{ preset.name }}</span>
			</div>
		</div>
	</div>
</template>
