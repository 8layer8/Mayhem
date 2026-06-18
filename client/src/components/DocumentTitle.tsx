import { useLayoutEffect } from "react";
import { useUiConfig } from "../context/UiConfig";
import { usePlayer } from "../store/player";

/** Keeps the browser tab title in sync with playback. */
export function DocumentTitle() {
  const { appTitle } = useUiConfig();
  const current = usePlayer((s) => s.current());
  const isPlaying = usePlayer((s) => s.isPlaying);

  useLayoutEffect(() => {
    if (isPlaying && current) {
      const label = current.artist
        ? `${current.title} — ${current.artist}`
        : current.title;
      document.title = `${label} · ${appTitle}`;
    } else {
      document.title = appTitle;
    }
  }, [appTitle, current?.ratingKey, current?.title, current?.artist, isPlaying]);

  return null;
}
