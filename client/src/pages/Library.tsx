import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMusicSections, getPlaylists, getRecentAlbums } from "../api/plex";
import { AlbumGrid } from "../components/AlbumGrid";
import { Artwork } from "../components/Artwork";
import { isTvBrowser } from "../util/tv";

export function Library() {
  const tv = isTvBrowser();
  const { data: sections } = useQuery({
    queryKey: ["sections"],
    queryFn: getMusicSections,
  });
  const [sectionId, setSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (!sectionId && sections?.length) setSectionId(sections[0].key);
  }, [sections, sectionId]);

  const { data: recent } = useQuery({
    queryKey: ["recent", sectionId],
    queryFn: () => getRecentAlbums(sectionId!),
    enabled: !!sectionId,
  });

  const { data: playlists } = useQuery({
    queryKey: ["playlists"],
    queryFn: getPlaylists,
    enabled: tv,
  });

  return (
    <div className="page">
      {sections && sections.length > 1 && (
        <div className="section-tabs">
          {sections.map((s) => (
            <button
              key={s.key}
              className={s.key === sectionId ? "tab active" : "tab"}
              onClick={() => setSectionId(s.key)}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}

      {tv && playlists && playlists.length > 0 && (
        <>
          <h2>Your Playlists</h2>
          <div className="card-grid tv-quick-grid">
            {playlists.slice(0, 8).map((p) => (
              <Link key={p.ratingKey} to={`/playlist/${p.ratingKey}`} className="card">
                <Artwork thumb={p.thumb} alt={p.title} />
                <div className="card-title">{p.title}</div>
                <div className="card-sub muted">{p.trackCount ?? 0} tracks</div>
              </Link>
            ))}
          </div>
          {playlists.length > 8 && (
            <Link to="/playlists" className="big-link tv-see-all">
              See all playlists
            </Link>
          )}
        </>
      )}

      <h2>Recently Added</h2>
      {recent ? <AlbumGrid albums={recent} /> : <p className="muted">Loading…</p>}
    </div>
  );
}
