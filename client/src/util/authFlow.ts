const PENDING_PIN_KEY = "mayhem-pending-pin";

/** Browsers that navigate away on window.open with no reliable way back. */
export function prefersSameTabAuth(): boolean {
  const ua = navigator.userAgent;
  if (/Tesla/i.test(ua)) return true;
  // Common embedded / TV browsers with poor popup support.
  if (/Web0S|SmartTV|NetCast|Tizen|HbbTV|CrKey/i.test(ua)) return true;
  return false;
}

export function storePendingPin(pinId: number): void {
  sessionStorage.setItem(PENDING_PIN_KEY, String(pinId));
}

export function takePendingPin(): number | null {
  const raw = sessionStorage.getItem(PENDING_PIN_KEY);
  sessionStorage.removeItem(PENDING_PIN_KEY);
  const id = raw ? Number(raw) : NaN;
  return Number.isFinite(id) ? id : null;
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
