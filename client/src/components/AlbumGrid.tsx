import { Link } from "react-router-dom";
import type { Album } from "../api/plex";
import { Artwork } from "./Artwork";

/** Responsive grid of album cards linking to the album page. */
export function AlbumGrid({ albums }: { albums: Album[] }) {
  return (
    <div className="card-grid">
      {albums.map((album) => (
        <Link key={album.ratingKey} to={`/album/${album.ratingKey}`} className="card">
          <Artwork thumb={album.thumb} alt={album.title} />
          <div className="card-title">{album.title}</div>
          <div className="card-sub muted">
            {album.artist}
            {album.year ? ` · ${album.year}` : ""}
          </div>
        </Link>
      ))}
    </div>
  );
}
