import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { logout } from "../api/auth";
import { useUiConfig } from "../context/UiConfig";
import { SwitchUserModal } from "./SwitchUserModal";

export function Sidebar({
  username,
  userThumb,
  serverName,
}: {
  username?: string | null;
  userThumb?: string | null;
  serverName?: string | null;
}) {
  const queryClient = useQueryClient();
  const { appTitle } = useUiConfig();
  const [switchOpen, setSwitchOpen] = useState(false);
  const doLogout = useMutation({
    mutationFn: logout,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  const link = ({ isActive }: { isActive: boolean }) => (isActive ? "nav-link active" : "nav-link");

  return (
    <nav className="sidebar">
      <div className="brand-small">{appTitle}</div>
      <ul className="nav">
        <li>
          <NavLink to="/" end className={link}>
            🎵 Library
          </NavLink>
        </li>
        <li>
          <NavLink to="/artists" className={link}>
            🎤 Artists
          </NavLink>
        </li>
        <li>
          <NavLink to="/albums" className={link}>
            💿 Albums
          </NavLink>
        </li>
        <li>
          <NavLink to="/search" className={link}>
            🔍 Search
          </NavLink>
        </li>
        <li>
          <NavLink to="/playlists" className={link}>
            📜 Playlists
          </NavLink>
        </li>
      </ul>

      <div className="sidebar-footer">
        <button className="user-button" onClick={() => setSwitchOpen(true)} title="Switch user">
          <span className="user-avatar small">
            {userThumb ? <img src={userThumb} alt="" /> : <span>{(username ?? "?")[0]}</span>}
          </span>
          <span className="user-button-text">
            <span className="user-button-name">{username ?? "Account"}</span>
            <span className="muted small">Switch user</span>
          </span>
        </button>
        {serverName && <div className="muted small server-line">{serverName}</div>}
        <button className="btn-secondary full" onClick={() => doLogout.mutate()}>
          Sign out
        </button>
      </div>

      {switchOpen && <SwitchUserModal onClose={() => setSwitchOpen(false)} />}
    </nav>
  );
}
