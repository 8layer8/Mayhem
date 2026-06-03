import { fetch } from "undici";
import { plexHeaders } from "./headers.js";

const PLEX_TV = "https://plex.tv";

export interface HomeUser {
  id: number;
  uuid: string;
  title: string;
  /** Absolute avatar URL (loadable directly by the browser). */
  thumb?: string;
  admin: boolean;
  /** Whether a PIN is required to switch to this user. */
  protected: boolean;
}

interface RawHomeUser {
  id: number;
  uuid: string;
  title?: string;
  username?: string;
  friendlyName?: string;
  admin?: boolean;
  restricted?: boolean;
  protected?: boolean;
  thumb?: string;
}

/** List the Plex Home users available under the account (admin token required). */
export async function getHomeUsers(homeToken: string): Promise<HomeUser[]> {
  const res = await fetch(`${PLEX_TV}/api/v2/home/users`, {
    headers: plexHeaders({ accept: "application/json", "X-Plex-Token": homeToken }),
  });
  if (!res.ok) {
    // Home not enabled / not permitted — treat as no switchable users.
    return [];
  }
  const body = (await res.json()) as { users?: RawHomeUser[] } | RawHomeUser[];
  const users = Array.isArray(body) ? body : (body.users ?? []);
  return users.map((u) => ({
    id: u.id,
    uuid: u.uuid,
    title: u.friendlyName || u.title || u.username || "User",
    thumb: u.thumb,
    admin: !!u.admin,
    protected: !!u.protected,
  }));
}

/**
 * Switch to a Home user and return that user's auth token. For protected users
 * a 4-digit PIN must be supplied.
 */
export async function switchHomeUser(
  homeToken: string,
  uuid: string,
  pin?: string,
): Promise<string | null> {
  const url = new URL(`${PLEX_TV}/api/v2/home/users/${uuid}/switch`);
  if (pin) url.searchParams.set("pin", pin);
  const res = await fetch(url, {
    method: "POST",
    headers: plexHeaders({ accept: "application/json", "X-Plex-Token": homeToken }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { authToken?: string };
  return body.authToken ?? null;
}
