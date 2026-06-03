import { Router } from "express";
import { fetch } from "undici";
import { plexHeaders } from "../plex/headers.js";
import { currentServer, requireServer } from "./requireServer.js";

export const playlistsRouter = Router();

playlistsRouter.use(requireServer);

/** Build the server:// library URI that Plex playlist mutations expect. */
function libraryUri(machineId: string, ratingKeys: string[]): string {
  return `server://${machineId}/com.plexapp.plugins.library/library/metadata/${ratingKeys.join(",")}`;
}

async function plexRequest(
  baseUrl: string,
  token: string,
  method: string,
  path: string,
  params: Record<string, string> = {},
) {
  const url = new URL(baseUrl + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return fetch(url, {
    method,
    headers: plexHeaders({ accept: "application/json", "X-Plex-Token": token }),
  });
}

/** Create a new audio playlist seeded with the given track rating keys. */
playlistsRouter.post("/", async (req, res) => {
  const server = currentServer(res);
  const { title, trackKeys } = req.body as { title?: string; trackKeys?: string[] };
  if (!title || !trackKeys?.length) {
    return res.status(400).json({ error: "title and trackKeys are required" });
  }
  const upstream = await plexRequest(server.baseUrl, server.accessToken, "POST", "/playlists", {
    type: "audio",
    title,
    smart: "0",
    uri: libraryUri(server.machineId, trackKeys),
  });
  res.status(upstream?.ok ? 201 : 502).json({ ok: !!upstream?.ok });
});

/** Append tracks to an existing playlist. */
playlistsRouter.post("/:id/items", async (req, res) => {
  const server = currentServer(res);
  const { trackKeys } = req.body as { trackKeys?: string[] };
  if (!trackKeys?.length) {
    return res.status(400).json({ error: "trackKeys are required" });
  }
  const upstream = await plexRequest(
    server.baseUrl,
    server.accessToken,
    "PUT",
    `/playlists/${req.params.id}/items`,
    { uri: libraryUri(server.machineId, trackKeys) },
  );
  res.status(upstream?.ok ? 200 : 502).json({ ok: !!upstream?.ok });
});

/** Remove a single item (by playlistItemID) from a playlist. */
playlistsRouter.delete("/:id/items/:itemId", async (req, res) => {
  const server = currentServer(res);
  const upstream = await plexRequest(
    server.baseUrl,
    server.accessToken,
    "DELETE",
    `/playlists/${req.params.id}/items/${req.params.itemId}`,
  );
  res.status(upstream?.ok ? 200 : 502).json({ ok: !!upstream?.ok });
});

/** Move an item after another item (reorder). Omit `after` to move to the top. */
playlistsRouter.put("/:id/items/:itemId/move", async (req, res) => {
  const server = currentServer(res);
  const { after } = req.body as { after?: string };
  const upstream = await plexRequest(
    server.baseUrl,
    server.accessToken,
    "PUT",
    `/playlists/${req.params.id}/items/${req.params.itemId}/move`,
    after ? { after } : {},
  );
  res.status(upstream?.ok ? 200 : 502).json({ ok: !!upstream?.ok });
});

/** Delete an entire playlist. */
playlistsRouter.delete("/:id", async (req, res) => {
  const server = currentServer(res);
  const upstream = await plexRequest(
    server.baseUrl,
    server.accessToken,
    "DELETE",
    `/playlists/${req.params.id}`,
  );
  res.status(upstream?.ok ? 200 : 502).json({ ok: !!upstream?.ok });
});
