import Model from '@/modules/Model.js';
import { useRoute } from 'vue-router';
import { getCurrentInstance } from 'vue';
import Notify from '@/utils/Notify';
import Rest from '@/utils/http/Rest.js';

class Playlist extends Model {
    name = 'playlist';
    data = {
        list: [],
        settings: {
            title: '',
            description: '',
            autoplay: false,
            playsInline: true,
            pipEnabled: false,
            inlineControls: true,
            medias: [],
            appearance: {
                primaryColor: '#DD1F13',
                backgroundColor: '#ffffff',
                textColor: '#333333',
                accentColor: '#DD1F13',
                brandColor: {
                    mode: 'auto',
                    value: '#DD1F13'
                },
                borderRadius: {value: 8, unit: 'px'},
                boxShadow: {
                    enabled: false,
                    horizontal: 0,
                    vertical: 4,
                    blur: 10,
                    spread: 0,
                    color: 'rgba(0, 0, 0, 0.1)',
                    position: 'outline'
                }
            },
            layout: {
                spacing: false,
                padding: {top: 20, right: 20, bottom: 20, left: 20, unit: 'px', linked: true},
                margin: {top: 20, right: 0, bottom: 20, left: 0, unit: 'px', linked: false},
                maxWidth: '100%',
                aspectRatio: '16:9',
                position: 'bottom'
            },
            typography: {
                enabled: true,
                fontFamily: 'inherit',
                fontSize: {value: 14, unit: 'px'},
                fontWeight: '400',
                lineHeight: 1.5,
                letterSpacing: {value: 0, unit: 'px'},
                textTransform: 'none',
                fontStyle: 'normal',
                textDecoration: 'none'
            },
            behavior: {
                autoplay: {
                    mode: 'inherit',
                    value: false
                },
                muted: {
                    mode: 'inherit',
                    value: false
                },
                volume: {
                    mode: 'inherit',
                    value: 80
                },
                playbackRate: {
                    mode: 'inherit',
                    value: 1.0
                },
                shuffle: false,
                continuousPlay: true,
                showProgress: true,
                showDuration: true,
                showThumbnails: true,
                thumbnailGridLayout: false,
                showThumbnailInfo: true,
                clickToPlay: true,
                keyboardControls: true,
                touchGestures: true
            }
        },
        media : {},
        medias: [],
        errors: {},
        status: 'all',
        query: '',
        orderby: 'id',
        order: 'DESC',
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
        },
        instance: null
    };

    reset () {
        this.settings = {
            title: '',
            description: '',
            autoplay: false,
            playsInline: true,
            pipEnabled: false,
            inlineControls: true,
            medias: [],
            appearance: {
                primaryColor: '#DD1F13',
                backgroundColor: '#ffffff',
                textColor: '#333333',
                accentColor: '#DD1F13',
                brandColor: {
                    mode: 'auto',
                    value: '#DD1F13'
                },
                borderRadius: {value: 8, unit: 'px'},
                boxShadow: {
                    enabled: false,
                    horizontal: 0,
                    vertical: 4,
                    blur: 10,
                    spread: 0,
                    color: 'rgba(0, 0, 0, 0.1)',
                    position: 'outline'
                }
            },
            layout: {
                spacing: false,
                padding: {top: 20, right: 20, bottom: 20, left: 20, unit: 'px', linked: true},
                margin: {top: 20, right: 0, bottom: 20, left: 0, unit: 'px', linked: false},
                maxWidth: '100%',
                aspectRatio: '16:9',
                position: 'bottom'
            },
            typography: {
                enabled: true,
                fontFamily: 'inherit',
                fontSize: {value: 14, unit: 'px'},
                fontWeight: '400',
                lineHeight: 1.5,
                letterSpacing: {value: 0, unit: 'px'},
                textTransform: 'none',
                fontStyle: 'normal',
                textDecoration: 'none'
            },
            behavior: {
                autoplay: {
                    mode: 'inherit',
                    value: false
                },
                muted: {
                    mode: 'inherit',
                    value: false
                },
                volume: {
                    mode: 'inherit',
                    value: 80
                },
                playbackRate: {
                    mode: 'inherit',
                    value: 1.0
                },
                shuffle: false,
                continuousPlay: true,
                showProgress: true,
                showDuration: true,
                showThumbnails: true,
                thumbnailGridLayout: false,
                showThumbnailInfo: true,
                clickToPlay: true,
                keyboardControls: true,
                touchGestures: true
            }
        }
        this.instance = null;
        this.media = {};
        this.medias = [];
    }

    async get() {
        this.isBusy.loading = true;

        const orderbyMap = {
            'id': 'ID',
            'title': 'post_title',
            'date': 'post_date',
            'post_status': 'post_status',
        };

        const query = this.useQuery();
        query.orderby = orderbyMap[query.orderby] || 'ID';

        const response = await Rest.get('playlist', query);

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

    addMedia(media) {
        if (Array.isArray(media)) {
            this.medias = [...this.medias, ...media];
            const mediaIds = media.map(m => m.ID)
            this.settings.medias = [...this.settings.medias, ...mediaIds];
            return;
        } else {
            this.medias.push(media);
            this.settings.medias.push(media.ID);
        }
        if (Object.values(this.media).length === 0) {
            this.media = this.medias[0];
        }
    }

    async find(id) {
        this.medias = [];
        this.media = {};

        const playlist = await Rest.get(`playlist/${id}`);
        this.settings = playlist.settings;
        this.instance = playlist;
    }

    async save() {
        try {
            const params = { settings: JSON.stringify(this.settings) };
            let response;
            
            if (this.instance?.ID) {
                response = await Rest.put(`playlist/${this.instance.ID}`, params);
            } else {
                response = await Rest.post('playlist', params);
            }
            
            if (response?.playlist) {
                this.instance = response.playlist;
                if (!this.instance.ID && response.playlist.ID) {
                    await this.get();
                }
            }
            
            Notify.success(response.message, {
                position: 'bottom-right'
            });
        } catch (errors) {
            Object.entries(errors).forEach(([field, fieldErrors]) => {
                if (typeof fieldErrors === 'object' && fieldErrors !== null) {
                    Object.values(fieldErrors).forEach(errorMessage => {
                        Notify.error(errorMessage, {
                            title: 'Error ' + field,
                            duration: 5000,
                            position: 'bottom-right'
                        });
                    });
                }
            });
        }
    }

    async bulkAction(action, ids, payload = {}) {
        const response = await Rest.post('playlist/do-bulk-action', {
            action,
            playlist_ids: ids,
            ...payload,
        });
        await this.get();
        return response;
    }

    async delete(data) {
        await Rest.delete(`playlist/${data.ID}`);
        await this.get();
    }

    async restore(data) {
        await Rest.put(`playlist/${data.ID}/restore`, {});
        await this.get();
    }

    async forceDelete(data) {
        await Rest.delete(`playlist/${data.ID}/force`);
        await this.get();
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

        this.orderby = (route?.query?.orderby || this.orderby);
        this.order = (route?.query?.order || this.order);

        return {
            query: this.query || '',
            status: this.status,
            page: this.pagination.current_page,
            per_page: this.pagination.per_page,
            orderby: this.orderby,
            order: this.order,
        };
    }
}

export default Playlist;
