import { useEffect, useRef } from "react";
import { streamUrl } from "../api/client";
import { usePlayer } from "../store/player";
import { isTvBrowser } from "../util/tv";
import { ensureGraph } from "./audioGraph";
import { registerPlaybackBridge } from "./playbackBridge";
import { tvStreamSrc } from "./tvStream";

const READY = ["nothing", "metadata", "data", "future", "enough"];
const NETWORK = ["empty", "idle", "loading", "no source"];

/**
 * Headless component that owns playback. Uses two media elements so the next
 * track can be preloaded into the idle element for best-effort gapless
 * transitions: when the current track changes to one already preloaded, we swap
 * to that element instead of reloading.
 *
 * TV browsers use <video> with cookie-less stream grants — many Smart TV engines
 * omit session cookies on media src requests and only decode through video.
 */
export function AudioEngine() {
  const videoRefs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];
  const audioRefs = [useRef<HTMLAudioElement>(null), useRef<HTMLAudioElement>(null)];
  const refs = () => (isTvBrowser() ? videoRefs : audioRefs);
  const activeIdx = useRef(0);
  const loadedKey = useRef<[string | null, string | null]>([null, null]);
  const transcodeFallback = useRef<[boolean, boolean]>([false, false]);
  const volumeRef = useRef(1);
  const loadGen = useRef(0);

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

  const defaultTranscode = () => isTvBrowser();

  const loadTrack = async (
    el: HTMLMediaElement,
    idx: number,
    ratingKey: string,
    transcode = defaultTranscode(),
  ): Promise<void> => {
    const gen = ++loadGen.current;
    loadedKey.current[idx] = ratingKey;
    transcodeFallback.current[idx] = transcode;

    try {
      if (isTvBrowser()) {
        setPlaybackHint("Loading stream…");
        el.src = await tvStreamSrc(ratingKey, transcode);
      } else {
        el.src = streamUrl(ratingKey, transcode);
      }
      if (gen !== loadGen.current) return;
      el.load();
      setPlaybackHint(null);
    } catch (err) {
      if (gen !== loadGen.current) return;
      const msg = err instanceof Error ? err.message : "stream load failed";
      setPlaybackHint(`Stream error: ${msg}`);
    }
  };

  const startPlayback = (el: HTMLMediaElement) => {
    ensureGraph(el);
    el.volume = volumeRef.current;
    void el.play().catch((err: unknown) => {
      if (!isTvBrowser()) return;
      const msg = err instanceof Error ? err.message : "play() rejected";
      setPlaybackHint(`Play blocked: ${msg}`);
    });
  };

  const playFromGesture = (ratingKey: string | null, playing: boolean) => {
    void (async () => {
      const el = active();
      if (!el) return;
      if (ratingKey && loadedKey.current[activeIdx.current] !== ratingKey) {
        await loadTrack(el, activeIdx.current, ratingKey);
      }
      if (playing) startPlayback(el);
      else el.pause();
    })();
  };

  useEffect(() => {
    registerPlaybackBridge({ playFromGesture });
    return () => registerPlaybackBridge(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onStreamError = (idx: number) => () => {
    const el = refs()[idx].current;
    const ratingKey = loadedKey.current[idx];
    if (!el || !ratingKey) return;
    const code = el.error?.code;
    const reasons = ["", "aborted", "network", "decode", "format not supported"];
    setPlaybackHint(`Playback error: ${reasons[code ?? 0] ?? `code ${code}`}`);
    if (transcodeFallback.current[idx]) return;
    void loadTrack(el, idx, ratingKey, true).then(() => {
      if (idx === activeIdx.current && usePlayer.getState().isPlaying) startPlayback(el);
    });
  };

  // Load + play the current track (swapping to a preloaded element if possible).
  useEffect(() => {
    if (!current) {
      refs().forEach((r) => r.current?.pause());
      return;
    }
    const idleIdx = activeIdx.current === 0 ? 1 : 0;
    if (loadedKey.current[idleIdx] === current.ratingKey) {
      active()?.pause();
      activeIdx.current = idleIdx;
    } else if (loadedKey.current[activeIdx.current] !== current.ratingKey) {
      const el = active();
      if (el) void loadTrack(el, activeIdx.current, current.ratingKey);
    }
    const el = active();
    if (el && isPlaying) startPlayback(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.ratingKey]);

  // Play / pause the active element.
  useEffect(() => {
    const el = active();
    if (!el || !current) return;
    if (isPlaying) startPlayback(el);
    else el.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // Volume.
  useEffect(() => {
    refs().forEach((r) => {
      if (r.current) r.current.volume = volume;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume]);

  // Seek requests.
  useEffect(() => {
    if (seekTo == null) return;
    const el = active();
    if (el) el.currentTime = seekTo;
    clearSeek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekTo]);

  // Start once enough data is buffered (gesture play() often runs before canplay).
  useEffect(() => {
    const el = active();
    if (!el || !isPlaying || !current) return;
    const tryPlay = () => {
      if (usePlayer.getState().isPlaying && el.paused) startPlayback(el);
    };
    el.addEventListener("canplay", tryPlay);
    if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) tryPlay();
    return () => el.removeEventListener("canplay", tryPlay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, current?.ratingKey]);

  // TV: poll progress and surface stuck-state diagnostics.
  useEffect(() => {
    if (!isTvBrowser() || !current) return;
    let ticks = 0;
    const id = window.setInterval(() => {
      const el = active();
      if (!el) return;
      ticks += 1;

      if (!el.paused || el.currentTime > 0) {
        setProgress(el.currentTime, el.duration || 0);
        return;
      }

      if (usePlayer.getState().isPlaying && ticks >= 4) {
        setPlaybackHint(
          `Stuck: ready=${READY[el.readyState] ?? el.readyState} net=${NETWORK[el.networkState] ?? el.networkState}`,
        );
      }
    }, 500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, current?.ratingKey]);

  // Preload the next track after the current one can play (avoids competing downloads).
  useEffect(() => {
    const el = active();
    const idleIdx = activeIdx.current === 0 ? 1 : 0;
    if (!el || !nextTrack) return;

    const preload = () => {
      const idleEl = idle();
      if (idleEl && loadedKey.current[idleIdx] !== nextTrack.ratingKey) {
        void loadTrack(idleEl, idleIdx, nextTrack.ratingKey);
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
    if (el) setProgress(el.currentTime, el.duration || 0);
  };
  const onTimeUpdate = (idx: number) => () => syncProgress(idx);
  const onLoadedMetadata = (idx: number) => () => syncProgress(idx);
  const onEnded = (idx: number) => () => {
    if (idx !== activeIdx.current) return;
    handleEnded();
  };

  const mediaProps = (idx: number) => ({
    className: "mayhem-media",
    preload: "auto" as const,
    playsInline: true,
    onTimeUpdate: onTimeUpdate(idx),
    onLoadedMetadata: onLoadedMetadata(idx),
    onEnded: onEnded(idx),
    onError: onStreamError(idx),
  });

  return (
    <>
      {isTvBrowser()
        ? videoRefs.map((ref, idx) => <video key={idx} ref={ref} {...mediaProps(idx)} />)
        : audioRefs.map((ref, idx) => <audio key={idx} ref={ref} {...mediaProps(idx)} />)}
    </>
  );
}
