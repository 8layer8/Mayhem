import { useEffect, useRef } from "react";
import { getAnalyser } from "../audio/audioGraph";

/**
 * Frequency-bar visualizer driven by the shared Web Audio AnalyserNode. Renders
 * nothing audible — just reads the current playback's frequency data each frame.
 */
export function Visualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const render = () => {
      raf = requestAnimationFrame(render);
      const analyser = getAnalyser();
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      if (!analyser) return;

      const bins = analyser.frequencyBinCount;
      const data = new Uint8Array(bins);
      analyser.getByteFrequencyData(data);

      const barCount = 64;
      const step = Math.floor(bins / barCount);
      const barWidth = width / barCount;
      for (let i = 0; i < barCount; i++) {
        const value = data[i * step] / 255;
        const barHeight = value * height;
        const hue = 200 + (i / barCount) * 100;
        ctx.fillStyle = `hsl(${hue}, 80%, ${30 + value * 40}%)`;
        ctx.fillRect(i * barWidth + 1, height - barHeight, barWidth - 2, barHeight);
      }
    };
    render();

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="visualizer" />;
}
