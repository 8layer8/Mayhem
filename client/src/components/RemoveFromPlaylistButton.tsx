import { useMutation, useQueryClient } from "@tanstack/react-query";
import { removePlaylistItem } from "../api/playlists";
import { usePlayer } from "../store/player";
import { GlyphClose } from "./Glyphs";

/** Removes the current track from the source playlist and the play queue. */
export function RemoveFromPlaylistButton({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const sourcePlaylistId = usePlayer((s) => s.sourcePlaylistId);
  const index = usePlayer((s) => s.index);
  const current = usePlayer((s) => s.current());
  const removeAt = usePlayer((s) => s.removeAt);

  const remove = useMutation({
    mutationFn: (itemId: number) => removePlaylistItem(sourcePlaylistId!, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist-tracks", sourcePlaylistId] });
      removeAt(index);
    },
  });

  if (!sourcePlaylistId || current?.playlistItemID == null) return null;

  return (
    <button
      type="button"
      className={["np-track-action", className].filter(Boolean).join(" ")}
      title="Remove from playlist"
      disabled={remove.isPending}
      onClick={(e) => {
        e.stopPropagation();
        remove.mutate(current.playlistItemID!);
      }}
    >
      <GlyphClose />
    </button>
  );
}
