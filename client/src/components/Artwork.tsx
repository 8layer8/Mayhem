import { artUrl } from "../api/client";
import { usePreloadedImageSrc } from "../hooks/usePreloadedImageSrc";

interface ArtworkProps {
  thumb?: string;
  size?: number;
  alt?: string;
  className?: string;
}

/** Album/artist artwork via the backend image proxy, with a placeholder. */
export function Artwork({ thumb, size = 300, alt = "", className }: ArtworkProps) {
  const src = artUrl(thumb, size);
  const displaySrc = usePreloadedImageSrc(src);
  return (
    <div className={`artwork ${className ?? ""}`}>
      {displaySrc ? (
        <img src={displaySrc} alt={alt} loading="lazy" />
      ) : (
        <div className="artwork-placeholder" aria-hidden>
          ♪
        </div>
      )}
    </div>
  );
}
