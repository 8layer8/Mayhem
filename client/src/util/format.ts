/** Format a millisecond duration as m:ss or h:mm:ss. */
export function formatDuration(ms: number): string {
  if (!ms || ms < 0) return "0:00";
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
  return `${minutes}:${ss}`;
}

/** Format a seconds value (used for playback position) as m:ss. */
export function formatSeconds(seconds: number): string {
  return formatDuration(Math.round(seconds) * 1000);
}
