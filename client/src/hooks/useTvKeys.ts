import { useEffect } from "react";
import { usePlayer } from "../store/player";
import { isTvBrowser } from "../util/tv";

interface TvKeyHandlers {
  /** Return true if the back action was consumed (prevents default navigation). */
  onBack?: () => boolean;
}

const MEDIA_PLAY = new Set(["MediaPlayPause", "MediaPlay", " ", "Enter"]);
const MEDIA_PAUSE = new Set(["MediaPause"]);
const MEDIA_NEXT = new Set(["MediaTrackNext", "AudioTrackNext"]);
const MEDIA_PREV = new Set(["MediaTrackPrevious", "AudioTrackPrevious"]);

/**
 * Global remote / keyboard handlers for TV: media keys and Back/Escape for overlays.
 */
export function useTvKeys({ onBack }: TvKeyHandlers = {}): void {
  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const previous = usePlayer((s) => s.previous);
  const isPlaying = usePlayer((s) => s.isPlaying);

  useEffect(() => {
    if (!isTvBrowser()) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      const tag = target instanceof HTMLElement ? target.tagName : "";
      const isTextInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (MEDIA_NEXT.has(e.key)) {
        e.preventDefault();
        next();
        return;
      }
      if (MEDIA_PREV.has(e.key)) {
        e.preventDefault();
        previous();
        return;
      }
      if (MEDIA_PAUSE.has(e.key)) {
        e.preventDefault();
        if (isPlaying) togglePlay();
        return;
      }
      if (MEDIA_PLAY.has(e.key) && e.key.startsWith("Media")) {
        e.preventDefault();
        togglePlay();
        return;
      }

      if (isTextInput) return;

      if (e.key === "Escape" || e.key === "Back" || e.key === "BrowserBack") {
        if (onBack?.()) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePlay, next, previous, isPlaying, onBack]);
}
