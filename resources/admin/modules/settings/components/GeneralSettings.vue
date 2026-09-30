<script setup>
import { ref, onMounted, watch, nextTick, computed } from 'vue';
import { useProFeatures } from '@/composables/useFeatures.js';
import { usePreset } from '@/composables/usePreset.js';
import PresetCardGrid from './PresetCardGrid.vue';
import ProUpgrade from '@/components/ProUpgrade.vue';

const props = defineProps({
    settings: { type: Object, required: true }
});

const { isProActive } = useProFeatures();

const showPresetProModal = ref(false);

// Preset handling
const Preset = usePreset();
const presetLoading = ref(false);

const defaultPreset = computed({
    get: () => props.settings.default_preset || null,
    set: (value) => {
        props.settings.default_preset = value;
    }
});

const loadPresets = async () => {
    presetLoading.value = true;
    try {
        if (!Preset.list.length) {
            await Preset.get();
        }
    } catch (error) {
        console.error('Error loading presets:', error);
    } finally {
        presetLoading.value = false;
    }
};

const aspectRatios = [
    { value: 'original', label: 'Original' },
    { value: '16:9', label: 'Wide - 16:9' },
    { value: '4:3', label: 'Standard - 4:3' },
    { value: '1:1', label: 'Square - 1:1' },
    { value: '9:16', label: 'Tall - 9:16' },
    { value: '3:2', label: 'Classic - 3:2' },
    { value: '2:3', label: 'Classic Portrait - 2:3' }
];

const aceLoaded = ref(false);
const aceLoading = ref(true);

const aceBase = window.fluentFrameworkAdmin?.asset_url + 'ace';
const cssEditorId = 'fluent_custom_css';
// Custom CSS and Auto Resume Playback are Pro features; free users see an
// upgrade CTA (the shared .fplayer-pro-upsell card) instead of the control.
const cssUpsellUrl = 'https://fluentplayer.com/?feature=custom_css';
const resumeUpsellUrl = 'https://fluentplayer.com/?feature=resume_playback';

const cssEditor = ref(null);
const cssError = ref('');

// Dynamically load Ace script using the path variable
function loadAceScript() {
    if (window.ace) {
        aceLoaded.value = true;
        return;
    }
    const el = document.createElement('script');
    el.src = aceBase + '/ace.js';
    el.onload = () => { aceLoaded.value = true; };
    document.head.appendChild(el);
}

function initEditor(editorRef, id, mode, theme, valueProp, errorRef) {
    const ace = window.ace;
    if (!ace || !aceLoaded.value || editorRef.value) return;

    ace.config.set('workerPath', aceBase);
    ace.config.set('modePath', aceBase);
    ace.config.set('themePath', aceBase);

    const instance = ace.edit(id);
    editorRef.value = instance;
    instance.setTheme(theme);
    instance.session.setMode("ace/mode/" + mode);
    instance.setOptions({
        fontSize: "14px",
        showPrintMargin: false
    });

    // initial value
    instance.session.setValue(props.settings[valueProp]);

    instance.session.on('change', () => {
        errorRef.value = '';
        props.settings[valueProp] = instance.session.getValue();
    });

    watch(() => props.settings[valueProp], (val) => {
        if (instance.session.getValue() !== val) {
            instance.session.setValue(val);
        }
    });

    // error/watch
    instance.session.on("changeAnnotation", () => {
        const annots = instance.session.getAnnotations() || [];
        errorRef.value = '';
        for (const annot of annots) {
            if (annot.type === 'error') {
                errorRef.value = annot.text;
                break;
            }
        }
    });

    aceLoading.value = false;
}

// Watch for aceLoaded and mount the editor only once DOM and Ace are ready.
// Custom CSS is a Pro feature — the editor only exists when Pro is active.
watch(aceLoaded, (loaded) => {
    if (loaded && isProActive.value) nextTick(() => {
        initEditor(cssEditor, cssEditorId, 'css', 'ace/theme/monokai', 'custom_css', cssError);
    });
}, { immediate: true });

onMounted(() => {
    if (isProActive.value) {
        loadAceScript();
    }
    loadPresets();
});
</script>

