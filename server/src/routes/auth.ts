import { Router } from "express";
import { buildAuthUrl, checkPin, createPin, getAccount } from "../plex/auth.js";
import { getSession } from "../session.js";

export const authRouter = Router();

/**
 * Start the Plex sign-in flow. Returns a PIN id (stored in the session) and the
 * URL the user must visit to authorize.
 */
authRouter.post("/pin", async (req, res) => {
  const session = await getSession(req, res);
  const pin = await createPin();

  // Send the user back to the app once they finish authorizing on plex.tv.
  const origin = `${req.protocol}://${req.get("host")}`;
  const authUrl = buildAuthUrl(pin.code, `${origin}/auth/callback`);

  session.pendingPinId = pin.id;
  await session.save();

  res.json({ pinId: pin.id, authUrl });
});

/**
 * Poll a PIN's status. Once Plex returns an auth token, store it in the session
 * and report authenticated. The client polls this until `authenticated` is true.
 */
authRouter.get("/pin/:id", async (req, res) => {
  const session = await getSession(req, res);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid PIN id" });
  }

  const pin = await checkPin(id);
  if (pin.authToken) {
    // The login token is the account/admin token: it's both the active token
    // and the token used later to list/switch Plex Home users.
    session.plexToken = pin.authToken;
    session.homeToken = pin.authToken;
    session.pendingPinId = undefined;
    await session.save();
    return res.json({ authenticated: true });
  }
  res.json({ authenticated: false });
});

/** Current auth + selected-server state, used to bootstrap the SPA. */
authRouter.get("/me", async (req, res) => {
  const session = await getSession(req, res);
  if (!session.plexToken) {
    return res.json({ authenticated: false });
  }
  const account = await getAccount(session.plexToken).catch(() => null);
  res.json({
    authenticated: true,
    username: account?.username ?? null,
    userThumb: account?.thumb ?? null,
    server: session.server
      ? { machineId: session.server.machineId, name: session.server.name }
      : null,
  });
});

authRouter.post("/logout", async (req, res) => {
  const session = await getSession(req, res);
  session.destroy();
  res.json({ ok: true });
});
