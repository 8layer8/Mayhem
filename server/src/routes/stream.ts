import { Router, type Request, type Response } from "express";
import { fetch } from "undici";
import { PLEX_CLIENT_IDENTIFIER } from "../config.js";
import { plexHeaders } from "../plex/headers.js";
import { currentServer, requireServer } from "./requireServer.js";
import { abortOnClose, isDisconnect, pipeUpstreamBody } from "./streamUtils.js";

export const streamRouter = Router();

streamRouter.use(requireServer);

/** Audio codecs browsers can generally play directly (so we can avoid transcoding). */
const DIRECT_PLAY_CODECS = new Set([
  "mp3",
  "aac",
  "flac",
  "alac",
  "vorbis",
  "opus",
  "pcm",
  "wav",
]);

const CODEC_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  aac: "audio/aac",
  flac: "audio/flac",
  alac: "audio/mp4",
  vorbis: "audio/ogg",
  opus: "audio/ogg",
  pcm: "audio/wav",
  wav: "audio/wav",
};

interface TrackPart {
  partKey: string;
  codec: string;
  container: string;
  bitrate?: number;
}

async function resolvePart(
  baseUrl: string,
  token: string,
  ratingKey: string,
): Promise<TrackPart | null> {
  const url = new URL(`${baseUrl}/library/metadata/${ratingKey}`);
  const res = await fetch(url, {
    headers: plexHeaders({ accept: "application/json", "X-Plex-Token": token }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as {
    MediaContainer?: {
      Metadata?: Array<{
        Media?: Array<{
          audioCodec?: string;
          container?: string;
          bitrate?: number;
          Part?: Array<{ key?: string; container?: string }>;
        }>;
      }>;
    };
  };
  const media = body.MediaContainer?.Metadata?.[0]?.Media?.[0];
  const part = media?.Part?.[0];
  if (!part?.key) return null;
  return {
    partKey: part.key,
    codec: (media?.audioCodec ?? "").toLowerCase(),
    container: (part.container ?? media?.container ?? "").toLowerCase(),
    bitrate: media?.bitrate,
  };
}

/** Source file format + bitrate for display (does not stream audio). */
streamRouter.get("/:ratingKey/info", async (req, res) => {
  const server = currentServer(res);
  const part = await resolvePart(server.baseUrl, server.accessToken, req.params.ratingKey);
  if (!part) {
    return res.status(404).json({ error: "Track not found" });
  }
  res.json({
    codec: part.codec,
    container: part.container,
    bitrate: part.bitrate ?? null,
  });
});

/**
 * Stream a track. Direct-plays the original file (with HTTP Range support so
 * the <audio> element can seek) when the codec is browser-safe; otherwise falls
 * back to an on-the-fly MP3 transcode for universal playback.
 *
 * Query: ?transcode=1 forces transcoding regardless of codec.
 */
streamRouter.get("/:ratingKey", async (req, res) => {
  const server = currentServer(res);
  const { ratingKey } = req.params;

  const part = await resolvePart(server.baseUrl, server.accessToken, ratingKey);
  if (!part) {
    return res.status(404).json({ error: "Track not found" });
  }

  const forceTranscode = req.query.transcode === "1";
  const directPlayable = DIRECT_PLAY_CODECS.has(part.codec);

  if (directPlayable && !forceTranscode) {
    return directProxy(req, res, server.baseUrl, server.accessToken, part);
  }
  return transcodeProxy(req, res, server.baseUrl, server.accessToken, ratingKey);
});

/** Proxy the original file, forwarding Range headers so seeking works. */
async function directProxy(
  req: Request,
  res: Response,
  baseUrl: string,
  token: string,
  part: TrackPart,
): Promise<void> {
  const target = new URL(baseUrl + part.partKey);
  const headers = plexHeaders({ "X-Plex-Token": token });
  if (req.headers.range) headers["range"] = req.headers.range;

  try {
    const upstream = await fetch(target, { headers, signal: abortOnClose(req, res) });
    res.status(upstream.status);
    for (const h of [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
    ]) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    if (!res.getHeader("content-type")) {
      const mime = CODEC_MIME[part.codec] ?? CODEC_MIME[part.container];
      if (mime) res.setHeader("content-type", mime);
    }
    if (!res.getHeader("accept-ranges")) res.setHeader("accept-ranges", "bytes");
    if (!upstream.body) return void res.end();
    await pipeUpstreamBody(upstream.body, res);
  } catch (err) {
    if (isDisconnect(err)) return; // client went away mid-request
    console.error("[stream] direct proxy error", err);
    if (!res.headersSent) res.status(502).end();
  }
}

/** Transcode to MP3 via the universal music transcoder for non-browser codecs. */
async function transcodeProxy(
  req: Request,
  res: Response,
  baseUrl: string,
  token: string,
  ratingKey: string,
): Promise<void> {
  const target = new URL(`${baseUrl}/music/:/transcode/universal/start.mp3`);
  target.searchParams.set("path", `/library/metadata/${ratingKey}`);
  target.searchParams.set("protocol", "http");
  target.searchParams.set("musicBitrate", "320");
  target.searchParams.set("session", `${PLEX_CLIENT_IDENTIFIER}-${ratingKey}`);
  target.searchParams.set("X-Plex-Token", token);

  try {
    const upstream = await fetch(target, {
      headers: plexHeaders({ "X-Plex-Token": token }),
      signal: abortOnClose(req, res),
    });
    res.status(upstream.status === 200 ? 200 : upstream.status);
    res.setHeader("content-type", "audio/mpeg");
    if (!upstream.body) return void res.end();
    await pipeUpstreamBody(upstream.body, res);
  } catch (err) {
    if (isDisconnect(err)) return; // client went away mid-request
    console.error("[stream] transcode proxy error", err);
    if (!res.headersSent) res.status(502).end();
  }
}
