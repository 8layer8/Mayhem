import { useEffect } from "react";
import { artUrl } from "../api/client";
import { usePlayer } from "../store/player";

/** Wires OS / in-car media keys (e.g. Tesla browser) to the player via the Media Session API. */
export function MediaSession() {
  const current = usePlayer((s) => s.current());
  const isPlaying = usePlayer((s) => s.isPlaying);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", () => {
      usePlayer.getState().setPlaying(true);
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      usePlayer.getState().setPlaying(false);
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      usePlayer.getState().next();
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      usePlayer.getState().previous();
    });
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime == null || !Number.isFinite(details.seekTime)) return;
      usePlayer.getState().seek(details.seekTime);
    });

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("seekto", null);
    };
  }, []);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    if (!current) {
      navigator.mediaSession.metadata = null;
      return;
    }

    const artwork = artUrl(current.thumb, 512);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      album: current.album,
      artwork: artwork ? [{ src: artwork, sizes: "512x512", type: "image/jpeg" }] : [],
    });
  }, [current?.ratingKey, current?.title, current?.artist, current?.album, current?.thumb]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !current || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(position, duration),
      });
    } catch {
      /* setPositionState unsupported or invalid while seeking */
    }
  }, [current?.ratingKey, position, duration]);

  return null;
}
