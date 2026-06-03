/**
 * Lazily-created Web Audio graph shared by the audio engine and the visualizer.
 * Each <audio> element is routed: source → analyser → destination. Because the
 * stream is same-origin (served by our proxy), the analyser is not CORS-tainted
 * and can read frequency data for the visualizer.
 */
let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
const sources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

export function ensureGraph(el: HTMLMediaElement): AnalyserNode {
  if (!ctx) {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    analyser.connect(ctx.destination);
  }
  if (!sources.has(el)) {
    const node = ctx.createMediaElementSource(el);
    node.connect(analyser!);
    sources.set(el, node);
  }
  // Autoplay policy: the context may start suspended until a user gesture.
  void ctx.resume();
  return analyser!;
}

export function getAnalyser(): AnalyserNode | null {
  return analyser;
}
