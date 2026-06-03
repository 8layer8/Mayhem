export interface TrackMediaInfo {
  codec: string;
  container: string;
  bitrate: number | null;
}

/** Human-readable format + bitrate label, e.g. "FLAC · 1411 kbps". */
export function formatTrackMedia(info: TrackMediaInfo): string | null {
  const format = (info.container || info.codec).toLowerCase();
  if (!format && info.bitrate == null) return null;

  const parts: string[] = [];
  if (format) parts.push(format);
  if (info.bitrate != null) parts.push(`${info.bitrate} kbps`);
  return parts.join(" · ");
}
