import { api } from "./client";

export interface MeResponse {
  authenticated: boolean;
  username?: string | null;
  userThumb?: string | null;
  server?: { machineId: string; name: string } | null;
}

export interface ServerSummary {
  name: string;
  machineId: string;
  owned: boolean;
}

export const getMe = () => api.get<MeResponse>("/api/auth/me");

export const startPin = () =>
  api.post<{ pinId: number; authUrl: string }>("/api/auth/pin");

export const pollPin = (pinId: number) =>
  api.get<{ authenticated: boolean }>(`/api/auth/pin/${pinId}`);

export const logout = () => api.post("/api/auth/logout");

export const listServers = () =>
  api.get<{ selected: string | null; servers: ServerSummary[] }>("/api/servers");

export const selectServer = (machineId: string) =>
  api.post<{ ok: boolean; name: string }>("/api/servers/select", { machineId });
