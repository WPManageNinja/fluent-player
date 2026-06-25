import Model from '@/modules/Model.js';
import Rest from '@/utils/http/Rest.js';
import { ElNotification } from 'element-plus';
import { basePresetSettings } from './basePresetSettings.js';

class Preset extends Model {
    data = {
        list: [],
        preset: {
            name: '',
            settings: { ...basePresetSettings }
        },
        errors: {},
        instance: null
    };

    getDefaultSettings() {
        return { ...basePresetSettings };
    }

    async get() {
        const data = await Rest.get('presets');
        this.list = data;
    }

    async find(slug) {
        const preset = await Rest.get(`presets/${slug}`);
        this.preset = preset;
        this.instance = preset;
    }

    async save() {
        const params = {
            name: this.preset.name,
            settings: JSON.stringify(this.preset.settings)
        };

        let response;
        if (this.instance?.slug) {
            response = await Rest.put(`presets/${this.instance.slug}`, params);
        } else {
            response = await Rest.post('presets', params);
        }

        if (response?.preset) {
            this.instance = response.preset;
            await this.get();
        }

        ElNotification({
            position: 'bottom-right',
            type: 'success',
            title: 'Success',
            message: response.message
        });
    }

    async delete(slug) {
        try {
            const response = await Rest.delete(`presets/${slug}`);
            await this.get();
            ElNotification({
                position: 'bottom-right',
                type: 'success',
                title: 'Success',
                message: response?.message || 'Preset deleted'
            });
        } catch (error) {
            ElNotification({
                position: 'bottom-right',
                type: 'error',
                title: 'Error',
                message: error?.message || 'Failed to delete preset'
            });
        }
    }
}

export default Preset;
