import { Router } from "express";
import { getServers, pickReachableConnection } from "../plex/resources.js";
import { getSession } from "../session.js";

export const serversRouter = Router();

/** List the servers the signed-in account can access. */
serversRouter.get("/", async (req, res) => {
  const session = await getSession(req, res);
  if (!session.plexToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const servers = await getServers(session.plexToken);
  res.json({
    selected: session.server?.machineId ?? null,
    servers: servers.map((s) => ({
      name: s.name,
      machineId: s.machineId,
      owned: s.owned,
    })),
  });
});

/**
 * Select a server. We resolve a reachable connection server-side and store the
 * working base URL + per-server token in the session.
 */
serversRouter.post("/select", async (req, res) => {
  const session = await getSession(req, res);
  if (!session.plexToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const { machineId } = req.body as { machineId?: string };
  if (!machineId) {
    return res.status(400).json({ error: "machineId is required" });
  }

  const servers = await getServers(session.plexToken);
  const server = servers.find((s) => s.machineId === machineId);
  if (!server) {
    return res.status(404).json({ error: "Server not found" });
  }

  const baseUrl = await pickReachableConnection(server);
  if (!baseUrl) {
    return res
      .status(502)
      .json({ error: "Could not reach any connection for this server" });
  }

  session.server = {
    machineId: server.machineId,
    name: server.name,
    baseUrl,
    accessToken: server.accessToken,
  };
  await session.save();

  res.json({ ok: true, name: server.name, machineId: server.machineId });
});
