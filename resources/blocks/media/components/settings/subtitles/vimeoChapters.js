/**
 * Read the chapters Vidstack loaded into the preview player's chapters track (from a Vimeo
 * video) and map them to the plugin's chapter shape, for the free "Import from Vimeo" action.
 */

/** Map Vidstack chapters-track cues to `{startTime, endTime, title}` chapter objects. */
export function mapChapterCues(cues) {
	return [...(cues || [])]
		.filter((cue) => typeof cue?.startTime === 'number' && typeof cue?.endTime === 'number')
		.map((cue) => ({
			startTime: Math.round(cue.startTime),
			endTime: Math.round(cue.endTime),
			title: String(cue?.text || '').trim(),
		}))
		.filter((chapter) => chapter.title !== '')
		.sort((a, b) => a.startTime - b.startTime);
}

/** Read the chapters a Vidstack player has loaded (from a Vimeo video's chapters track). */
export function readVimeoChapters(player) {
	const tracks = player?.textTracks ? [...player.textTracks] : [];
	const chaptersTrack = tracks.find((track) => track.kind === 'chapters');
	return mapChapterCues(chaptersTrack?.cues);
}
