import { usePlayer } from "../store/player";
import { AddToPlaylist } from "./AddToPlaylist";
import { Artwork } from "./Artwork";
import { GlyphQueue } from "./Glyphs";
import { RemoveFromPlaylistButton } from "./RemoveFromPlaylistButton";
import { SeekBar } from "./SeekBar";

interface NowPlayingBarProps {
  onToggleQueue: () => void;
  onToggleNowPlaying: () => void;
}

/** Persistent bottom transport bar. */
export function NowPlayingBar({ onToggleQueue, onToggleNowPlaying }: NowPlayingBarProps) {
  const current = usePlayer((s) => s.current());
  const isPlaying = usePlayer((s) => s.isPlaying);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const previous = usePlayer((s) => s.previous);
  const volume = usePlayer((s) => s.volume);
  const setVolume = usePlayer((s) => s.setVolume);
  const repeat = usePlayer((s) => s.repeat);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);
  const shuffle = usePlayer((s) => s.shuffle);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);

  return (
    <footer className="now-playing-bar">
      <div
        className="np-track"
        onClick={onToggleNowPlaying}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onToggleNowPlaying();
        }}
        role="button"
        tabIndex={0}
      >
        <Artwork thumb={current?.thumb} size={96} alt={current?.title} className="small" />
        <div className="np-text">
          <div className="np-title">{current?.title ?? "Nothing playing"}</div>
          <div className="np-artist muted">{current?.artist ?? ""}</div>
        </div>
        {current && (
          <div className="np-track-actions" onClick={(e) => e.stopPropagation()}>
            <AddToPlaylist tracks={[current]} variant="compact" />
            <RemoveFromPlaylistButton />
          </div>
        )}
      </div>

      <div className="np-controls">
        <div className="transport">
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
        <SeekBar />
      </div>

      <div className="np-extra">
        <span className="icon" title="Volume">
          🔊
        </span>
        <input
          className="volume"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
        <button className="icon" title="Queue" onClick={onToggleQueue}>
          <GlyphQueue />
        </button>
      </div>
    </footer>
  );
}
