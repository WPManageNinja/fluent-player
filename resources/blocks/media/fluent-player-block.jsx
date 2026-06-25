/**
 * Fluent Player Media Block
 */
import Edit from './edit.jsx';
import TimedContentEdit from '../timed-content/edit.jsx';

// WordPress dependencies
const {__} = wp.i18n;
const {registerBlockType} = wp.blocks;
const {InnerBlocks} = wp.blockEditor;

// Create a custom icon for the block matching the Fluent Player brand logo
const playerIcon = wp.element.createElement(
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

// Make sure Underscore.js is available
if (typeof window._ === 'undefined') {
    window._ = {};
}

// Ensure isArray is defined
if (typeof window._.isArray !== 'function') {
    window._.isArray = Array.isArray || function (obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    };
}

const mediaApiVersion = 3;
// Register the block
registerBlockType("fluent-player/media", {
    apiVersion: mediaApiVersion,
    title: __("FluentPlayer", "fluent-player"),
    icon: playerIcon,
    category: "media",
    description: __("Add a FluentPlayer media to your content.", "fluent-player"),
    keywords: [
        __("Video"),
        __("Audio"),
        __("Media"),
        __("Player"),
        __("Fluent"),
    ],
    attributes: {
        mediaId: {
            type: "number"
        },
        timedContentStyle: {
            type: "object",
            default: {
                enabled: true,
                padding: {
                    top: '20',
                    right: '20',
                    bottom: '20',
                    left: '20',
                    unit: 'px',
                    linked: true
                }
            }
        }
    },
    supports: {
        html: false,
        align: ['wide', 'full'],
        lock: false,
    },
    edit: Edit,
    save: () => {
        return wp.element.createElement(InnerBlocks.Content);
    },
    deprecated: [
        {
            attributes: {
                mediaId: {
                    type: "number"
                }
            },
            supports: {
                html: false,
                align: ['wide', 'full'],
            },
            save: () => null,
            migrate: (attributes, innerBlocks) => [attributes, innerBlocks || []],
        }
    ],
});

// Register the Timed Content child block (only usable inside the media block)
const clockIcon = wp.element.createElement(
    'svg',
    { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    wp.element.createElement('circle', { cx: 12, cy: 12, r: 10 }),
    wp.element.createElement('polyline', { points: '12 6 12 12 16 14' })
);

registerBlockType('fluent-player/timed-content', {
    apiVersion: mediaApiVersion,
    title: __('Timed Content', 'fluent-player'),
    icon: clockIcon,
    category: 'media',
    description: __('Content that appears during a specific time range of video playback.', 'fluent-player'),
    parent: ['fluent-player/media'],
    attributes: {
        startTime: { type: 'number', default: 0 },
        endTime: { type: 'number', default: 30 },
    },
    supports: { html: false, reusable: false, align: false },
    edit: TimedContentEdit,
    save: ({ attributes }) => {
        const { startTime, endTime } = attributes;
        return wp.element.createElement(
            'div',
            { className: 'fp-timed-content', 'data-start': startTime, 'data-end': endTime },
            wp.element.createElement(InnerBlocks.Content)
        );
    },
});

if (typeof wp !== 'undefined' && wp.data && typeof wp.data.subscribe === 'function') {
    const WIDE_SIDEBAR_BODY_CLASS = 'fluent-player-block-selected';
    const WIDEN_FOR_BLOCKS = ['fluent-player/media', 'fluent-player/timed-content', 'fluent-player/playlist'];
    let lastWide = null;
    wp.data.subscribe(() => {
        const blockEditor = wp.data.select('core/block-editor');
        if (!blockEditor || typeof blockEditor.getSelectedBlock !== 'function') {
            return;
        }
        const selected = blockEditor.getSelectedBlock();
        const wide = !!selected?.name && WIDEN_FOR_BLOCKS.includes(selected.name);
        if (wide === lastWide) {
            return;
        }
        lastWide = wide;
        document.body.classList.toggle(WIDE_SIDEBAR_BODY_CLASS, wide);
    });
}

// Sync document.title with the post title (PHP admin_title doesn't re-fire after pushState).
if (typeof wp !== 'undefined' && wp.data && typeof wp.data.subscribe === 'function') {
    let lastTitleSeen = null;
    const editorLabel = __('FluentPlayer Media Editor', 'fluent-player');
    wp.data.subscribe(() => {
        const editor = wp.data.select('core/editor');
        if (!editor || typeof editor.getCurrentPostType !== 'function') {
            return;
        }
        if (editor.getCurrentPostType() !== 'fluent_player_media') {
            return;
        }
        const currentTitle = (editor.getEditedPostAttribute('title') || '').trim();
        if (currentTitle === lastTitleSeen) {
            return;
        }
        lastTitleSeen = currentTitle;
        const siteSuffix = (document.title.split('‹').pop() || '').trim();
        const prefix = currentTitle ? `${currentTitle} · ${editorLabel}` : editorLabel;
        document.title = siteSuffix ? `${prefix} ‹ ${siteSuffix}` : prefix;
    });
}
