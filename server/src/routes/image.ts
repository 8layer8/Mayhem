import { Router } from "express";
import { fetch } from "undici";
import { plexHeaders } from "../plex/headers.js";
import { currentServer, requireServer } from "./requireServer.js";
import { abortOnClose, isDisconnect, pipeUpstreamBody } from "./streamUtils.js";

export const imageRouter = Router();

imageRouter.use(requireServer);

/**
 * Proxy album/artist artwork through the server's photo transcoder so the
 * browser gets correctly-sized, same-origin images (and we never leak the
 * token). Call as /api/image?path=<thumb key>&width=300&height=300
 */
imageRouter.get("/", async (req, res) => {
  const server = currentServer(res);
  const path = String(req.query.path ?? "");
  if (!path.startsWith("/")) {
    return res.status(400).json({ error: "path query param required" });
  }
  const width = String(req.query.width ?? "300");
  const height = String(req.query.height ?? width);

  const transcode = new URL(`${server.baseUrl}/photo/:/transcode`);
  transcode.searchParams.set("url", path);
  transcode.searchParams.set("width", width);
  transcode.searchParams.set("height", height);
  transcode.searchParams.set("minSize", "1");
  transcode.searchParams.set("upscale", "1");

  try {
    const upstream = await fetch(transcode, {
      headers: plexHeaders({ "X-Plex-Token": server.accessToken }),
      signal: abortOnClose(req, res),
    });
    if (!upstream.ok || !upstream.body) {
      return res.status(upstream.status || 502).end();
    }
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);
    res.setHeader("cache-control", "public, max-age=86400");
    await pipeUpstreamBody(upstream.body, res);
  } catch (err) {
    if (isDisconnect(err)) return; // client went away mid-request
    console.error("[image] upstream error", err);
    if (!res.headersSent) res.status(502).end();
  }
});
