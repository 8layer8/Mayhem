import { api } from "./client";
import type { TrackMediaInfo } from "../util/formatMedia";

export const getTrackMediaInfo = (ratingKey: string) =>
  api.get<TrackMediaInfo>(`/api/stream/${encodeURIComponent(ratingKey)}/info`);
