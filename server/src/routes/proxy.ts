import { Router } from "express";
import { fetch } from "undici";
import { plexHeaders } from "../plex/headers.js";
import { currentServer, requireServer } from "./requireServer.js";

export const proxyRouter = Router();

proxyRouter.use(requireServer);

/**
 * Generic JSON proxy to the selected Plex server. Anything under /api/plex/* is
 * forwarded to <baseUrl>/* with the per-server token injected. This is used for
 * library browsing, metadata, playlists, search, and playlist edits.
 */
proxyRouter.all(/.*/, async (req, res) => {
  const server = currentServer(res);

  // req.path here is the part after the mount point (/api/plex).
  const target = new URL(server.baseUrl + req.path);
  for (const [key, value] of Object.entries(req.query)) {
    if (Array.isArray(value)) {
      for (const v of value) target.searchParams.append(key, String(v));
    } else if (value != null) {
      target.searchParams.set(key, String(value));
    }
  }

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  try {
    const upstream = await fetch(target, {
      method,
      headers: plexHeaders({
        accept: "application/json",
        "X-Plex-Token": server.accessToken,
        ...(hasBody && req.is("application/json")
          ? { "content-type": "application/json" }
          : {}),
      }),
      body: hasBody && req.is("application/json") ? JSON.stringify(req.body) : undefined,
    });

    res.status(upstream.status);
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err) {
    console.error("[proxy] upstream error", err);
    res.status(502).json({ error: "Upstream Plex request failed" });
  }
});
