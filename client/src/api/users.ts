import { api } from "./client";

export interface HomeUser {
  id: number;
  uuid: string;
  title: string;
  thumb?: string;
  admin: boolean;
  protected: boolean;
}

export const listUsers = () =>
  api.get<{ currentUuid: string | null; users: HomeUser[] }>("/api/users");

export const switchUser = (uuid: string, pin?: string) =>
  api.post<{ ok: boolean; serverCleared: boolean }>("/api/users/switch", { uuid, pin });
