import { getStreamGrant } from "../api/stream";
import { streamUrl } from "../api/client";

const grantCache = new Map<string, string>();

function cacheKey(ratingKey: string, transcode: boolean): string {
  return `${ratingKey}:${transcode ? "t" : "d"}`;
}

/** Build an absolute stream URL with a cookie-less grant token (for TV browsers). */
export async function tvStreamSrc(
  ratingKey: string,
  transcode: boolean,
): Promise<string> {
  const key = cacheKey(ratingKey, transcode);
  let st = grantCache.get(key);
  if (!st) {
    const grant = await getStreamGrant(ratingKey);
    st = grant.st;
    grantCache.set(key, st);
  }
  const url = new URL(streamUrl(ratingKey, transcode), window.location.origin);
  url.searchParams.set("st", st);
  return url.href;
}

export function clearTvStreamGrants(): void {
  grantCache.clear();
}
