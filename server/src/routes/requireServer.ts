import type { NextFunction, Request, Response } from "express";
import { getSession, type SessionData } from "../session.js";

/**
 * Express middleware that ensures the request has an authenticated session with
 * a selected server, attaching it to `res.locals.server`.
 */
export async function requireServer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const session = await getSession(req, res);
  if (!session.plexToken) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (!session.server) {
    res.status(409).json({ error: "No server selected" });
    return;
  }
  res.locals.server = session.server;
  next();
}

export function currentServer(res: Response): NonNullable<SessionData["server"]> {
  return res.locals.server as NonNullable<SessionData["server"]>;
}
