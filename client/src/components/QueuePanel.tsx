import { useRef } from "react";
import { GlyphClose, GlyphGrip } from "./Glyphs";
import { usePlayer } from "../store/player";
import { formatDuration } from "../util/format";

/** Side panel showing the play queue with drag-to-reorder and remove. */
export function QueuePanel({ onClose }: { onClose: () => void }) {
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const playAt = usePlayer((s) => s.playAt);
  const removeAt = usePlayer((s) => s.removeAt);
  const moveInQueue = usePlayer((s) => s.moveInQueue);
  const clearQueue = usePlayer((s) => s.clearQueue);

  const dragFrom = useRef<number | null>(null);

  return (
    <aside className="queue-panel">
      <div className="queue-header">
        <h3>Play Queue</h3>
        <div>
          <button className="link" onClick={clearQueue}>
            Clear
          </button>
          <button className="icon" onClick={onClose} title="Close">
            <GlyphClose />
          </button>
        </div>
      </div>
      <ul className="queue-list">
        {queue.map((track, i) => (
          <li
            key={`${track.ratingKey}-${i}`}
            className={`queue-item ${i === index ? "active" : ""}`}
            draggable
            onDragStart={() => (dragFrom.current = i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragFrom.current != null) moveInQueue(dragFrom.current, i);
              dragFrom.current = null;
            }}
            onDoubleClick={() => playAt(i)}
          >
            <GlyphGrip className="drag-handle" />
            <div className="queue-text" onClick={() => playAt(i)}>
              <div className="queue-title">{track.title}</div>
              <div className="queue-sub muted">{track.artist}</div>
            </div>
            <span className="muted small">{formatDuration(track.duration)}</span>
            <button className="icon" title="Remove" onClick={() => removeAt(i)}>
              <GlyphClose />
            </button>
          </li>
        ))}
        {queue.length === 0 && <li className="muted">Queue is empty.</li>}
      </ul>
    </aside>
  );
}
