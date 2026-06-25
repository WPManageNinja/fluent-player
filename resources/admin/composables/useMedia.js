import Media from '@/modules/medias/Media.js';

const media = Media.init();

export function useMedia() {
    return media;
}
