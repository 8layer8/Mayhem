const UI_SCALE_STEPS = ["small", "medium", "large", "extra-large", "full"] as const;

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

function stepUiScale(scale: string, delta: -1 | 1): string {
  const index = UI_SCALE_STEPS.indexOf(scale as (typeof UI_SCALE_STEPS)[number]);
  if (index < 0) return scale;
  const next = index + delta;
  if (next < 0 || next >= UI_SCALE_STEPS.length) return scale;
  return UI_SCALE_STEPS[next];
}

/**
 * Adjust the server UI_SCALE preset for the current client.
 * TV browsers bump small/medium up; Tesla's Chromium browser renders true CSS pixels
 * and needs one step down from large presets.
 */
export function effectiveUiScale(serverScale: string): string {
  if (isTvBrowser()) {
    if (serverScale === "small" || serverScale === "medium") return "extra-large";
    return serverScale;
  }
  if (isTeslaBrowser() && serverScale !== "small") {
    return stepUiScale(serverScale, -1);
  }
  return serverScale;
}
