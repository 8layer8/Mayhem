import { fetch } from "undici";
import { plexHeaders } from "./headers.js";

const PLEX_TV = "https://plex.tv";

export interface PlexConnection {
  protocol: string;
  address: string;
  port: number;
  uri: string;
  local: boolean;
  relay: boolean;
}

export interface PlexServer {
  name: string;
  machineId: string;
  accessToken: string;
  owned: boolean;
  connections: PlexConnection[];
}

interface ResourceResponse {
  name: string;
  clientIdentifier: string;
  accessToken?: string;
  owned: boolean;
  provides: string;
  connections?: PlexConnection[];
}

/** List the Plex Media Servers the account can access. */
export async function getServers(token: string): Promise<PlexServer[]> {
  const url = `${PLEX_TV}/api/v2/resources?includeHttps=1&includeRelay=1`;
  const res = await fetch(url, {
    headers: plexHeaders({ accept: "application/json", "X-Plex-Token": token }),
  });
  if (!res.ok) {
    throw new Error(`Failed to list Plex resources (${res.status})`);
  }
  const resources = (await res.json()) as ResourceResponse[];
  return resources
    .filter((r) => r.provides.split(",").includes("server"))
    .map((r) => ({
      name: r.name,
      machineId: r.clientIdentifier,
      accessToken: r.accessToken ?? token,
      owned: r.owned,
      connections: r.connections ?? [],
    }));
}

/**
 * Pick the best reachable connection for a server. Tries connections in a
 * sensible order (local + direct first, then remote, relay last) and returns
 * the first that responds to a quick identity probe.
 */
export async function pickReachableConnection(
  server: PlexServer,
): Promise<string | null> {
  const ordered = [...server.connections].sort((a, b) => {
    const score = (c: PlexConnection) =>
      (c.relay ? 2 : 0) + (c.local ? 0 : 1);
    return score(a) - score(b);
  });

  for (const conn of ordered) {
    const baseUrl = conn.uri.replace(/\/$/, "");
    if (await probe(baseUrl, server.accessToken)) {
      return baseUrl;
    }
  }
  return null;
}

async function probe(baseUrl: string, token: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${baseUrl}/identity`, {
      headers: plexHeaders({ accept: "application/json", "X-Plex-Token": token }),
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
