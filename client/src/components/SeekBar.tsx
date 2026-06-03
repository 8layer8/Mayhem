import { usePlayer } from "../store/player";
import { formatSeconds } from "../util/format";

/** Scrubber showing elapsed/remaining time; dragging seeks the active track. */
export function SeekBar() {
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const seek = usePlayer((s) => s.seek);

  const max = duration || 0;
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
