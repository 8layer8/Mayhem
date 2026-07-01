/** Detect TV browsers and the Mayhem Android TV WebView shell. */
export function isTvBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  if (document.documentElement.dataset.mayhemTv === "true") return true;

  const ua = navigator.userAgent;
  return /Web0S|SmartTV|NetCast|Tizen|HbbTV|CrKey|Android TV|GoogleTV|Google TV|AFT[A-Z]|AFTT|AFTR|AFTB|AFTM|AFTS|Bravia|BRAVIA|Philips|Opera TV|VIDAA|MiTV|Hisense|SHIELD|Nexus Player|MayhemAndroidTV/i.test(
    ua,
  );
}

export function isAndroidTvShell(): boolean {
  return /MayhemAndroidTV/i.test(navigator.userAgent);
}

/** Apply TV mode attributes on the document root (call once at startup). */
export function initTvMode(): void {
  if (!isTvBrowser()) return;
  document.documentElement.dataset.tv = "true";
  document.documentElement.dataset.mayhemTv = "true";
}

/** Prefer extra-large UI on TV when the server preset is small or medium. */
export function effectiveTvUiScale(serverScale: string): string {
  if (!isTvBrowser()) return serverScale;
  if (serverScale === "small" || serverScale === "medium") return "extra-large";
  return serverScale;
}
