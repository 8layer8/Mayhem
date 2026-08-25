import { isTeslaBrowser } from "./tv";

/** Read the visible browser panel size (parked fullscreen vs driving split-screen). */
function visibleViewport(): { width: number; height: number } {
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
function applyTeslaTokens(width: number, height: number): void {
  const root = document.documentElement;
  const h = Math.round(height);
  const w = Math.round(width);

  root.style.setProperty("--mayhem-app-height", `${h}px`);
  root.style.setProperty("--mayhem-app-width", `${w}px`);

  // 420px (driving split) → 1080px (parked fullscreen)
  const t = Math.max(0, Math.min(1, (height - 420) / (1080 - 420)));

  const uiFont = Math.round(14 + t * 5);
  const touch = Math.round(40 + t * 18);
  const barHeight = Math.round(70 + t * 30);
  const iconPlayDim = Math.round(40 + t * 20);
  const iconPlayDimBig = Math.round(48 + t * 24);
  const heroArt = Math.round(220 + t * 120);
  const sidebarWidth = Math.round(180 + t * 60);

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

  root.dataset.teslaViewport = height < 580 ? "compact" : height < 820 ? "standard" : "spacious";
}

/**
 * Keep layout sized to the actual browser panel. Tesla reports a much larger layout
 * viewport via svh/vh when driving, which pushes the now-playing bar off-screen.
 */
export function initTeslaViewport(): void {
  if (!isTeslaBrowser()) return;

  let raf = 0;
  const sync = () => {
    const { width, height } = visibleViewport();
    if (height > 0 && width > 0) {
      applyTeslaTokens(width, height);
    }
  };

  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      sync();
    });
  };

  sync();
  window.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("scroll", schedule);
  window.addEventListener("orientationchange", schedule);
}
