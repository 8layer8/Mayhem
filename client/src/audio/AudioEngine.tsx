import { useEffect, useRef } from "react";
import { streamUrl } from "../api/client";
import { usePlayer } from "../store/player";
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
      if (el) {
        el.src = streamUrl(current.ratingKey);
        el.load();
        loadedKey.current[activeIdx.current] = current.ratingKey;
      }
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

  // Preload the next track into the idle element.
  useEffect(() => {
    const idleEl = idle();
    const idleIdx = activeIdx.current === 0 ? 1 : 0;
    if (nextTrack && idleEl && loadedKey.current[idleIdx] !== nextTrack.ratingKey) {
      idleEl.src = streamUrl(nextTrack.ratingKey);
      idleEl.load();
      loadedKey.current[idleIdx] = nextTrack.ratingKey;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextTrack?.ratingKey, current?.ratingKey]);

  const onTimeUpdate = (idx: number) => () => {
    if (idx !== activeIdx.current) return;
    const el = refs[idx].current;
    if (el) setProgress(el.currentTime, el.duration || 0);
  };
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
          onTimeUpdate={onTimeUpdate(idx)}
          onEnded={onEnded(idx)}
        />
      ))}
    </>
  );
}
