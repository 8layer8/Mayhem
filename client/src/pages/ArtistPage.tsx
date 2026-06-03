import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { getArtistAlbums } from "../api/plex";
import { AlbumGrid } from "../components/AlbumGrid";

export function ArtistPage() {
  const { ratingKey = "" } = useParams();
  const { data: albums, isLoading } = useQuery({
    queryKey: ["artist-albums", ratingKey],
    queryFn: () => getArtistAlbums(ratingKey),
    enabled: !!ratingKey,
  });

  return (
    <div className="page">
      <h2>Albums</h2>
      {isLoading && <p className="muted">Loading…</p>}
      {albums && <AlbumGrid albums={albums} />}
    </div>
  );
}
