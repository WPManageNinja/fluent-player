import Preset from '@/modules/preset/Preset.js';

const preset = Preset.init();

export function usePreset() {
    return preset;
}