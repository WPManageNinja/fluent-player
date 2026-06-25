const {__} = wp.i18n;

export const secondsToTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return { hours, minutes, seconds: secs };
};

export const timeToSeconds = (hours, minutes, seconds) => {
    return (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
};

export const formatTime = (seconds) => {
    let hours = Math.floor(seconds / 3600);
    let minutes = Math.floor((seconds % 3600) / 60);
    let secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${ hours }:${ minutes.toString().padStart(2, '0') }:${ secs.toString().padStart(2, '0') }`;
    } else {
        return `${ minutes }:${ secs.toString().padStart(2, '0') }`;
    }
}

export const getIconByName = (type) => {
    const icons = {
        'fluentforms': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 58 58" fill="none" aria-hidden="true" focusable="false">
  <path d="M7.86621 20.6918C7.86621 16.1281 11.5658 12.4285 16.1295 12.4285H48.8625C48.8625 16.9922 45.1629 20.6918 40.5992 20.6918H7.86621Z" fill="#525866"/>
  <path d="M7.86621 33.5463C7.86621 28.9826 11.5658 25.283 16.1295 25.283H48.8625C48.8625 29.8467 45.1629 33.5463 40.5992 33.5463H7.86621Z" fill="#525866"/>
  <path d="M14.2441 46.3993C14.2441 41.8356 17.9438 38.136 22.5075 38.136H41.575C41.575 42.6997 37.8754 46.3993 33.3117 46.3993H14.2441Z" fill="#525866"/>
</svg>`,
        'form': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 22 22" fill="none">
  <path d="M3.35 8.59C3.35 6.71 4.87 5.2 6.74 5.2H20.31C20.31 7.07 18.79 8.59 16.92 8.59H3.35Z" fill="#525866"/>
  <path d="M3.35 13.87C3.35 11.99 4.87 10.47 6.74 10.47H20.31C20.31 12.35 18.79 13.87 16.92 13.87H3.35Z" fill="#525866"/>
  <path d="M5.99 19.14C5.99 17.27 7.51 15.75 9.38 15.75H17.3C17.3 17.62 15.78 19.14 13.9 19.14H5.99Z" fill="#525866"/>
</svg>`,
        'cta': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="-3 -3 30 30" fill="none">
  <path d="M13.2 21.526C17.543 21.084 21.084 17.543 21.526 13.2H18V10.8H21.526C21.084 6.457 17.543 2.916 13.2 2.474V6H10.8V2.474C6.457 2.916 2.916 6.457 2.474 10.8H6V13.2H2.474C2.916 17.543 6.457 21.084 10.8 21.526V18H13.2V21.526ZM12 24C5.373 24 0 18.627 0 12S5.373 0 12 0s12 5.373 12 12-5.373 12-12 12Zm0-9.6a2.4 2.4 0 1 1 0-4.8 2.4 2.4 0 0 1 0 4.8Z" fill="#525866"/>
</svg>`,
        'hotspot': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 2c2.76 0 5 2.24 5 5 0 2.88-2.88 7.19-5 9.88C9.92 16.21 7 11.85 7 9c0-2.76 2.24-5 5-5Zm0 2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" fill="#525866"/>
</svg>`,
        'email': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2Zm16 2H4v2l8 5 8-5V6Zm0 4-8 5-8-5v8h16v-8Z" fill="#525866"/>
</svg>`,
        'ad': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M9.75 15.75C9.75 15.75 15 16.5 17.25 18.75H18C18.4142 18.75 18.75 18.4142 18.75 18V13.4528C19.3969 13.2863 19.875 12.6989 19.875 12C19.875 11.3011 19.3969 10.7137 18.75 10.5472V6C18.75 5.58579 18.4142 5.25 18 5.25H17.25C15 7.5 9.75 8.25 9.75 8.25H6.75C5.92157 8.25 5.25 8.92157 5.25 9.75V14.25C5.25 15.0785 5.92157 15.75 6.75 15.75H7.5L8.25 19.5H9.75V15.75ZM11.25 9.4959C11.7625 9.38595 12.3956 9.23395 13.0795 9.0328C14.3381 8.6626 15.9375 8.07947 17.25 7.18094V16.819C15.9375 15.9205 14.3381 15.3374 13.0795 14.9672C12.3956 14.7661 11.7625 14.614 11.25 14.5041V9.4959ZM6.75 9.75H9.75V14.25H6.75V9.75Z" fill="#525866"/>
</svg>`,
        'shortcode': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M4.8 17.4004V14.0704C4.8 13.7123 4.65777 13.369 4.40459 13.1158C4.15142 12.8626 3.80804 12.7204 3.45 12.7204H3V11.2804H3.45C3.62728 11.2804 3.80283 11.2455 3.96662 11.1776C4.13041 11.1098 4.27924 11.0103 4.40459 10.885C4.52995 10.7596 4.62939 10.6108 4.69724 10.447C4.76508 10.2832 4.8 10.1077 4.8 9.93039V6.60039C4.8 5.88431 5.08446 5.19755 5.59081 4.6912C6.09716 4.18485 6.78392 3.90039 7.5 3.90039H8.4V5.70039H7.5C7.2613 5.70039 7.03239 5.79521 6.8636 5.96399C6.69482 6.13278 6.6 6.3617 6.6 6.60039V10.2904C6.60009 10.6693 6.48061 11.0386 6.25857 11.3456C6.03654 11.6527 5.72327 11.8818 5.3634 12.0004C5.72327 12.119 6.03654 12.3481 6.25857 12.6552C6.48061 12.9622 6.60009 13.3315 6.6 13.7104V17.4004C6.6 17.6391 6.69482 17.868 6.8636 18.0368C7.03239 18.2056 7.2613 18.3004 7.5 18.3004H8.4V20.1004H7.5C6.78392 20.1004 6.09716 19.8159 5.59081 19.3096C5.08446 18.8032 4.8 18.1165 4.8 17.4004ZM19.2 14.0704V17.4004C19.2 18.1165 18.9155 18.8032 18.4092 19.3096C17.9028 19.8159 17.2161 20.1004 16.5 20.1004H15.6V18.3004H16.5C16.7387 18.3004 16.9676 18.2056 17.1364 18.0368C17.3052 17.868 17.4 17.6391 17.4 17.4004V13.7104C17.3999 13.3315 17.5194 12.9622 17.7414 12.6552C17.9635 12.3481 18.2767 12.119 18.6366 12.0004C18.2767 11.8818 17.9635 11.6527 17.7414 11.3456C17.5194 11.0386 17.3999 10.6693 17.4 10.2904V6.60039C17.4 6.3617 17.3052 6.13278 17.1364 5.96399C16.9676 5.79521 16.7387 5.70039 16.5 5.70039H15.6V3.90039H16.5C17.2161 3.90039 17.9028 4.18485 18.4092 4.6912C18.9155 5.19755 19.2 5.88431 19.2 6.60039V9.93039C19.2 10.2884 19.3422 10.6318 19.5954 10.885C19.8486 11.1382 20.192 11.2804 20.55 11.2804H21V12.7204H20.55C20.192 12.7204 19.8486 12.8626 19.5954 13.1158C19.3422 13.369 19.2 13.7123 19.2 14.0704Z" fill="#525866"/>
</svg>`
    };
    return icons[type] || '⚡';
};

