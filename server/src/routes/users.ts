import { Router } from "express";
import { getAccount } from "../plex/auth.js";
import { getHomeUsers, switchHomeUser } from "../plex/home.js";
import { getServers, pickReachableConnection } from "../plex/resources.js";
import { getSession } from "../session.js";

export const usersRouter = Router();

/** List the Plex Home users that can be switched to, and which is active. */
usersRouter.get("/", async (req, res) => {
  const session = await getSession(req, res);
  if (!session.homeToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const [users, account] = await Promise.all([
    getHomeUsers(session.homeToken),
    session.plexToken ? getAccount(session.plexToken).catch(() => null) : null,
  ]);
  res.json({ currentUuid: account?.uuid ?? null, users });
});

/**
 * Switch to a different Home user. Re-resolves the currently-selected server
 * with the new user's token (the per-user access token differs); if that server
 * isn't available to the new user, the selection is cleared so they re-pick.
 */
usersRouter.post("/switch", async (req, res) => {
  const session = await getSession(req, res);
  if (!session.homeToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const { uuid, pin } = req.body as { uuid?: string; pin?: string };
  if (!uuid) {
    return res.status(400).json({ error: "uuid is required" });
  }

  const token = await switchHomeUser(session.homeToken, uuid, pin);
  if (!token) {
    return res.status(403).json({ error: "Could not switch user (wrong PIN?)" });
  }
  session.plexToken = token;

  // Re-resolve the selected server with the new user's access token.
  if (session.server) {
    const servers = await getServers(token).catch(() => []);
    const match = servers.find((s) => s.machineId === session.server!.machineId);
    const baseUrl = match ? await pickReachableConnection(match) : null;
    if (match && baseUrl) {
      session.server = {
        machineId: match.machineId,
        name: match.name,
        baseUrl,
        accessToken: match.accessToken,
      };
    } else {
      session.server = undefined;
    }
  }

  await session.save();
  res.json({ ok: true, serverCleared: !session.server });
});
