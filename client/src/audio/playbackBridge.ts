/**
 * Lets the player store start/stop media synchronously inside a user-gesture
 * handler. React effects run too late on many TV browsers (gesture is gone).
 */
export type PlaybackBridge = {
  playFromGesture: (ratingKey: string | null, playing: boolean) => void;
};

let bridge: PlaybackBridge | null = null;

export function registerPlaybackBridge(next: PlaybackBridge | null): void {
  bridge = next;
}

export function playFromGesture(ratingKey: string | null, playing: boolean): void {
  bridge?.playFromGesture(ratingKey, playing);
}
