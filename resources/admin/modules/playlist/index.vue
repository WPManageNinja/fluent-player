<template>
    <div class="fplayer-admin-page fplayer-admin-page--playlist fplayer_playlist">
        <PageHeader 
            v-if="isProActive"
            :title="$t('Playlists')"
            :button-text="$t('Add Playlist')"
            post-type="fluent_playlist"
        />
	    <pro-upgrade v-if="!isProActive" v-bind="playlistProConfig" />
	    <ListTable
		    v-else
		    :data-source="playlist"
		    route-name="playlists"
		    shortcode-template="[fluentplaylist id='{ID}']"
		    view-url-key="playlist_view_url"
		    title-min-width="150"
		    shortcode-min-width="270"
		    created-at-min-width="150"
		    actions-min-width="150"
	    />
    </div>
</template>

<script type="text/javascript">
	import ListTable from '@/components/table/ListTable.vue';
    import PageHeader from '@/components/PageHeader.vue';
    import ProUpgrade from '@/components/ProUpgrade.vue';
    import { FEATURES, useProFeatures } from "@/composables/useFeatures.js";
	import { usePlaylist } from '@/composables/usePlaylist.js';

    const { isProActive, getFeatureConfig } = useProFeatures();
    const playlistProConfig = getFeatureConfig(FEATURES.PLAYLIST);
    export default {
        name: 'Playlist',
        components: {
	        ListTable,
            PageHeader,
            ProUpgrade
        },
        setup() {
			const playlist = usePlaylist();
            return {
				playlist,
                isProActive,
                playlistProConfig
            };
        }
    };
</script>
