import { create } from "zustand";
import type { Track } from "../api/plex";

export type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  queue: Track[];
  index: number; // current track index in queue
  isPlaying: boolean;
  position: number; // seconds
  duration: number; // seconds
  volume: number; // 0..1
  repeat: RepeatMode;
  shuffle: boolean;
  /** Pending seek target (seconds) for the audio engine to consume, or null. */
  seekTo: number | null;

  current: () => Track | undefined;
  nextTrack: () => Track | undefined;

  // intent flags consumed by the audio engine component
  playTracks: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (tracks: Track[]) => void;
  playAt: (index: number) => void;
  removeAt: (index: number) => void;
  moveInQueue: (from: number, to: number) => void;
  clearQueue: () => void;

  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  next: () => void;
  previous: () => void;
  setVolume: (v: number) => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  /** Request a seek; the audio engine applies it and clears `seekTo`. */
  seek: (seconds: number) => void;
  clearSeek: () => void;

  // updated by the audio engine
  setProgress: (position: number, duration: number) => void;
  /** Called by the engine when the current track finishes. Advances per repeat/shuffle. */
  handleEnded: () => void;
}

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  index: -1,
  isPlaying: false,
  position: 0,
  duration: 0,
  volume: 1,
  repeat: "off",
  shuffle: false,
  seekTo: null,

  current: () => {
    const { queue, index } = get();
    return index >= 0 ? queue[index] : undefined;
  },
  nextTrack: () => {
    const { queue, index, repeat } = get();
    if (repeat === "one") return queue[index];
    if (index + 1 < queue.length) return queue[index + 1];
    if (repeat === "all" && queue.length) return queue[0];
    return undefined;
  },

  playTracks: (tracks, startIndex = 0) => {
    if (!tracks.length) return;
    set({ queue: tracks, index: startIndex, isPlaying: true, position: 0 });
  },
  addToQueue: (tracks) =>
    set((s) => {
      const queue = [...s.queue, ...tracks];
      // if nothing was playing, start at the first added track
      const index = s.index < 0 ? 0 : s.index;
      const isPlaying = s.index < 0 ? true : s.isPlaying;
      return { queue, index, isPlaying };
    }),
  playAt: (index) => {
    const { queue } = get();
    if (index < 0 || index >= queue.length) return;
    set({ index, isPlaying: true, position: 0 });
  },
  removeAt: (index) =>
    set((s) => {
      const queue = s.queue.filter((_, i) => i !== index);
      let newIndex = s.index;
      if (index < s.index) newIndex -= 1;
      else if (index === s.index) newIndex = Math.min(s.index, queue.length - 1);
      return { queue, index: newIndex };
    }),
  moveInQueue: (from, to) =>
    set((s) => {
      if (from === to) return s;
      const queue = [...s.queue];
      const [moved] = queue.splice(from, 1);
      queue.splice(to, 0, moved);
      // keep the currently playing track pointed at correctly
      let index = s.index;
      if (from === s.index) index = to;
      else if (from < s.index && to >= s.index) index -= 1;
      else if (from > s.index && to <= s.index) index += 1;
      return { queue, index };
    }),
  clearQueue: () => set({ queue: [], index: -1, isPlaying: false, position: 0 }),

  togglePlay: () => set((s) => (s.index >= 0 ? { isPlaying: !s.isPlaying } : {})),
  setPlaying: (playing) => set({ isPlaying: playing }),
  next: () => {
    const { queue, index, repeat } = get();
    if (index + 1 < queue.length) set({ index: index + 1, position: 0, isPlaying: true });
    else if (repeat === "all" && queue.length) set({ index: 0, position: 0, isPlaying: true });
  },
  previous: () => {
    const { index, position } = get();
    // restart current track if more than 3s in, else go to previous
    if (position > 3) {
      set({ seekTo: 0 });
    } else if (index > 0) {
      set({ index: index - 1, position: 0, isPlaying: true });
    } else {
      set({ seekTo: 0 });
    }
  },
  setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),
  cycleRepeat: () =>
    set((s) => ({
      repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off",
    })),
  seek: (seconds) => set({ seekTo: Math.max(0, seconds) }),
  clearSeek: () => set({ seekTo: null }),
  toggleShuffle: () =>
    set((s) => {
      if (s.queue.length <= 1) return { shuffle: !s.shuffle };
      if (!s.shuffle) {
        // shuffle remaining tracks after the current one
        const before = s.queue.slice(0, s.index + 1);
        const after = s.queue.slice(s.index + 1);
        for (let i = after.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [after[i], after[j]] = [after[j], after[i]];
        }
        return { shuffle: true, queue: [...before, ...after] };
      }
      return { shuffle: false };
    }),

  setProgress: (position, duration) => set({ position, duration }),
  handleEnded: () => {
    const { queue, index, repeat } = get();
    if (repeat === "one") {
      set({ position: 0, isPlaying: true });
      return;
    }
    if (index + 1 < queue.length) {
      set({ index: index + 1, position: 0, isPlaying: true });
    } else if (repeat === "all" && queue.length) {
      set({ index: 0, position: 0, isPlaying: true });
    } else {
      set({ isPlaying: false, position: 0 });
    }
  },
}));
