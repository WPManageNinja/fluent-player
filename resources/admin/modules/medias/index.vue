<template>
    <div class="fplayer-admin-page fplayer-admin-page-media">
        <PageHeader 
            :title="$t('Media List')"
            :button-text="$t('Add Media')"
            post-type="fluent_player_media"
        />
	    <ListTable
		    :data-source="media"
		    route-name="medias"
		    shortcode-template='[fluentplayer id="{ID}"]'
		    view-url-key="media_view_url"
		    edit-post-type="fluent_player_media"
		    title-min-width="150"
		    shortcode-min-width="250"
		    created-at-min-width="180"
		    actions-min-width="170"
	    />
    </div>
</template>

<script type="text/javascript">
    import PageHeader from '@/components/PageHeader.vue';
    import ListTable from '@components/table/ListTable.vue';
    import { useMedia } from '@/composables/useMedia.js';
    export default {
        name: 'Media',
        components: {
	        ListTable,
            PageHeader
        },
	    setup() {
			const media = useMedia();
            return {
				media
			};
		}
    };
</script>

