/**
 * Fluent Player Playlist Block
 */
import Edit from './edit.jsx';

// WordPress dependencies
const { __ } = wp.i18n;
const { registerBlockType } = wp.blocks;

// Create a custom icon for the block matching the Fluent Player brand logo
const playlistIcon = wp.element.createElement(
    "svg",
    {
        width: 20,
        height: 20,
        viewBox: "0 0 32 32",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg"
    },
    wp.element.createElement("path", {
        d: "M28.8 0H3.2C1.43269 0 0 1.43269 0 3.2V28.8C0 30.5673 1.43269 32 3.2 32H28.8C30.5673 32 32 30.5673 32 28.8V3.2C32 1.43269 30.5673 0 28.8 0Z",
        fill: "#DD1F13"
    }),
    wp.element.createElement("path", {
        d: "M19.2289 11.3156L11.9206 7.09616C10.5631 6.31241 8.86624 7.29209 8.86624 8.85959V13.7716C8.86624 15.3391 10.5631 16.3188 11.9206 15.535L19.2289 11.3156ZM22.7029 18.6774C24.7644 17.4872 24.7644 14.5115 22.7028 13.3213C22.488 13.1973 22.2234 13.1973 22.0086 13.3213L10.1126 20.1895C9.34137 20.6348 8.86624 21.4577 8.86624 22.3483C8.86624 24.2673 10.9436 25.4667 12.6054 24.5072L22.7029 18.6774Z",
        fill: "white"
    })
);

// Register the block
registerBlockType("fluent-player/playlist", {
    apiVersion: 3,
    title: __("FluentPlayer Playlist", "fluent-player"),
    icon: playlistIcon,
    category: "media",
    description: __("Add a FluentPlayer playlist to your content. Playlist all video settings render depending on the first video of the playlist", "fluent-player"),
    keywords: [
        __("Video"),
        __("Audio"),
        __("Media"),
        __("Player"),
        __("Playlist"),
        __("Fluent"),
    ],
    attributes: {
        playlistId: {
            type: "number"
        },
        sourceType: {
            type: "string",
            default: "playlist"
        },
        tags: {
            type: "array",
            default: []
        },
        query: {
            type: "object",
            default: {
                limit: 20,
                orderby: "date",
                order: "DESC"
            }
        },
        settings: {
            type: "object",
            default: {}
        }
    },
    supports: {
        html: false,
        align: ['wide', 'full'],
    },
    edit: Edit,
    save: () => null // rendering is handled by PHP
});
