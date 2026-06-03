import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getPlaylists } from "../api/plex";
import { Artwork } from "../components/Artwork";

export function PlaylistsPage() {
  const { data: playlists, isLoading } = useQuery({
    queryKey: ["playlists"],
    queryFn: getPlaylists,
  });

  return (
    <div className="page">
      <h2>Playlists</h2>
      {isLoading && <p className="muted">Loading…</p>}
      <div className="card-grid">
        {playlists?.map((p) => (
          <Link key={p.ratingKey} to={`/playlist/${p.ratingKey}`} className="card">
            <Artwork thumb={p.thumb} alt={p.title} />
            <div className="card-title">{p.title}</div>
            <div className="card-sub muted">{p.trackCount ?? 0} tracks</div>
          </Link>
        ))}
        {playlists && playlists.length === 0 && <p className="muted">No playlists yet.</p>}
      </div>
    </div>
  );
}
