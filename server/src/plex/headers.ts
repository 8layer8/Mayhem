import {
  PLEX_CLIENT_IDENTIFIER,
  PLEX_PLATFORM,
  PLEX_PRODUCT,
  PLEX_VERSION,
} from "../config.js";

/**
 * Standard Plex identification headers sent on every request. Plex uses these
 * to identify the "device" and to populate the user's authorized devices list.
 */
export function plexHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "X-Plex-Product": PLEX_PRODUCT,
    "X-Plex-Version": PLEX_VERSION,
    "X-Plex-Client-Identifier": PLEX_CLIENT_IDENTIFIER,
    "X-Plex-Platform": PLEX_PLATFORM,
    "X-Plex-Device": PLEX_PLATFORM,
    "X-Plex-Device-Name": PLEX_PRODUCT,
    ...extra,
  };
}

/** The same identification fields as query params (used for building auth URLs). */
export function plexQueryParams(): Record<string, string> {
  return {
    "X-Plex-Product": PLEX_PRODUCT,
    "X-Plex-Version": PLEX_VERSION,
    "X-Plex-Client-Identifier": PLEX_CLIENT_IDENTIFIER,
    "X-Plex-Platform": PLEX_PLATFORM,
  };
}
