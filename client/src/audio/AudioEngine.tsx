import { useEffect, useRef } from "react";
import { streamUrl } from "../api/client";
import { usePlayer } from "../store/player";
import { isTvBrowser } from "../util/tv";
import { ensureGraph } from "./audioGraph";

/**
 * Headless component that owns playback. Uses two <audio> elements so the next
 * track can be preloaded into the idle element for best-effort gapless
 * transitions: when the current track changes to one already preloaded, we swap
 * to that element instead of reloading.
 */
export function AudioEngine() {
  const refs = [useRef<HTMLAudioElement>(null), useRef<HTMLAudioElement>(null)];
  const activeIdx = useRef(0);
  const loadedKey = useRef<[string | null, string | null]>([null, null]);
  const transcodeFallback = useRef<[boolean, boolean]>([false, false]);

  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const volume = usePlayer((s) => s.volume);
  const seekTo = usePlayer((s) => s.seekTo);
  const repeat = usePlayer((s) => s.repeat);
  const setProgress = usePlayer((s) => s.setProgress);
  const handleEnded = usePlayer((s) => s.handleEnded);
  const clearSeek = usePlayer((s) => s.clearSeek);

  const current = index >= 0 ? queue[index] : undefined;
  const nextTrack =
    repeat === "one"
      ? current
      : index + 1 < queue.length
        ? queue[index + 1]
        : repeat === "all" && queue.length
          ? queue[0]
          : undefined;

  const active = () => refs[activeIdx.current].current;
  const idle = () => refs[activeIdx.current === 0 ? 1 : 0].current;

  const loadTrack = (el: HTMLAudioElement, idx: number, ratingKey: string, transcode = false) => {
    loadedKey.current[idx] = ratingKey;
    transcodeFallback.current[idx] = transcode;
    el.src = streamUrl(ratingKey, transcode);
    el.load();
  };

  const onStreamError = (idx: number) => () => {
    const el = refs[idx].current;
    const ratingKey = loadedKey.current[idx];
    if (!el || !ratingKey || transcodeFallback.current[idx]) return;
    loadTrack(el, idx, ratingKey, true);
    if (idx === activeIdx.current && isPlaying) void el.play().catch(() => undefined);
  };

  // Load + play the current track (swapping to a preloaded element if possible).
  useEffect(() => {
    if (!current) {
      refs.forEach((r) => r.current?.pause());
      return;
    }
    const idleIdx = activeIdx.current === 0 ? 1 : 0;
    if (loadedKey.current[idleIdx] === current.ratingKey) {
      // Already preloaded in the idle element — swap to it (near-gapless).
      active()?.pause();
      activeIdx.current = idleIdx;
    } else if (loadedKey.current[activeIdx.current] !== current.ratingKey) {
      const el = active();
      if (el) loadTrack(el, activeIdx.current, current.ratingKey);
    }
    const el = active();
    if (el) {
      ensureGraph(el);
      el.volume = volume;
      if (isPlaying) void el.play().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.ratingKey]);

  // Play / pause the active element.
  useEffect(() => {
    const el = active();
    if (!el || !current) return;
    if (isPlaying) {
      ensureGraph(el);
      void el.play().catch(() => undefined);
    } else {
      el.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // Volume.
  useEffect(() => {
    refs.forEach((r) => {
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

  // TV browsers: play() from React effects often loses the user-gesture context.
  // Retry on the bubbling click/keydown that triggered the state change.
  useEffect(() => {
    if (!isTvBrowser()) return;
    const retryPlay = () => {
      const el = active();
      if (!el || !usePlayer.getState().isPlaying || !el.paused) return;
      void el.play().catch(() => undefined);
    };
    document.addEventListener("click", retryPlay);
    document.addEventListener("keydown", retryPlay);
    return () => {
      document.removeEventListener("click", retryPlay);
      document.removeEventListener("keydown", retryPlay);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TV browsers: timeupdate is unreliable; poll while playing.
  useEffect(() => {
    if (!isTvBrowser() || !isPlaying || !current) return;
    const id = window.setInterval(() => {
      const el = active();
      if (el && !el.paused) setProgress(el.currentTime, el.duration || 0);
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
        loadTrack(idleEl, idleIdx, nextTrack.ratingKey);
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
    const el = refs[idx].current;
    if (el) setProgress(el.currentTime, el.duration || 0);
  };
  const onTimeUpdate = (idx: number) => () => syncProgress(idx);
  const onLoadedMetadata = (idx: number) => () => syncProgress(idx);
  const onEnded = (idx: number) => () => {
    if (idx !== activeIdx.current) return;
    handleEnded();
  };

  return (
    <>
      {refs.map((ref, idx) => (
        <audio
          key={idx}
          ref={ref}
          preload="auto"
          playsInline
          onTimeUpdate={onTimeUpdate(idx)}
          onLoadedMetadata={onLoadedMetadata(idx)}
          onEnded={onEnded(idx)}
          onError={onStreamError(idx)}
        />
      ))}
    </>
  );
}
