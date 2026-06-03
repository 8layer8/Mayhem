import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

/** Product name advertised to Plex (shows up in the user's authorized devices). */
export const APP_TITLE = process.env.APP_TITLE?.trim() || "Mayhem";
export const PLEX_PRODUCT = APP_TITLE;
export const PLEX_VERSION = "0.1.0";
export const PLEX_PLATFORM = "Web";

export const PORT = Number(process.env.PORT ?? 8080);

export const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";

/** UI scale presets for buttons and the now-playing album art. */
export const UI_SCALES = ["small", "medium", "large", "extra-large", "full"] as const;
export type UiScale = (typeof UI_SCALES)[number];

export const UI_SCALE = (() => {
  const raw = (process.env.UI_SCALE ?? "medium").toLowerCase();
  if ((UI_SCALES as readonly string[]).includes(raw)) return raw as UiScale;
  console.warn(`[config] Invalid UI_SCALE "${raw}"; using medium.`);
  return "medium";
})();

/** Show the frequency visualizer on the now-playing screen (full mode always disables it). */
export const VISUALIZER_ENABLED = process.env.VISUALIZER_ENABLED !== "false";

export interface PublicUiConfig {
  appTitle: string;
  uiScale: UiScale;
  visualizerEnabled: boolean;
}

export function getPublicUiConfig(): PublicUiConfig {
  return {
    appTitle: APP_TITLE,
    uiScale: UI_SCALE,
    visualizerEnabled: UI_SCALE !== "full" && VISUALIZER_ENABLED,
  };
}

/**
 * Secret used to encrypt the session cookie. iron-session requires >= 32 chars.
 * In development we fall back to an ephemeral secret (sessions won't survive a
 * restart) but warn loudly; in production this must be provided.
 */
export const SESSION_SECRET = (() => {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET must be set to a random string of at least 32 characters.",
    );
  }
  console.warn(
    "[config] SESSION_SECRET is unset or too short; using an ephemeral dev secret. " +
      "Sessions will not persist across restarts. Set SESSION_SECRET for production.",
  );
  return randomUUID() + randomUUID();
})();

/**
 * A stable per-installation Plex client identifier. Honors
 * PLEX_CLIENT_IDENTIFIER if set, otherwise generates one and persists it under
 * the data directory so it survives restarts/redeploys.
 */
export const PLEX_CLIENT_IDENTIFIER = (() => {
  const fromEnv = process.env.PLEX_CLIENT_IDENTIFIER;
  if (fromEnv) return fromEnv;

  const dataDir = resolve(process.env.DATA_DIR ?? "data");
  const file = resolve(dataDir, "client-id");
  try {
    if (existsSync(file)) {
      const existing = readFileSync(file, "utf8").trim();
      if (existing) return existing;
    }
    const id = randomUUID();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, id, "utf8");
    return id;
  } catch (err) {
    console.warn(
      `[config] Could not persist client identifier to ${file}; using an ephemeral one.`,
      err,
    );
    return randomUUID();
  }
})();
