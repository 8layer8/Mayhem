import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { search } from "../api/plex";
import { AlbumGrid } from "../components/AlbumGrid";
import { Artwork } from "../components/Artwork";
import { TrackList } from "../components/TrackList";
import { useDebounced } from "../util/useDebounced";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 350);

  const { data, isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => search(debounced),
    enabled: debounced.trim().length >= 2,
  });

  return (
    <div className="page">
      <input
        className="search-input"
        type="search"
        placeholder="Search artists, albums, tracks…"
        value={query}
        autoFocus
        onChange={(e) => setQuery(e.target.value)}
      />

      {isFetching && <p className="muted">Searching…</p>}

      {data && (
        <>
          {data.artists.length > 0 && (
            <>
              <h2>Artists</h2>
              <div className="card-grid">
                {data.artists.map((a) => (
                  <Link key={a.ratingKey} to={`/artist/${a.ratingKey}`} className="card">
                    <Artwork thumb={a.thumb} alt={a.title} className="round" />
                    <div className="card-title">{a.title}</div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {data.albums.length > 0 && (
            <>
              <h2>Albums</h2>
              <AlbumGrid albums={data.albums} />
            </>
          )}

          {data.tracks.length > 0 && (
            <>
              <h2>Tracks</h2>
              <TrackList tracks={data.tracks} showTrackNumber={false} />
            </>
          )}
        </>
      )}
    </div>
  );
}
