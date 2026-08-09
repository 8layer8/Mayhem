import { api } from "./client";
import type { TrackMediaInfo } from "../util/formatMedia";

export const getTrackMediaInfo = (ratingKey: string) =>
  api.get<TrackMediaInfo>(`/api/stream/${encodeURIComponent(ratingKey)}/info`);

/** Fetch a short-lived stream grant for TV media elements that omit cookies. */
export const getStreamGrant = (ratingKey: string) =>
  api.get<{ st: string }>(`/api/stream/${encodeURIComponent(ratingKey)}/grant`);