<template>
    <div class="fplayer-settings-section fplayer-general-settings-section">
        <el-form label-position="top">
            <div class="fplayer-form-item fplayer-form-item-full-width">
                <div class="fplayer-form-label-wrapper">
                    <label class="fplayer-form-label">Default Preset</label>
                    <p class="fplayer-form-help">Select the default preset to use for new media</p>
                </div>
                <div class="fplayer-form-control">
                    <PresetCardGrid
                        :presets="Preset.list"
                        :selectedSlug="defaultPreset"
                        :loading="presetLoading"
                        :hasPro="isProActive"
                        @locked="showPresetProModal = true"
                        @select="(preset) => defaultPreset = preset.slug"
                    />
                </div>
            </div>

            <div class="fplayer-form-item">
                <div class="fplayer-form-label-wrapper">
                    <label class="fplayer-form-label">Default Aspect Ratio</label>
                    <div class="fplayer-form-help">Default aspect ratio for all players (can be overridden per media)</div>
                </div>
                <div class="fplayer-form-control">
                    <el-select v-model="props.settings.default_aspect_ratio" placeholder="Select Aspect Ratio" aria-label="Default Aspect Ratio">
                        <el-option
                            v-for="item in aspectRatios"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                        />
                    </el-select>
                </div>
            </div>

            <div class="fplayer-form-item fplayer-form-item-full-width fplayer-resume-playback-item">
                <div class="fplayer-form-label-wrapper">
                    <label class="fplayer-form-label">Auto Resume Playback</label>
                    <div class="fplayer-form-help">Let your users resume watching from where they left off</div>
                </div>
                <div class="fplayer-form-control">
                    <el-checkbox v-if="isProActive" v-model="props.settings.resume_playback">Enable Auto Resume Playback</el-checkbox>
                    <div v-else class="fplayer-pro-upsell">
                        <div class="fplayer-pro-upsell__overlay">
                            <span class="fplayer-pro-upsell__icon" aria-hidden="true">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="2" />
                                    <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                                </svg>
                            </span>
                            <h4 class="fplayer-pro-upsell__title">Auto Resume Playback is a Pro feature</h4>
                            <p class="fplayer-pro-upsell__desc">Upgrade to let viewers resume from where they left off.</p>
                            <a class="fplayer-pro-upsell__btn" rel="noopener noreferrer" :href="resumeUpsellUrl" target="_blank">Upgrade to Pro</a>
                        </div>
                    </div>
                </div>
            </div>


            <div class="fplayer-form-item fplayer-form-item-full-width fplayer-custom-css-item">
                <div class="fplayer-form-label-wrapper">
                    <label class="fplayer-form-label">Custom CSS</label>
                    <div class="fplayer-form-help">Add custom CSS to customize the player appearance with .fluent-player { /* your custom CSS */ }</div>
                </div>
                <div class="fplayer-form-control">
                    <template v-if="isProActive">
                        <div :id="cssEditorId" style="height: 180px; min-height: 120px; border: 1px solid #ddd; border-radius: 4px;"></div>
                        <span v-if="cssError" class="form-error">{{ cssError }}</span>
                    </template>
                    <div v-else class="fplayer-pro-upsell fplayer-pro-upsell--editor">
                        <div class="fplayer-pro-upsell__overlay">
                            <span class="fplayer-pro-upsell__icon" aria-hidden="true">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="2" />
                                    <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                                </svg>
                            </span>
                            <h4 class="fplayer-pro-upsell__title">Custom CSS is a Pro feature</h4>
                            <p class="fplayer-pro-upsell__desc">Upgrade to style your players with your own CSS.</p>
                            <a class="fplayer-pro-upsell__btn" rel="noopener noreferrer" :href="cssUpsellUrl" target="_blank">Upgrade to Pro</a>
                        </div>
                    </div>
                </div>
            </div>
        </el-form>

        <el-dialog
            v-model="showPresetProModal"
            :show-close="true"
            width="640px"
            align-center
            append-to-body
            class="fplayer-preset-pro-dialog"
            :aria-label="$t('Ambient preset is a Pro feature')"
        >
            <ProUpgrade
                :title="$t('The Ambient Preset is a Pro Feature')"
                :description="$t('Upgrade to Pro to use the Ambient preset for muted, looping, control-free background video.')"
                :features="[
                    $t('Muted autoplay background video'),
                    $t('Seamless looping playback'),
                    $t('Distraction-free, no player controls'),
                ]"
            />
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
// Shared Pro-feature upsell card (Custom CSS, Auto Resume Playback, …).
.fplayer-pro-upsell {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 24px;
    background:
        linear-gradient(rgba(248, 250, 252, 0.92), rgba(248, 250, 252, 0.92)),
        repeating-linear-gradient(0deg, #f1f5f9, #f1f5f9 1px, transparent 1px, transparent 22px);
}

// Editor-footprint variant: matches the Ace editor height.
.fplayer-pro-upsell--editor {
    min-height: 180px;
}

.fplayer-pro-upsell__overlay {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    max-width: 340px;
}

.fplayer-pro-upsell__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #eef2ff;
    color: #222530;
    margin-bottom: 4px;
}

.fplayer-pro-upsell__title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #1e293b;
}

.fplayer-pro-upsell__desc {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: #64748b;
}

.fplayer-pro-upsell__btn {
    margin-top: 8px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border-radius: 6px;
    background: var(--fp-brand-color, #4f46e5);
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.2s ease, transform 0.2s ease;

    &:hover,
    &:focus {
        background: var(--fp-brand-color-dark, #4338ca);
        color: #fff;
        text-decoration: none;
        transform: translateY(-1px);
    }

    &:focus-visible {
        outline: 2px solid var(--fp-brand-color-dark, #4338ca);
        outline-offset: 2px;
    }
}
</style>
