import type { NextFunction, Request, Response } from "express";
import { getSession } from "../session.js";
import { resolveStreamGrant } from "../streamGrant.js";

export interface StreamServer {
  baseUrl: string;
  accessToken: string;
}

/**
 * Authenticate a stream request via session cookie or a short-lived `st` grant
 * (TV browsers often omit cookies on <video>/<audio> src requests).
 */
export async function requireStreamAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { ratingKey } = req.params;
  const grantToken = typeof req.query.st === "string" ? req.query.st : "";

  if (grantToken) {
    const server = await resolveStreamGrant(grantToken, ratingKey);
    if (!server) {
      res.status(401).end();
      return;
    }
    res.locals.streamServer = server;
    next();
    return;
  }

  const session = await getSession(req, res);
  if (!session.plexToken) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (!session.server) {
    res.status(409).json({ error: "No server selected" });
    return;
  }
  res.locals.streamServer = {
    baseUrl: session.server.baseUrl,
    accessToken: session.server.accessToken,
  };
  next();
}

export function streamServer(res: Response): StreamServer {
  return res.locals.streamServer as StreamServer;
}
