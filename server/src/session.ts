import type { Request, Response } from "express";
import { getIronSession, type IronSession } from "iron-session";
import { COOKIE_SECURE, SESSION_SECRET } from "./config.js";

export interface SessionData {
  /** Currently-active Plex token (the signed-in or switched-to Home user). */
  plexToken?: string;
  /**
   * The original account/admin token from login. Plex Home user listing and
   * switching must be done with this token, so we keep it separate from the
   * active `plexToken` (which changes when switching users).
   */
  homeToken?: string;
  /** In-progress PIN login id, while the user is authorizing on plex.tv. */
  pendingPinId?: number;
  /** The Plex server the user selected to browse/play from. */
  server?: {
    /** machineIdentifier of the chosen server. */
    machineId: string;
    name: string;
    /** Reachable base URL (no trailing slash), e.g. https://1-2-3-4.<hash>.plex.direct:32400 */
    baseUrl: string;
    /** Per-server access token (may differ from the account token for shared servers). */
    accessToken: string;
  };
}

const sessionOptions = {
  password: SESSION_SECRET,
  cookieName: "mayhem_session",
  cookieOptions: {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax" as const,
    path: "/",
    // 30 days
    maxAge: 60 * 60 * 24 * 30,
  },
};

export function getSession(
  req: Request,
  res: Response,
): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(req, res, sessionOptions);
}
