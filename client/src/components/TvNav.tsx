import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type RefObject } from "react";
import { NavLink } from "react-router-dom";
import { logout } from "../api/auth";
import { useUiConfig } from "../context/UiConfig";

/** Pure-CSS nav icons (classes defined in styles.css). */
function NavIcon({ glyph }: { glyph: string }) {
  return <span className={`glyph glyph-${glyph} nav-glyph`} aria-hidden />;
}

const NAV_ITEMS = [
  { to: "/", end: true, label: "Library", glyph: "music" },
  { to: "/playlists", label: "Playlists", glyph: "list" },
  { to: "/artists", label: "Artists", glyph: "mic" },
  { to: "/albums", label: "Albums", glyph: "disc" },
  { to: "/search", label: "Search", glyph: "search" },
] as const;

export function TvNav({
  username,
  userThumb,
  serverName,
  userButtonRef,
  onSwitchOpen,
}: {
  username?: string | null;
  userThumb?: string | null;
  serverName?: string | null;
  userButtonRef?: RefObject<HTMLButtonElement | null>;
  onSwitchOpen?: () => void;
}) {
  const queryClient = useQueryClient();
  const { appTitle } = useUiConfig();
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
        {NAV_ITEMS.map(({ to, label, glyph, ...rest }) => (
          <NavLink key={to} to={to} end={"end" in rest ? rest.end : undefined} className={link}>
            <NavIcon glyph={glyph} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="tv-nav-account">
        <button
          ref={userButtonRef}
          className="tv-nav-user"
          onClick={() => onSwitchOpen?.()}
          title="Switch user"
        >
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
    </header>
  );
}
