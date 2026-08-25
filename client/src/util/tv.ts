/** Detect TV browsers and the Mayhem Android TV WebView shell. */
export function isTvBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  if (document.documentElement.dataset.mayhemTv === "true") return true;

  const ua = navigator.userAgent;
  return /Web0S|SmartTV|NetCast|Tizen|HbbTV|CrKey|Android TV|GoogleTV|Google TV|AFT[A-Z]|AFTT|AFTR|AFTB|AFTM|AFTS|Bravia|BRAVIA|Philips|Opera TV|VIDAA|MiTV|Hisense|SHIELD|Nexus Player|MayhemAndroidTV/i.test(
    ua,
  );
}

/** Detect the in-car Tesla browser (Chromium and legacy Qt builds). */
export function isTeslaBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Tesla/i.test(navigator.userAgent);
}

export function isAndroidTvShell(): boolean {
  return /MayhemAndroidTV/i.test(navigator.userAgent);
}

/** Apply client-specific attributes on the document root (call once at startup). */
export function initTvMode(): void {
  if (isTvBrowser()) {
    document.documentElement.dataset.tv = "true";
    document.documentElement.dataset.mayhemTv = "true";
  }
  if (isTeslaBrowser()) {
    document.documentElement.dataset.tesla = "true";
  }
}

/**
 * Adjust the server UI_SCALE preset for the current client.
 * TV browsers bump small/medium up for distance viewing.
 * Tesla caps at medium — viewport-based tokens come from initTeslaViewport().
 */
export function effectiveUiScale(serverScale: string): string {
  if (isTvBrowser()) {
    if (serverScale === "small" || serverScale === "medium") return "extra-large";
    return serverScale;
  }
  if (isTeslaBrowser()) {
    return serverScale === "small" ? "small" : "medium";
  }
  return serverScale;
}
