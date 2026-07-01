import type { Request, Response } from "express";
import { Router } from "express";
import { buildAuthUrl, checkPin, createPin, getAccount } from "../plex/auth.js";
import { getSession } from "../session.js";

export const authRouter = Router();

/** Build the URL Plex redirects to after authorization (server-side callback). */
function authCallbackUrl(req: Request, pinId: number): string {
  const origin = `${req.protocol}://${req.get("host")}`;
  return `${origin}/api/auth/callback/${pinId}`;
}

function parsePinId(value: unknown): number | null {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Minimal HTML page that reloads until Plex authorization completes. */
function waitingPage(pinId: number): string {
  const next = `/api/auth/callback/${pinId}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="2;url=${next}" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mayhem — Sign in</title>
  <style>
    body { background:#0b0b0f; color:#e9e9f0; font-family:system-ui,sans-serif;
      display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
    .card { text-align:center; padding:2rem; }
    h1 { color:#e5a00d; font-size:1.5rem; }
    p { color:#9a9aac; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Mayhem</h1>
    <p>Completing Plex sign-in…</p>
  </div>
</body>
</html>`;
}

async function handleAuthCallback(req: Request, res: Response, pinId: number | null): Promise<void> {
  const session = await getSession(req, res);

  if (session.plexToken) {
    res.redirect(302, "/");
    return;
  }

  if (pinId == null) {
    pinId = parsePinId(session.pendingPinId);
  }

  if (pinId == null) {
    res.redirect(302, "/?auth=missing-pin");
    return;
  }

  try {
    const pin = await checkPin(pinId);
    if (pin.authToken) {
      session.plexToken = pin.authToken;
      session.homeToken = pin.authToken;
      session.pendingPinId = undefined;
      await session.save();
      res.redirect(302, "/");
      return;
    }
  } catch (err) {
    console.error("[auth] callback PIN check failed:", err);
    res.redirect(302, "/?auth=error");
    return;
  }

  res.status(200).type("html").send(waitingPage(pinId));
}

/**
 * Start the Plex sign-in flow. Returns a PIN id (stored in the session) and the
 * URL the user must visit to authorize.
 */
authRouter.post("/pin", async (req, res) => {
  const session = await getSession(req, res);
  const pin = await createPin();

  const authUrl = buildAuthUrl(pin.code, authCallbackUrl(req, pin.id));

  session.pendingPinId = pin.id;
  await session.save();

  res.json({ pinId: pin.id, authUrl });
});

/** Return the in-progress PIN id stored in the server session. */
authRouter.get("/pending-pin", async (req, res) => {
  const session = await getSession(req, res);
  const pinId = session.pendingPinId;
  if (pinId == null || !Number.isFinite(pinId)) {
    return res.json({ pinId: null });
  }
  res.json({ pinId });
});

/**
 * Server-side Plex OAuth callback. Plex redirects here after authorization;
 * we exchange the PIN, set the session cookie, and redirect into the app.
 * Works in WebView / Tesla browsers where client-side storage is unreliable.
 */
authRouter.get("/callback/:pinId", async (req, res) => {
  const pinId = parsePinId(req.params.pinId);
  await handleAuthCallback(req, res, pinId);
});

/** Legacy callback with ?pin= query (SPA redirect fallback). */
authRouter.get("/callback", async (req, res) => {
  const pinId = parsePinId(req.query.pin);
  await handleAuthCallback(req, res, pinId);
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
