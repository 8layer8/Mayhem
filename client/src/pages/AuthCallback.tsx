import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { pollPin } from "../api/auth";
import { useUiConfig } from "../context/UiConfig";
import { takePendingPin } from "../util/authFlow";

/**
 * Landing page after Plex redirects back from authorization. Polls until the
 * PIN is claimed, then sends the user into the app.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { appTitle } = useUiConfig();
  const [error, setError] = useState(false);
  const pollTimer = useRef<number>();

  useEffect(() => {
    const pinId = takePendingPin();
    if (!pinId) {
      setError(true);
      return;
    }

    const finish = async () => {
      window.clearInterval(pollTimer.current);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      navigate("/", { replace: true });
    };

    pollTimer.current = window.setInterval(async () => {
      try {
        const { authenticated } = await pollPin(pinId);
        if (authenticated) await finish();
      } catch {
        /* keep polling; transient errors are expected */
      }
    }, 2000);

    // Check immediately in case auth finished before this page loaded.
    pollPin(pinId)
      .then(({ authenticated }) => {
        if (authenticated) return finish();
      })
      .catch(() => {});

    return () => window.clearInterval(pollTimer.current);
  }, [navigate, queryClient]);

  if (error) {
    return (
      <div className="centered-screen">
        <div className="login-card">
          <h1 className="brand">{appTitle}</h1>
          <p className="error">Sign-in could not be completed. Please try again.</p>
          <button className="btn-primary" onClick={() => navigate("/", { replace: true })}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="centered-screen">
      <div className="login-card">
        <h1 className="brand">{appTitle}</h1>
        <p className="muted">Completing sign-in…</p>
      </div>
    </div>
  );
}
