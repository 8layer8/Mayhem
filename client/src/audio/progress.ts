import type { Track } from "../api/plex";

/** Plex track duration (ms) as seconds for the player UI. */
export function trackDurationSec(track?: Track): number {
  const ms = track?.duration ?? 0;
  return ms > 0 ? ms / 1000 : 0;
}

/** Media element duration with Plex metadata fallback (TV streams often report 0/NaN). */
export function resolveMediaDuration(el: HTMLMediaElement, track?: Track): number {
  const d = el.duration;
  if (Number.isFinite(d) && d > 0) return d;
  return trackDurationSec(track);
}
