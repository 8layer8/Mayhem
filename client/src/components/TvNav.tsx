import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { logout } from "../api/auth";
import { useUiConfig } from "../context/UiConfig";
import {
  GlyphDisc,
  GlyphList,
  GlyphMic,
  GlyphMusic,
  GlyphSearch,
} from "./Glyphs";
import { SwitchUserModal } from "./SwitchUserModal";

const NAV_ITEMS = [
  { to: "/", end: true, label: "Library", Icon: GlyphMusic },
  { to: "/playlists", label: "Playlists", Icon: GlyphList },
  { to: "/artists", label: "Artists", Icon: GlyphMic },
  { to: "/albums", label: "Albums", Icon: GlyphDisc },
  { to: "/search", label: "Search", Icon: GlyphSearch },
] as const;

export function TvNav({
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

  const link = ({ isActive }: { isActive: boolean }) =>
    isActive ? "tv-nav-link active" : "tv-nav-link";

  return (
    <header className="tv-nav">
      <div className="tv-nav-brand">{appTitle}</div>
      <nav className="tv-nav-links" aria-label="Main">
        {NAV_ITEMS.map(({ to, label, Icon, ...rest }) => (
          <NavLink key={to} to={to} end={"end" in rest ? rest.end : undefined} className={link}>
            <Icon className="nav-glyph" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="tv-nav-account">
        <button className="tv-nav-user" onClick={() => setSwitchOpen(true)} title="Switch user">
          <span className="user-avatar small">
            {userThumb ? <img src={userThumb} alt="" /> : <span>{(username ?? "?")[0]}</span>}
          </span>
          <span className="tv-nav-user-name">{username ?? "Account"}</span>
        </button>
        {serverName && <span className="muted small tv-nav-server">{serverName}</span>}
        <button className="btn-secondary tv-nav-signout" onClick={() => doLogout.mutate()}>
          Sign out
        </button>
      </div>
      {switchOpen && <SwitchUserModal onClose={() => setSwitchOpen(false)} />}
    </header>
  );
}
