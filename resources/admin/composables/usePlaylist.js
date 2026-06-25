import Playlist from '@/modules/playlist/Playlist.js';

const playlist = Playlist.init();

export function usePlaylist() {
    return playlist;
}
