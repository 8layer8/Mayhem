import { useQuery } from "@tanstack/react-query";
import type { CSSProperties } from "react";
import { artUrl } from "../api/client";
import { HERO_ART_PIXELS } from "../api/config";
import { getTrackMediaInfo } from "../api/stream";
import { useHeroArtPixels, useUiConfig } from "../context/UiConfig";
import { usePlayer } from "../store/player";
import { formatTrackMedia } from "../util/formatMedia";
import { Artwork } from "./Artwork";
import { AddToPlaylist } from "./AddToPlaylist";
import { RemoveFromPlaylistButton } from "./RemoveFromPlaylistButton";
import { SeekBar } from "./SeekBar";
import { Visualizer } from "./Visualizer";

/** Full-screen "now playing" view with large art and optional visualizer. */
export function NowPlayingScreen({ onClose }: { onClose: () => void }) {
  const { visualizerEnabled, uiScale } = useUiConfig();
  const heroArtPixels = useHeroArtPixels();
  const current = usePlayer((s) => s.current());
  const isPlaying = usePlayer((s) => s.isPlaying);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const previous = usePlayer((s) => s.previous);
  const repeat = usePlayer((s) => s.repeat);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);
  const shuffle = usePlayer((s) => s.shuffle);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);

  const { data: mediaInfo } = useQuery({
    queryKey: ["track-media", current?.ratingKey],
    queryFn: () => getTrackMediaInfo(current!.ratingKey),
    enabled: !!current?.ratingKey,
  });
  const mediaLabel = mediaInfo ? formatTrackMedia(mediaInfo) : null;

  const { fullScreenFadePercent } = useUiConfig();
  const isExtraLarge = uiScale === "extra-large";
  const isFull = uiScale === "full";
  const fullBgUrl = isFull ? artUrl(current?.thumb, HERO_ART_PIXELS.full) : undefined;
  const fadeScale = fullScreenFadePercent / 100;
  const screenStyle = isFull
    ? ({
        "--np-full-fade-top": 0.65 * fadeScale,
        "--np-full-fade-mid": 0.2 * fadeScale,
        "--np-full-fade-bottom": 0.88 * fadeScale,
      } as CSSProperties)
    : undefined;

  return (
    <div
      className={[
        "now-playing-screen",
        isExtraLarge && "extra-large",
        isFull && "full",
      ]
        .filter(Boolean)
        .join(" ")}
      style={screenStyle}
    >
      {isFull && fullBgUrl && (
        <div
          className="np-full-bg"
          style={{ "--np-full-bg": `url(${fullBgUrl})` } as CSSProperties}
          aria-hidden
        />
      )}
      <button className="np-close icon" onClick={onClose} title="Close">
        ▼
      </button>
      {visualizerEnabled && <Visualizer />}
      <div className="np-screen-content">
        {!isFull && (
          <Artwork thumb={current?.thumb} size={heroArtPixels} alt={current?.title} className="hero" />
        )}
        <h1>{current?.title ?? "Nothing playing"}</h1>
        {mediaLabel && <p className="np-format">{mediaLabel}</p>}
        {current && (
          <div className="np-track-actions np-track-actions-center">
            <AddToPlaylist tracks={[current]} variant="compact" />
            <RemoveFromPlaylistButton />
          </div>
        )}
        <p className="muted np-artist-line">
          <span>
            {current?.artist}
            {current?.album ? ` — ${current.album}` : ""}
          </span>
        </p>
        <SeekBar />
        <div className="transport big">
          <button
            className={`icon ${shuffle ? "on" : ""}`}
            title="Shuffle"
            onClick={toggleShuffle}
          >
            🔀
          </button>
          <button className="icon" title="Previous" onClick={previous}>
            ⏮
          </button>
          <button className="icon play" title="Play/Pause" onClick={togglePlay}>
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button className="icon" title="Next" onClick={next}>
            ⏭
          </button>
          <button
            className={`icon ${repeat !== "off" ? "on" : ""}`}
            title={`Repeat: ${repeat}`}
            onClick={cycleRepeat}
          >
            {repeat === "one" ? "🔂" : "🔁"}
          </button>
        </div>
      </div>
    </div>
  );
}
