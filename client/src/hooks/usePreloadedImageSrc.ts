import { useEffect, useState } from "react";

/** Keep showing the previous image URL until a new one has finished loading. */
export function usePreloadedImageSrc(src: string | undefined): string | undefined {
  const [displayed, setDisplayed] = useState(src);

  useEffect(() => {
    if (!src) {
      setDisplayed(undefined);
      return;
    }
    if (src === displayed) return;

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setDisplayed(src);
    };
    img.onerror = () => {
      // Keep the previous artwork visible when the new image fails to load.
    };
    img.src = src;

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to src changes
  }, [src]);

  return displayed;
}
