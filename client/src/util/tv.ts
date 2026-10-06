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

  const ua = navigator.userAgent;

  // 1. Direct User Agent check (standard check, works when parked)
  const directMatch = /Tesla/i.test(ua);
  if (directMatch) {
    try {
      localStorage.setItem("mayhem-tesla-detected", "true");
    } catch {
      /* ignore storage errors in private mode */
    }
    return true;
  }

  // 2. Persistent detection check (if we once knew they were on Tesla, they still are!)
  try {
    if (localStorage.getItem("mayhem-tesla-detected") === "true" || localStorage.getItem("mayhem-tesla-forced") === "true") {
      return true;
    }
  } catch {
    /* ignore */
  }

  // 3. Robust Heuristics fallback (no localStorage, works in driving mode when UA stripped)
  if (typeof window !== "undefined") {
    const dpr = window.devicePixelRatio || 1;
    const isTeslaDpr = Math.abs(dpr - 1.53) < 0.015; // Matches 1.5299999713897
    
    // Check for moving split-screen metrics: 773x601 logical size, 1.53 DPR
    const isMovingMetrics = isTeslaDpr && window.innerWidth >= 700 && window.innerWidth <= 850 && window.innerHeight >= 550 && window.innerHeight <= 650;
    
    // Check for parked fullscreen metrics: 1920 width, 1.0 DPR, height around 1140
    const isParkedMetrics = Math.abs(dpr - 1.0) < 0.01 && window.innerWidth === 1920 && window.innerHeight >= 1000 && window.innerHeight <= 1180;

    if (isMovingMetrics || isParkedMetrics) {
      try {
        localStorage.setItem("mayhem-tesla-detected", "true");
      } catch {
        /* ignore */
      }
      return true;
    }
  }

  return false;
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
 * Tesla supports "small" for compact, "full" for full-screen cover art, and "medium" for standard.
 */
export function effectiveUiScale(serverScale: string): string {
  if (isTvBrowser()) {
    if (serverScale === "small" || serverScale === "medium") return "extra-large";
    return serverScale;
  }
  if (isTeslaBrowser()) {
    if (serverScale === "full") return "full";
    return serverScale === "small" ? "small" : "medium";
  }
  return serverScale;
}
