import { usePlayer } from "../store/player";
import { isTvBrowser } from "../util/tv";
import { formatSeconds } from "../util/format";

/** Scrubber showing elapsed/remaining time; dragging seeks the active track. */
export function SeekBar() {
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const seek = usePlayer((s) => s.seek);
  const tv = isTvBrowser();

  const max = duration > 0 ? duration : 0;
  const pct = max > 0 ? Math.min(100, (position / max) * 100) : 0;

  if (tv) {
    return (
      <div className="seek-bar tv-seek-bar">
        <span className="time muted">{formatSeconds(position)}</span>
        <div className="tv-seek-track" aria-hidden>
          <div className="tv-seek-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="time muted">{formatSeconds(max)}</span>
      </div>
    );
  }

  return (
    <div className="seek-bar">
      <span className="time muted">{formatSeconds(position)}</span>
      <input
        type="range"
        min={0}
        max={max}
        step={0.5}
        value={Math.min(position, max)}
        disabled={!max}
        onChange={(e) => seek(Number(e.target.value))}
      />
      <span className="time muted">{formatSeconds(max)}</span>
    </div>
  );
}
