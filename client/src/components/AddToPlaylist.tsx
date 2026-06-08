import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { addToPlaylist, createPlaylist } from "../api/playlists";
import { getPlaylists, type Track } from "../api/plex";
import { GlyphPlus } from "./Glyphs";

/** Dropdown that adds the given tracks to an existing or new playlist. */
export function AddToPlaylist({
  tracks,
  label = "Add to playlist…",
  variant = "default",
  className,
}: {
  tracks: Track[];
  label?: string;
  variant?: "default" | "compact";
  className?: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const trackKeys = tracks.map((t) => t.ratingKey);

  const { data: playlists } = useQuery({
    queryKey: ["playlists"],
    queryFn: getPlaylists,
    enabled: open,
  });

  const add = useMutation({
    mutationFn: (playlistId: string) => addToPlaylist(playlistId, trackKeys),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      setOpen(false);
    },
  });

  const create = useMutation({
    mutationFn: (title: string) => createPlaylist(title, trackKeys),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      setOpen(false);
    },
  });

  if (!tracks.length) return null;

  const isCompact = variant === "compact";

  return (
    <div
      className={["add-to-playlist", isCompact && "compact", className].filter(Boolean).join(" ")}
    >
      <button
        type="button"
        className={isCompact ? "np-track-action" : "btn-secondary"}
        title={isCompact ? "Add to playlist" : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {isCompact ? <GlyphPlus /> : label}
      </button>
      {open && (
        <div className="dropdown">
          <button
            className="dropdown-item"
            onClick={() => {
              const title = window.prompt("New playlist name?");
              if (title) create.mutate(title);
            }}
          >
            <GlyphPlus className="dropdown-item-icon" /> New playlist…
          </button>
          <div className="dropdown-divider" />
          {playlists?.map((p) => (
            <button key={p.ratingKey} className="dropdown-item" onClick={() => add.mutate(p.ratingKey)}>
              {p.title}
            </button>
          ))}
          {playlists && playlists.length === 0 && (
            <div className="dropdown-item muted">No playlists yet</div>
          )}
        </div>
      )}
    </div>
  );
}
