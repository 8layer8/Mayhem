import { useEffect, useRef } from "react";
import { streamUrl } from "../api/client";
import { usePlayer } from "../store/player";
import { isTvBrowser } from "../util/tv";
import { ensureGraph } from "./audioGraph";
import { registerPlaybackBridge } from "./playbackBridge";
import { resolveMediaDuration } from "./progress";
import { shouldTranscodeForTv } from "./tvPlayback";
import { tvStreamSrc } from "./tvStream";

const READY = ["nothing", "metadata", "data", "future", "enough"];
const NETWORK = ["empty", "idle", "loading", "no source"];
const TV_LOAD_TIMEOUT_TICKS = 24;

function playInterrupted(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === "AbortError" || err.message.includes("interrupted by a new load");
}

/**
 * Headless component that owns playback. Uses two media elements so the next
 * track can be preloaded into the idle element for best-effort gapless
 * transitions: when the current track changes to one already preloaded, we swap
 * to that element instead of reloading.
 */
export function AudioEngine() {
  const videoRefs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];
  const audioRefs = [useRef<HTMLAudioElement>(null), useRef<HTMLAudioElement>(null)];
  const refs = () => (isTvBrowser() ? videoRefs : audioRefs);
  const activeIdx = useRef(0);
  const loadedKey = useRef<[string | null, string | null]>([null, null]);
  const transcodeFallback = useRef<[boolean, boolean]>([false, false]);
  const retriedMode = useRef<[boolean, boolean]>([false, false]);
  const volumeRef = useRef(1);
  const playGen = useRef(0);
  const canplayHandlers = useRef<[(() => void) | null, (() => void) | null]>([null, null]);
  const playClock = useRef<{ at: number; from: number } | null>(null);

  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const volume = usePlayer((s) => s.volume);
  const seekTo = usePlayer((s) => s.seekTo);
  const repeat = usePlayer((s) => s.repeat);
  const setProgress = usePlayer((s) => s.setProgress);
  const handleEnded = usePlayer((s) => s.handleEnded);
  const clearSeek = usePlayer((s) => s.clearSeek);
  const setPlaybackHint = usePlayer((s) => s.setPlaybackHint);

  volumeRef.current = volume;

  const current = index >= 0 ? queue[index] : undefined;
  const nextTrack =
    repeat === "one"
      ? current
      : index + 1 < queue.length
        ? queue[index + 1]
        : repeat === "all" && queue.length
          ? queue[0]
          : undefined;

  const active = () => refs()[activeIdx.current].current;
  const idle = () => refs()[activeIdx.current === 0 ? 1 : 0].current;

  const pauseAll = () => {
    refs().forEach((r, i) => {
      const el = r.current;
      if (!el) return;
      el.pause();
      const handler = canplayHandlers.current[i];
      if (handler) {
        el.removeEventListener("canplay", handler);
        canplayHandlers.current[i] = null;
      }
    });
  };

  const clearCanplay = (el: HTMLMediaElement, idx: number) => {
    const handler = canplayHandlers.current[idx];
    if (handler) {
      el.removeEventListener("canplay", handler);
      canplayHandlers.current[idx] = null;
    }
  };

  const resolveTranscode = async (ratingKey: string, transcode?: boolean): Promise<boolean> => {
    if (transcode !== undefined) return transcode;
    if (!isTvBrowser()) return false;
    return shouldTranscodeForTv(ratingKey);
  };

  const loadTrack = async (
    el: HTMLMediaElement,
    idx: number,
    ratingKey: string,
    transcode?: boolean,
    gen = playGen.current,
  ): Promise<boolean> => {
    const useTranscode = await resolveTranscode(ratingKey, transcode);
    if (gen !== playGen.current) return false;

    if (loadedKey.current[idx] === ratingKey && transcodeFallback.current[idx] === useTranscode) {
      return true;
    }

    try {
      if (isTvBrowser()) setPlaybackHint("Loading stream…");
      clearCanplay(el, idx);

      const src = isTvBrowser()
        ? await tvStreamSrc(ratingKey, useTranscode)
        : streamUrl(ratingKey, useTranscode);

      if (gen !== playGen.current) return false;

      el.src = src;
      transcodeFallback.current[idx] = useTranscode;
      loadedKey.current[idx] = ratingKey;
      setPlaybackHint(null);
      return true;
    } catch (err) {
      if (gen !== playGen.current) return false;
      const msg = err instanceof Error ? err.message : "stream load failed";
      setPlaybackHint(`Stream error: ${msg}`);
      return false;
    }
  };

  const playWhenReady = (el: HTMLMediaElement, idx: number, gen: number) => {
    clearCanplay(el, idx);

    const attempt = () => {
      if (gen !== playGen.current || !usePlayer.getState().isPlaying) return;
      ensureGraph(el);
      el.volume = volumeRef.current;
      void el
        .play()
        .then(() => {
          if (gen !== playGen.current) {
            el.pause();
            return;
          }
          playClock.current = { at: performance.now(), from: el.currentTime };
        })
        .catch((err: unknown) => {
          if (playInterrupted(err) || !isTvBrowser()) return;
          const msg = err instanceof Error ? err.message : "play() rejected";
          setPlaybackHint(`Play blocked: ${msg}`);
        });
    };

    if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      attempt();
      return;
    }

    const onReady = () => {
      clearCanplay(el, idx);
      attempt();
    };
    canplayHandlers.current[idx] = onReady;
    el.addEventListener("canplay", onReady);
  };

  const applyCurrentTrack = async () => {
    const track = usePlayer.getState().current();
    if (!track) {
      playGen.current += 1;
      pauseAll();
      playClock.current = null;
      return;
    }

    const gen = ++playGen.current;
    pauseAll();
    playClock.current = null;

    const idleIdx = activeIdx.current === 0 ? 1 : 0;
    if (loadedKey.current[idleIdx] === track.ratingKey) {
      activeIdx.current = idleIdx;
      retriedMode.current[idleIdx] = false;
    }

    const idx = activeIdx.current;
    const el = active();
    if (!el) return;

    const loaded = await loadTrack(el, idx, track.ratingKey, undefined, gen);
    if (!loaded || gen !== playGen.current) return;

    if (usePlayer.getState().isPlaying) {
      playWhenReady(el, idx, gen);
    }
  };

  const retryAlternateMode = async (el: HTMLMediaElement, idx: number, ratingKey: string) => {
    if (retriedMode.current[idx]) return;
    retriedMode.current[idx] = true;
    const flip = !transcodeFallback.current[idx];
    loadedKey.current[idx] = null;
    setPlaybackHint(flip ? "Retrying as MP3…" : "Retrying direct…");

    const gen = playGen.current;
    const loaded = await loadTrack(el, idx, ratingKey, flip, gen);
    if (!loaded || gen !== playGen.current) return;
    if (usePlayer.getState().isPlaying) playWhenReady(el, idx, gen);
  };

  const playFromGesture = (_ratingKey: string | null, playing: boolean) => {
    if (playing) return;
    playGen.current += 1;
    pauseAll();
    playClock.current = null;
  };

  useEffect(() => {
    registerPlaybackBridge({ playFromGesture });
    return () => registerPlaybackBridge(null);
  }, []);

  const onStreamError = (idx: number) => () => {
    const el = refs()[idx].current;
    const ratingKey = loadedKey.current[idx];
    if (!el || !ratingKey) return;
    const code = el.error?.code;
    const reasons = ["", "aborted", "network", "decode", "format not supported"];
    setPlaybackHint(`Playback error: ${reasons[code ?? 0] ?? `code ${code}`}`);
    void retryAlternateMode(el, idx, ratingKey);
  };

  // Single orchestration point for track / play-state changes.
  useEffect(() => {
    void applyCurrentTrack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current?.ratingKey, isPlaying]);

  useEffect(() => {
    refs().forEach((r) => {
      if (r.current) r.current.volume = volume;
    });
  }, [volume]);

  useEffect(() => {
    if (seekTo == null) return;
    const el = active();
    if (el) el.currentTime = seekTo;
    clearSeek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekTo]);

  useEffect(() => {
    if (!isTvBrowser() || !current) return;
    let ticks = 0;
    const id = window.setInterval(() => {
      const el = active();
      if (!el) return;
      ticks += 1;

      if (usePlayer.getState().isPlaying || el.currentTime > 0) {
        const track = usePlayer.getState().current();
        setProgress(
          el.currentTime > 0
            ? el.currentTime
            : playClock.current
              ? playClock.current.from +
                (performance.now() - playClock.current.at) / 1000
              : 0,
          resolveMediaDuration(el, track),
        );
        return;
      }

      const stuckLoading =
        usePlayer.getState().isPlaying &&
        el.readyState === HTMLMediaElement.HAVE_NOTHING &&
        el.networkState === HTMLMediaElement.NETWORK_LOADING;

      if (stuckLoading && ticks >= TV_LOAD_TIMEOUT_TICKS) {
        const ratingKey = loadedKey.current[activeIdx.current];
        const stuckEl = active();
        if (ratingKey && stuckEl) void retryAlternateMode(stuckEl, activeIdx.current, ratingKey);
        return;
      }

      if (usePlayer.getState().isPlaying && ticks >= 4 && !stuckLoading) {
        setPlaybackHint(
          `Stuck: ready=${READY[el.readyState] ?? el.readyState} net=${NETWORK[el.networkState] ?? el.networkState}`,
        );
      }
    }, 500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, current?.ratingKey]);

  useEffect(() => {
    if (isTvBrowser()) return;
    const el = active();
    const idleIdx = activeIdx.current === 0 ? 1 : 0;
    if (!el || !nextTrack) return;

    const preload = () => {
      const idleEl = idle();
      if (idleEl && loadedKey.current[idleIdx] !== nextTrack.ratingKey) {
        void loadTrack(idleEl, idleIdx, nextTrack.ratingKey, false);
      }
    };

    if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      preload();
      return;
    }

    el.addEventListener("canplay", preload, { once: true });
    return () => el.removeEventListener("canplay", preload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextTrack?.ratingKey, current?.ratingKey]);

  const syncProgress = (idx: number) => {
    if (idx !== activeIdx.current) return;
    const el = refs()[idx].current;
    if (!el) return;
    const track = usePlayer.getState().current();
    setProgress(el.currentTime, resolveMediaDuration(el, track));
  };

  const mediaProps = (idx: number) => ({
    className: "mayhem-media",
    preload: "auto" as const,
    playsInline: true,
    onTimeUpdate: () => syncProgress(idx),
    onLoadedMetadata: () => syncProgress(idx),
    onEnded: () => {
      if (idx !== activeIdx.current) return;
      handleEnded();
    },
    onError: onStreamError(idx),
  });

  return (
    <>
      {isTvBrowser()
        ? videoRefs.map((ref, i) => <video key={i} ref={ref} {...mediaProps(i)} />)
        : audioRefs.map((ref, i) => <audio key={i} ref={ref} {...mediaProps(i)} />)}
    </>
  );
}
