import { sealData, unsealData } from "iron-session";
import { SESSION_SECRET } from "./config.js";

const GRANT_TTL_MS = 10 * 60 * 1000;

interface StreamGrant {
  ratingKey: string;
  baseUrl: string;
  accessToken: string;
  exp: number;
}

/** Issue a short-lived token so TV media elements can stream without cookies. */
export async function createStreamGrant(
  server: { baseUrl: string; accessToken: string },
  ratingKey: string,
): Promise<string> {
  const grant: StreamGrant = {
    ratingKey,
    baseUrl: server.baseUrl,
    accessToken: server.accessToken,
    exp: Date.now() + GRANT_TTL_MS,
  };
  return sealData(grant, { password: SESSION_SECRET, ttl: GRANT_TTL_MS });
}

/** Validate a stream grant and return the Plex server credentials it encodes. */
export async function resolveStreamGrant(
  token: string,
  ratingKey: string,
): Promise<{ baseUrl: string; accessToken: string } | null> {
  try {
    const grant = await unsealData<StreamGrant>(token, { password: SESSION_SECRET });
    if (grant.ratingKey !== ratingKey || grant.exp < Date.now()) return null;
    return { baseUrl: grant.baseUrl, accessToken: grant.accessToken };
  } catch {
    return null;
  }
}
