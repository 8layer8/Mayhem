import { api } from "./client";

export const createPlaylist = (title: string, trackKeys: string[]) =>
  api.post("/api/playlists", { title, trackKeys });

export const addToPlaylist = (playlistId: string, trackKeys: string[]) =>
  api.post(`/api/playlists/${playlistId}/items`, { trackKeys });

export const removePlaylistItem = (playlistId: string, itemId: number) =>
  api.del(`/api/playlists/${playlistId}/items/${itemId}`);

export const movePlaylistItem = (playlistId: string, itemId: number, after?: number) =>
  api.put(`/api/playlists/${playlistId}/items/${itemId}/move`, after ? { after: String(after) } : {});

export const deletePlaylist = (playlistId: string) => api.del(`/api/playlists/${playlistId}`);
