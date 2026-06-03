import { artUrl } from "../api/client";

interface ArtworkProps {
  thumb?: string;
  size?: number;
  alt?: string;
  className?: string;
}

/** Album/artist artwork via the backend image proxy, with a placeholder. */
export function Artwork({ thumb, size = 300, alt = "", className }: ArtworkProps) {
  const src = artUrl(thumb, size);
  return (
    <div className={`artwork ${className ?? ""}`}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" />
      ) : (
        <div className="artwork-placeholder" aria-hidden>
          ♪
        </div>
      )}
    </div>
  );
}
