import type { Track } from "../api/plex";
import { GlyphPlus, GlyphPlay } from "./Glyphs";
import { usePlayer } from "../store/player";
import { formatDuration } from "../util/format";

interface TrackListProps {
  tracks: Track[];
  /** Show the track-number column (albums) vs a play index (playlists/search). */
  showTrackNumber?: boolean;
}

/** A list of tracks; clicking a row plays from that point through the rest. */
export function TrackList({ tracks, showTrackNumber = true }: TrackListProps) {
  const playTracks = usePlayer((s) => s.playTracks);
  const addToQueue = usePlayer((s) => s.addToQueue);
  const currentKey = usePlayer((s) => s.current()?.ratingKey);

  return (
    <ul className="track-list">
      {tracks.map((track, i) => {
        const active = track.ratingKey === currentKey;
        return (
          <li key={track.ratingKey} className={`track-row ${active ? "active" : ""}`}>
            <button className="track-play" title="Play" onClick={() => playTracks(tracks, i)}>
              <span className="num">{showTrackNumber ? (track.trackNumber ?? i + 1) : i + 1}</span>
              <GlyphPlay className="play-glyph" />
            </button>
            <div
              className="track-main"
              role="button"
              tabIndex={0}
              onClick={() => playTracks(tracks, i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") playTracks(tracks, i);
              }}
            >
              <div className="track-title">{track.title}</div>
              <div className="track-sub muted">
                {track.artist}
                {track.album ? ` — ${track.album}` : ""}
              </div>
            </div>
            <span className="track-duration muted">{formatDuration(track.duration)}</span>
            <button className="track-add" title="Add to queue" onClick={() => addToQueue([track])}>
              <GlyphPlus />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
