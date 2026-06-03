import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { addToPlaylist, createPlaylist } from "../api/playlists";
import { getPlaylists, type Track } from "../api/plex";

/** Dropdown that adds the given tracks to an existing or new playlist. */
export function AddToPlaylist({ tracks, label = "Add to playlist…" }: { tracks: Track[]; label?: string }) {
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

  return (
    <div className="add-to-playlist">
      <button className="btn-secondary" onClick={() => setOpen((v) => !v)}>
        {label}
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
            ＋ New playlist…
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
