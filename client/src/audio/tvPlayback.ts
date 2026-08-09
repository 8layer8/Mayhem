import { getTrackMediaInfo } from "../api/stream";

/** Codecs Samsung/Tizen TV browsers can usually play via direct HTTP range requests. */
const TV_DIRECT_CODECS = new Set(["mp3", "aac"]);

/** Whether a track should be transcoded to MP3 before playback on TV. */
export async function shouldTranscodeForTv(ratingKey: string): Promise<boolean> {
  try {
    const info = await getTrackMediaInfo(ratingKey);
    return !TV_DIRECT_CODECS.has(info.codec.toLowerCase());
  } catch {
    return true;
  }
}
