import { isTeslaBrowser, isTvBrowser } from "./tv";

const PENDING_PIN_KEY = "mayhem-pending-pin";

/** Browsers that navigate away on window.open with no reliable way back. */
export function prefersSameTabAuth(): boolean {
  if (isTeslaBrowser() || isTvBrowser()) return true;
  return false;
}

export function storePendingPin(pinId: number): void {
  const value = String(pinId);
  try {
    sessionStorage.setItem(PENDING_PIN_KEY, value);
  } catch {
    /* WebView may block storage in some modes */
  }
  try {
    localStorage.setItem(PENDING_PIN_KEY, value);
  } catch {
    /* ignore */
  }
}

/** Read the pending PIN without removing it. */
export function peekPendingPin(): number | null {
  return parsePinId(readPendingPinRaw());
}

export function takePendingPin(): number | null {
  const raw = readPendingPinRaw();
  clearPendingPin();
  return parsePinId(raw);
}

function readPendingPinRaw(): string | null {
  try {
    return sessionStorage.getItem(PENDING_PIN_KEY) ?? localStorage.getItem(PENDING_PIN_KEY);
  } catch {
    return null;
  }
}

function clearPendingPin(): void {
  try {
    sessionStorage.removeItem(PENDING_PIN_KEY);
    localStorage.removeItem(PENDING_PIN_KEY);
  } catch {
    /* ignore */
  }
}

function parsePinId(raw: string | null): number | null {
  const id = raw ? Number(raw) : NaN;
  return Number.isFinite(id) ? id : null;
}

/** Resolve PIN id from callback URL, browser storage, or null. */
export function pinIdFromCallbackUrl(): number | null {
  const params = new URLSearchParams(window.location.search);
  return parsePinId(params.get("pin") ?? params.get("pinId"));
}

/**
 * Open the Plex authorization URL. Returns whether auth continues in a popup
 * (caller should poll) or the page is navigating away (caller should not poll).
 */
export function openPlexAuth(authUrl: string): "popup" | "same-tab" {
  if (prefersSameTabAuth()) {
    return "same-tab";
  }

  const popup = window.open(authUrl, "plex-auth", "width=600,height=720");
  if (!popup) {
    return "same-tab";
  }

  return "popup";
}

export function navigateToPlexAuth(authUrl: string): void {
  window.location.assign(authUrl);
}
