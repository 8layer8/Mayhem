import { create } from "zustand";
import type { Track } from "../api/plex";
import { playFromGesture } from "../audio/playbackBridge";

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
  /** Set when playback started from a playlist; enables remove-from-playlist in the player. */
  sourcePlaylistId: string | null;
  /** Pending seek target (seconds) for the audio engine to consume, or null. */
  seekTo: number | null;
  /** Last playback error hint (shown on TV for debugging). */
  playbackHint: string | null;

  current: () => Track | undefined;
  nextTrack: () => Track | undefined;

  // intent flags consumed by the audio engine component
  playTracks: (tracks: Track[], startIndex?: number, sourcePlaylistId?: string | null) => void;
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
  setPlaybackHint: (hint: string | null) => void;

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
  sourcePlaylistId: null,
  seekTo: null,
  playbackHint: null,

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

  playTracks: (tracks, startIndex = 0, sourcePlaylistId = null) => {
    if (!tracks.length) return;
    const index = startIndex;
    set({
      queue: tracks,
      index,
      isPlaying: true,
      position: 0,
      sourcePlaylistId: sourcePlaylistId ?? null,
    });
    playFromGesture(tracks[index]?.ratingKey ?? null, true);
  },
  addToQueue: (tracks) =>
    set((s) => {
      const queue = [...s.queue, ...tracks];
      const index = s.index < 0 ? 0 : s.index;
      const isPlaying = s.index < 0 ? true : s.isPlaying;
      if (s.index < 0 && tracks.length) {
        playFromGesture(tracks[0]?.ratingKey ?? null, true);
      }
      return { queue, index, isPlaying };
    }),
  playAt: (index) => {
    const { queue } = get();
    if (index < 0 || index >= queue.length) return;
    set({ index, isPlaying: true, position: 0 });
    playFromGesture(queue[index]?.ratingKey ?? null, true);
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
  clearQueue: () =>
    set({ queue: [], index: -1, isPlaying: false, position: 0, sourcePlaylistId: null }),

  togglePlay: () =>
    set((s) => {
      if (s.index < 0) return {};
      const isPlaying = !s.isPlaying;
      playFromGesture(s.queue[s.index]?.ratingKey ?? null, isPlaying);
      return { isPlaying };
    }),
  setPlaying: (playing) => {
    const { queue, index } = get();
    set({ isPlaying: playing });
    if (index >= 0) playFromGesture(queue[index]?.ratingKey ?? null, playing);
  },
  next: () => {
    const { queue, index, repeat } = get();
    if (index + 1 < queue.length) {
      const nextIndex = index + 1;
      set({ index: nextIndex, position: 0, isPlaying: true });
      playFromGesture(queue[nextIndex]?.ratingKey ?? null, true);
    } else if (repeat === "all" && queue.length) {
      set({ index: 0, position: 0, isPlaying: true });
      playFromGesture(queue[0]?.ratingKey ?? null, true);
    }
  },
  previous: () => {
    const { queue, index, position } = get();
    if (position > 3) {
      set({ seekTo: 0 });
      playFromGesture(queue[index]?.ratingKey ?? null, true);
    } else if (index > 0) {
      const prevIndex = index - 1;
      set({ index: prevIndex, position: 0, isPlaying: true });
      playFromGesture(queue[prevIndex]?.ratingKey ?? null, true);
    } else {
      set({ seekTo: 0 });
      playFromGesture(queue[index]?.ratingKey ?? null, true);
    }
  },
  setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),
  cycleRepeat: () =>
    set((s) => ({
      repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off",
    })),
  seek: (seconds) => set({ seekTo: Math.max(0, seconds) }),
  clearSeek: () => set({ seekTo: null }),
  setPlaybackHint: (hint) => set({ playbackHint: hint }),
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
