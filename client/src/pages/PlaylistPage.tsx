import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { useParams } from "react-router-dom";
import {
  movePlaylistItem,
  removePlaylistItem,
} from "../api/playlists";
import { getPlaylistTracks } from "../api/plex";
import { GlyphClose, GlyphGrip, GlyphPlay } from "../components/Glyphs";
import { usePlayer } from "../store/player";
import { formatDuration } from "../util/format";

export function PlaylistPage() {
  const { ratingKey = "" } = useParams();
  const queryClient = useQueryClient();
  const playTracks = usePlayer((s) => s.playTracks);
  const currentKey = usePlayer((s) => s.current()?.ratingKey);
  const dragFrom = useRef<number | null>(null);

  const { data: tracks } = useQuery({
    queryKey: ["playlist-tracks", ratingKey],
    queryFn: () => getPlaylistTracks(ratingKey),
    enabled: !!ratingKey,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["playlist-tracks", ratingKey] });

  const remove = useMutation({
    mutationFn: (itemId: number) => removePlaylistItem(ratingKey, itemId),
    onSuccess: invalidate,
  });

  const move = useMutation({
    mutationFn: ({ itemId, after }: { itemId: number; after?: number }) =>
      movePlaylistItem(ratingKey, itemId, after),
    onSuccess: invalidate,
  });

  const onDrop = (toIndex: number) => {
    const from = dragFrom.current;
    dragFrom.current = null;
    if (from == null || !tracks || from === toIndex) return;
    const item = tracks[from];
    if (item.playlistItemID == null) return;
    // Plex "move" places the item *after* the target. Moving up means placing
    // after the item before the target slot; moving to the top omits `after`.
    const afterIndex = from < toIndex ? toIndex : toIndex - 1;
    const after = afterIndex >= 0 ? tracks[afterIndex]?.playlistItemID : undefined;
    move.mutate({ itemId: item.playlistItemID, after });
  };

  return (
    <div className="page">
      <div className="button-row">
        <button className="btn-primary" disabled={!tracks?.length} onClick={() => tracks && playTracks(tracks, 0, ratingKey)}>
          <GlyphPlay /> Play
        </button>
      </div>

      <ul className="track-list">
        {tracks?.map((track, i) => (
          <li
            key={track.playlistItemID ?? track.ratingKey}
            className={`track-row ${track.ratingKey === currentKey ? "active" : ""}`}
            draggable
            onDragStart={() => (dragFrom.current = i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(i)}
            onDoubleClick={() => playTracks(tracks, i, ratingKey)}
          >
            <GlyphGrip className="drag-handle" />
            <button className="track-play" onClick={() => playTracks(tracks, i, ratingKey)} title="Play">
              <span className="num">{i + 1}</span>
              <GlyphPlay className="play-glyph" />
            </button>
            <div className="track-main">
              <div className="track-title">{track.title}</div>
              <div className="track-sub muted">
                {track.artist}
                {track.album ? ` — ${track.album}` : ""}
              </div>
            </div>
            <span className="track-duration muted">{formatDuration(track.duration)}</span>
            <button
              className="track-add"
              title="Remove from playlist"
              disabled={track.playlistItemID == null}
              onClick={() => track.playlistItemID != null && remove.mutate(track.playlistItemID)}
            >
              <GlyphClose />
            </button>
          </li>
        ))}
        {tracks && tracks.length === 0 && <li className="muted">This playlist is empty.</li>}
      </ul>
    </div>
  );
}