export const getLayerIconKey = (layer) => {
    if (!layer) {
        return '';
    }

    if (layer.type === 'form' && layer.form_type === 'fluentforms') {
        return 'fluentforms';
    }

    if (layer.type === 'cta' && layer.cta_type === 'email') {
        return 'email';
    }

    return layer.type;
};

const formatProviderType = (providerType) => {
    if (providerType === 'email') {
        return __('Email', 'fluent-player');
    }
    return providerType.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
};

export const extractYouTubeId = (url) => {
    if (!url) {
        return null;
    }

    const match = url.match(
        /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|live\/|shorts\/|watch\?(?:[^#\n]*&)?v=))([^&\n?#]+)/
    );

    if (!match || !match[1] || !/^[a-zA-Z0-9_-]{11}$/.test(match[1])) {
        return null;
    }

    return match[1];
};

export const getLayerSubType = (layer, providersMeta = null) => {
    switch (layer.type) {
        case 'form':
            if (layer.title) {
                return layer.title;
            }
            return layer.form_type;
        case 'cta':
            if (layer.cta_type === 'email' && layer.email_capture?.providers?.length) {
                const enabledProviders = layer.email_capture.providers
                    .filter(p => p.enabled)
                    .map(p => {
                        if (providersMeta && providersMeta[p.type]?.name) {
                            return providersMeta[p.type].name;
                        }
                        return formatProviderType(p.type);
                    });
                
                if (enabledProviders.length > 0) {
                    return enabledProviders.join(', ');
                }
                return __('Email', 'fluent-player');
            }
            return __('CTA', 'fluent-player');
        case 'hotspot':
            if (layer.hotspots?.length) {
                const count = layer.hotspots.length;
                const hasIcon = layer.hotspots.some(h => h.type === 'icon');
                const hasDot = layer.hotspots.some(h => h.type !== 'icon');
                let subLabel;
                if (hasIcon && hasDot) {
                    subLabel = __('Mixed', 'fluent-player');
                } else if (hasIcon) {
                    subLabel = __('Icon', 'fluent-player');
                } else {
                    subLabel = __('Dot', 'fluent-player');
                }
                return `${__('Hotspot', 'fluent-player')}(${count}) - ${subLabel}`;
            }
            return __('Hotspot', 'fluent-player');
        case 'ad':
            if (layer.media_type === 'video') {
                return __('Ad #Video', 'fluent-player');
            }
            return __('Ad #Image', 'fluent-player');
        case 'shortcode':
            return (layer.title && layer.title.trim()) ? layer.title.trim() : (layer.shortcode || '');
        default:
            return '';
    }
};
