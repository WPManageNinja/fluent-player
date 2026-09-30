import Model from '@/modules/Model.js';
import { useRoute } from 'vue-router';
import Rest from '@/utils/http/Rest';
import { getCurrentInstance } from 'vue';
import Notify from '@/utils/Notify';

class Media extends Model {
	data = {
		list: [],
        settings: {
            src: '',
            title: '',
            description: '',
            posterSrc: '',
            viewType: 'video',
            provider: '',
            chapters: [],
            overlays: [],
            playsInline: true,
            brandingColor: '',
            loadStrategy: 'visible',
            preload: 'metadata',
            post_status: 'draft',
			preset_slug: null
        },
        playerSettings: null,
    	errors: {},
        status: 'all',
    	pagination: {
        	current_page: 1,
        	per_page: 10,
        	total: 0,
        },
        isVisible: {
            addMedia: false,
        },
        isBusy: {
            saving: false,
            loading: false,
            loadingBunny: false,
            loadingBunnyVideos: false
        },
        query: '',
        tag: '',
        tags: [],
        provider: [],
        media_type: [],
        orderby: 'id',
        order: 'DESC',
        instance: null
    };

    reset() {
        this.settings = {
            src: '',
            url: '',
            title: '',
            description: '',
            posterSrc: '',
            autoplay: false,
            viewType: 'video',
            provider: '',
            chapters: [],
            overlays: [],
            playsInline: true,
            loadStrategy: 'visible',
            preload: 'metadata',
            post_status: 'draft',
            brandingColor: '',
            preset_slug: null,
            bunny: {
                library_id: '',
                video_id: '',
                thumbnail: '',
                token_auth_enabled: false
            },
            mux: {
                asset_id: '',
                playback_id: '',
                thumbnail: '',
                duration: 0
            }
        }
        this.instance = null;
    }

    async get() {
        this.isBusy.loading = true;

        const response = await Rest.get('media', this.useQuery());

        this.isBusy.loading = false;

        this.list = response.data;
        this.pagination.total = response.total;
        this.pagination.current_page = response.current_page;
    }

    async search(key, value) {
        this[key] = value;
        this.pagination.current_page = 1;
        await this.get();
    }

    async find(id) {
        const media = await Rest.get(`media/${id}`);
        this.settings = media.settings;
        this.instance = media;
    }

    async save() {
        const params = { settings: JSON.stringify(this.settings) };
        let response;

        if (this.instance?.ID) {
            response = await Rest.put(`media/${this.instance.ID}`, params);
        } else {
            response = await Rest.post('media', params);
        }

        if (response?.media) {
            this.instance = response.media;
            if (!this.instance.ID && response.media.ID) {
                await this.get();
            }
        }

        Notify.success(response.message, {
            position: 'bottom-right'
        });
    }

    async delete(data) {
        await Rest.delete(`media/${data.ID}`);
        await this.get();
        Notify.success('Media moved to trash', {
            position: 'bottom-right'
        });
    }

    async restore(data) {
        await Rest.put(`media/${data.ID}/restore`, {});
        await this.get();
        Notify.success('Media restored', {
            position: 'bottom-right'
        });
    }

    async forceDelete(data) {
        await Rest.delete(`media/${data.ID}/force`);
        await this.get();
        Notify.success('Media permanently deleted', {
            position: 'bottom-right'
        });
    }

    async bulkAction(action, ids, payload = {}) {
        const response = await Rest.post('media/do-bulk-action', {
            action,
            media_ids: ids,
            ...payload,
        });
        await this.get();
        return response;
    }

	applyPreset(preset) {
        if (preset) {
            this.settings.preset_slug = preset.slug;
        }
	}
    useQuery() {
        let route = null;

        if (getCurrentInstance()) {
            route = useRoute();
        }

        this.status = (route?.query?.status || this.status);

        this.pagination.per_page = (
            route?.query?.per_page || this.pagination.per_page
        );

        this.pagination.current_page = (
            route?.query?.page || this.pagination.current_page
        );

        const routeTags = route?.query?.tags ?? route?.query?.tag;
        const routeProvider = route?.query?.provider;
        const routeMediaType = route?.query?.media_type;

        if (routeTags !== undefined) {
            this.tags = Array.isArray(routeTags) ? routeTags.filter(Boolean) : (routeTags ? [routeTags] : []);
            this.tag = this.tags[0] || '';
        }

        if (routeProvider !== undefined) {
            this.provider = Array.isArray(routeProvider) ? routeProvider : (routeProvider ? [routeProvider] : []);
        }

        if (routeMediaType !== undefined) {
            this.media_type = Array.isArray(routeMediaType) ? routeMediaType : (routeMediaType ? [routeMediaType] : []);
        }

        this.orderby = (route?.query?.orderby || this.orderby);
        this.order = (route?.query?.order || this.order);

        return {
            query: this.query || '',
            status: this.status,
            tag: this.tag || '',
            tags: this.tags || [],
            provider: this.provider || [],
            media_type: this.media_type || [],
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            orderby: this.orderby,
            order: this.order,
        };
    }
}

export default Media;
