import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { pollPin, startPin } from "../api/auth";
import { useUiConfig } from "../context/UiConfig";
import {
  navigateToPlexAuth,
  openPlexAuth,
  prefersSameTabAuth,
  storePendingPin,
} from "../util/authFlow";

/**
 * "Sign in with Plex": opens the plex.tv authorization page (popup on desktop,
 * same-tab on Tesla / TV browsers) and polls until the PIN is claimed.
 */
export function Login() {
  const queryClient = useQueryClient();
  const { appTitle } = useUiConfig();
  const [status, setStatus] = useState<"idle" | "waiting" | "error">("idle");
  const pollTimer = useRef<number>();
  const sameTab = prefersSameTabAuth();

  useEffect(() => () => window.clearInterval(pollTimer.current), []);

  const signIn = useCallback(async () => {
    setStatus("waiting");
    try {
      const { pinId, authUrl } = await startPin();
      const mode = openPlexAuth(authUrl);

      if (mode === "same-tab") {
        storePendingPin(pinId);
        navigateToPlexAuth(authUrl);
        return;
      }

      pollTimer.current = window.setInterval(async () => {
        try {
          const { authenticated } = await pollPin(pinId);
          if (authenticated) {
            window.clearInterval(pollTimer.current);
            await queryClient.invalidateQueries({ queryKey: ["me"] });
          }
        } catch {
          /* keep polling; transient errors are expected */
        }
      }, 2000);
    } catch {
      setStatus("error");
    }
  }, [queryClient]);

  return (
    <div className="centered-screen">
      <div className="login-card">
        <h1 className="brand">{appTitle}</h1>
        <p className="muted">Your Plex music library, in the browser.</p>
        <button className="btn-primary" onClick={signIn} disabled={status === "waiting"}>
          {status === "waiting" ? "Waiting for Plex…" : "Sign in with Plex"}
        </button>
        {status === "waiting" && !sameTab && (
          <p className="muted small">
            A Plex window should have opened. Authorize there, then come back —
            this page will continue automatically.
          </p>
        )}
        {status === "waiting" && sameTab && (
          <p className="muted small">Redirecting to Plex to sign in…</p>
        )}
        {status === "error" && (
          <p className="error">Something went wrong starting sign-in. Try again.</p>
        )}
      </div>
    </div>
  );
}
