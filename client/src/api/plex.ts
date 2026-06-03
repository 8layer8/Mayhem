import { api } from "./client";

/** Raw Plex metadata shape (only the fields we use). */
interface RawMetadata {
  ratingKey: string;
  key?: string;
  type: string;
  title: string;
  titleSort?: string;
  grandparentTitle?: string;
  parentTitle?: string;
  parentRatingKey?: string;
  grandparentRatingKey?: string;
  thumb?: string;
  parentThumb?: string;
  grandparentThumb?: string;
  composite?: string;
  art?: string;
  duration?: number;
  index?: number;
  year?: number;
  leafCount?: number;
  playlistItemID?: number;
}

interface MediaContainer<T> {
  MediaContainer: {
    size: number;
    title1?: string;
    title2?: string;
    Directory?: T[];
    Metadata?: T[];
    Hub?: Array<{ type: string; Metadata?: T[] }>;
  };
}

export interface MusicSection {
  key: string;
  title: string;
}

export interface Artist {
  ratingKey: string;
  title: string;
  thumb?: string;
}

export interface Album {
  ratingKey: string;
  title: string;
  artist?: string;
  year?: number;
  thumb?: string;
  trackCount?: number;
}

export interface Track {
  ratingKey: string;
  title: string;
  artist: string;
  album: string;
  albumRatingKey?: string;
  duration: number; // ms
  trackNumber?: number;
  thumb?: string;
  /** Present only for tracks fetched as playlist items; needed to reorder/remove. */
  playlistItemID?: number;
}

export interface Playlist {
  ratingKey: string;
  title: string;
  thumb?: string;
  trackCount?: number;
}

function toTrack(m: RawMetadata): Track {
  return {
    ratingKey: m.ratingKey,
    title: m.title,
    artist: m.grandparentTitle ?? "",
    album: m.parentTitle ?? "",
    albumRatingKey: m.parentRatingKey,
    duration: m.duration ?? 0,
    trackNumber: m.index,
    thumb: m.parentThumb ?? m.thumb ?? m.grandparentThumb,
    playlistItemID: m.playlistItemID,
  };
}

function toAlbum(m: RawMetadata): Album {
  return {
    ratingKey: m.ratingKey,
    title: m.title,
    artist: m.parentTitle ?? m.grandparentTitle,
    year: m.year,
    thumb: m.thumb ?? m.parentThumb,
    trackCount: m.leafCount,
  };
}

/** Music libraries (Plex calls these "artist" type sections). */
export async function getMusicSections(): Promise<MusicSection[]> {
  const data = await api.get<MediaContainer<RawMetadata>>("/api/plex/library/sections");
  return (data.MediaContainer.Directory ?? [])
    .filter((d) => d.type === "artist")
    .map((d) => ({ key: d.key ?? d.ratingKey, title: d.title }));
}

export async function getArtists(sectionId: string): Promise<Artist[]> {
  const data = await api.get<MediaContainer<RawMetadata>>(
    `/api/plex/library/sections/${sectionId}/all?type=8`,
  );
  return (data.MediaContainer.Metadata ?? []).map((m) => ({
    ratingKey: m.ratingKey,
    title: m.title,
    thumb: m.thumb,
  }));
}

export async function getRecentAlbums(sectionId: string): Promise<Album[]> {
  const data = await api.get<MediaContainer<RawMetadata>>(
    `/api/plex/library/sections/${sectionId}/all?type=9&sort=addedAt:desc&limit=50`,
  );
  return (data.MediaContainer.Metadata ?? []).map(toAlbum);
}

export async function getArtistAlbums(artistRatingKey: string): Promise<Album[]> {
  const data = await api.get<MediaContainer<RawMetadata>>(
    `/api/plex/library/metadata/${artistRatingKey}/children`,
  );
  return (data.MediaContainer.Metadata ?? []).map(toAlbum);
}

export async function getAlbumTracks(albumRatingKey: string): Promise<Track[]> {
  const data = await api.get<MediaContainer<RawMetadata>>(
    `/api/plex/library/metadata/${albumRatingKey}/children`,
  );
  return (data.MediaContainer.Metadata ?? []).map(toTrack);
}

export async function getAlbum(albumRatingKey: string): Promise<Album | null> {
  const data = await api.get<MediaContainer<RawMetadata>>(
    `/api/plex/library/metadata/${albumRatingKey}`,
  );
  const m = data.MediaContainer.Metadata?.[0];
  return m ? toAlbum(m) : null;
}

export async function getPlaylists(): Promise<Playlist[]> {
  const data = await api.get<MediaContainer<RawMetadata>>(
    "/api/plex/playlists?playlistType=audio",
  );
  return (data.MediaContainer.Metadata ?? []).map((m) => ({
    ratingKey: m.ratingKey,
    title: m.title,
    thumb: m.thumb ?? m.composite,
    trackCount: m.leafCount,
  }));
}

export async function getPlaylistTracks(playlistRatingKey: string): Promise<Track[]> {
  const data = await api.get<MediaContainer<RawMetadata>>(
    `/api/plex/playlists/${playlistRatingKey}/items`,
  );
  return (data.MediaContainer.Metadata ?? []).map(toTrack);
}

export interface SearchResults {
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
}

export async function search(query: string): Promise<SearchResults> {
  const data = await api.get<MediaContainer<RawMetadata>>(
    `/api/plex/hubs/search?query=${encodeURIComponent(query)}&limit=30`,
  );
  const hubs = data.MediaContainer.Hub ?? [];
  const byType = (t: string) => hubs.find((h) => h.type === t)?.Metadata ?? [];
  return {
    artists: byType("artist").map((m) => ({
      ratingKey: m.ratingKey,
      title: m.title,
      thumb: m.thumb,
    })),
    albums: byType("album").map(toAlbum),
    tracks: byType("track").map(toTrack),
  };
}
