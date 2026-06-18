import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { getAlbum, getAlbumTracks } from "../api/plex";
import { AddToPlaylist } from "../components/AddToPlaylist";
import { Artwork } from "../components/Artwork";
import { BackButton } from "../components/BackButton";
import { TrackList } from "../components/TrackList";
import { usePlayer } from "../store/player";

export function AlbumPage() {
  const { ratingKey = "" } = useParams();
  const playTracks = usePlayer((s) => s.playTracks);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);

  const { data: album } = useQuery({
    queryKey: ["album", ratingKey],
    queryFn: () => getAlbum(ratingKey),
    enabled: !!ratingKey,
  });
  const { data: tracks } = useQuery({
    queryKey: ["album-tracks", ratingKey],
    queryFn: () => getAlbumTracks(ratingKey),
    enabled: !!ratingKey,
  });

  return (
    <div className="page">
      <BackButton fallback="/albums" />
      <div className="album-header">
        <Artwork thumb={album?.thumb} size={400} alt={album?.title} className="large" />
        <div className="album-meta">
          <h1>{album?.title ?? "…"}</h1>
          <p className="muted">
            {album?.artist}
            {album?.year ? ` · ${album.year}` : ""}
          </p>
          <div className="button-row">
            <button
              className="btn-primary"
              disabled={!tracks?.length}
              onClick={() => tracks && playTracks(tracks, 0)}
            >
              ▶ Play
            </button>
            <button
              className="btn-secondary"
              disabled={!tracks?.length}
              onClick={() => {
                if (!tracks) return;
                playTracks(tracks, 0);
                toggleShuffle();
              }}
            >
              🔀 Shuffle
            </button>
            {tracks && tracks.length > 0 && <AddToPlaylist tracks={tracks} label="Add album to…" />}
          </div>
        </div>
      </div>

      {tracks ? <TrackList tracks={tracks} /> : <p className="muted">Loading…</p>}
    </div>
  );
}
