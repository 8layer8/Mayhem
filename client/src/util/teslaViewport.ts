import { isTeslaBrowser } from "./tv";

/** Read the visible browser panel size (parked fullscreen vs driving split-screen). */
export function visibleViewport(): { width: number; height: number } {
  const vv = window.visualViewport;
  if (vv) {
    return { width: vv.width, height: vv.height };
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * Map visible height to UI tokens. Tesla's browser panel swings from ~450px (driving
 * split) to ~1000px+ (parked fullscreen); fixed CSS cannot fit both.
 */
export function applyTeslaTokens(width: number, height: number): void {
  const root = document.documentElement;
  const h = Math.round(height);
  const w = Math.round(width);

  // Safeguard: Ensure the data-tesla attribute is set, enabling any [data-tesla="true"] CSS rules.
  root.dataset.tesla = "true";

  root.style.setProperty("--mayhem-app-height", `${h}px`);
  root.style.setProperty("--mayhem-app-width", `${w}px`);

  // Tesla's browser scales the UI by changing devicePixelRatio (DPR).
  // - Moving (split-screen): DPR is ~1.53, leading to gigantic buttons and text.
  // - Parked (fullscreen): DPR is 1.0, leading to microscopic fonts on the 1920x1140 canvas.
  // We compensate for this by defining target physical pixel sizes and dividing by the DPR.
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const physicalHeight = height * dpr;

  // Interpolate between physical heights: 750px (compact/split) to 1200px (spacious/fullscreen)
  const t = Math.max(0, Math.min(1, (physicalHeight - 750) / (1200 - 750)));

  // Target physical pixel values (how large they should actually render on screen)
  // We bump compact start sizes slightly so driving buttons/text are highly legible and tap-friendly,
  // while keeping physical sizes in check.
  const targetUiFont = 18 + t * 6;            // 18px to 24px physical
  const targetTouch = 58 + t * 14;             // 58px to 72px physical (gives bigger touch targets when compact!)
  const targetBarHeight = 90 + t * 45;         // 90px to 135px physical
  const targetIconPlayDim = 52 + t * 20;       // 52px to 72px physical
  const targetIconPlayDimBig = 64 + t * 32;    // 64px to 96px physical
  const targetHeroArt = 200 + t * 220;         // 200px to 420px physical
  const targetSidebarWidth = 160 + t * 120;    // 160px to 280px physical
  const targetCardMinWidth = 120 + t * 50;     // 120px to 170px physical (keeps album/artist cards compact when driving!)

  // Convert physical target values to CSS pixel values by dividing by the DPR
  const uiFont = Math.round(targetUiFont / dpr);
  const touch = Math.round(targetTouch / dpr);
  const barHeight = Math.round(targetBarHeight / dpr);
  const iconPlayDim = Math.round(targetIconPlayDim / dpr);
  const iconPlayDimBig = Math.round(targetIconPlayDimBig / dpr);
  const heroArt = Math.round(targetHeroArt / dpr);
  const sidebarWidth = Math.round(targetSidebarWidth / dpr);
  const cardMinWidth = Math.round(targetCardMinWidth / dpr);

  root.style.setProperty("--ui-font", `${uiFont}px`);
  root.style.setProperty("--touch", `${touch}px`);
  root.style.setProperty("--bar-height", `${barHeight}px`);
  root.style.setProperty("--icon-size", `${1.15 + t * 0.35}rem`);
  root.style.setProperty("--icon-play-size", `${1.35 + t * 0.5}rem`);
  root.style.setProperty("--icon-play-dim", `${iconPlayDim}px`);
  root.style.setProperty("--icon-play-size-big", `${1.65 + t * 0.65}rem`);
  root.style.setProperty("--icon-play-dim-big", `${iconPlayDimBig}px`);
  root.style.setProperty("--hero-art-size", `min(55vw, ${heroArt}px)`);
  root.style.setProperty("--sidebar-width", `${sidebarWidth}px`);
  root.style.setProperty("--card-min-width", `${cardMinWidth}px`);

  root.dataset.teslaViewport = physicalHeight < 850 ? "compact" : physicalHeight < 1050 ? "standard" : "spacious";
}

export function syncTeslaViewport(): void {
  const { width, height } = visibleViewport();
  if (height > 0 && width > 0) {
    applyTeslaTokens(width, height);
  }
}

/**
 * Keep layout sized to the actual browser panel. Tesla reports a much larger layout
 * viewport via svh/vh when driving, which pushes the now-playing bar off-screen.
 */
export function initTeslaViewport(): void {
  if (!isTeslaBrowser()) return;

  let raf = 0;
  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      syncTeslaViewport();
    });
  };

  syncTeslaViewport();
  window.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("scroll", schedule);
  window.addEventListener("orientationchange", schedule);
}
