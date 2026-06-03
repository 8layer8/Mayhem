import { fetch } from "undici";
import { PLEX_CLIENT_IDENTIFIER, PLEX_PRODUCT } from "../config.js";
import { plexHeaders, plexQueryParams } from "./headers.js";

const PLEX_TV = "https://plex.tv";

export interface PlexPin {
  id: number;
  code: string;
  authToken: string | null;
}

interface PinResponse {
  id: number;
  code: string;
  authToken: string | null;
}

/**
 * Create a new strong PIN for the OAuth-style login flow.
 * The user authorizes it at https://app.plex.tv/auth and we then poll for the
 * resulting auth token.
 */
export async function createPin(): Promise<PlexPin> {
  const res = await fetch(`${PLEX_TV}/api/v2/pins?strong=true`, {
    method: "POST",
    headers: plexHeaders({ accept: "application/json" }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create Plex PIN (${res.status})`);
  }
  const body = (await res.json()) as PinResponse;
  return { id: body.id, code: body.code, authToken: body.authToken ?? null };
}

/** Poll the status of a PIN; `authToken` becomes non-null once authorized. */
export async function checkPin(id: number): Promise<PlexPin> {
  const res = await fetch(`${PLEX_TV}/api/v2/pins/${id}`, {
    method: "GET",
    headers: plexHeaders({ accept: "application/json" }),
  });
  if (!res.ok) {
    throw new Error(`Failed to check Plex PIN (${res.status})`);
  }
  const body = (await res.json()) as PinResponse;
  return { id: body.id, code: body.code, authToken: body.authToken ?? null };
}

/**
 * Build the URL the user visits to authorize a PIN. After authorizing, Plex
 * redirects to `forwardUrl` (we send them back to the app).
 */
export function buildAuthUrl(code: string, forwardUrl: string): string {
  const params = new URLSearchParams({
    clientID: PLEX_CLIENT_IDENTIFIER,
    code,
    forwardUrl,
    "context[device][product]": PLEX_PRODUCT,
    ...plexQueryParams(),
  });
  return `https://app.plex.tv/auth#?${params.toString()}`;
}

/** Fetch the Plex account associated with a token (used for display only). */
export async function getAccount(
  token: string,
): Promise<{ username: string; uuid: string | null; thumb: string | null } | null> {
  const res = await fetch(`${PLEX_TV}/api/v2/user`, {
    headers: plexHeaders({ accept: "application/json", "X-Plex-Token": token }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as {
    username?: string;
    title?: string;
    uuid?: string;
    thumb?: string;
  };
  return {
    username: body.username ?? body.title ?? "Plex user",
    uuid: body.uuid ?? null,
    thumb: body.thumb ?? null,
  };
}
