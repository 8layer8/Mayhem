import { useEffect } from "react";
import { useUiConfig } from "../context/UiConfig";

/**
 * Legacy SPA callback route. Immediately hands off to the server-side callback
 * which sets the session cookie on redirect (required for WebView / Tesla).
 */
export function AuthCallback() {
  const { appTitle } = useUiConfig();

  useEffect(() => {
    window.location.replace(`/api/auth/callback${window.location.search}`);
  }, []);

  return (
    <div className="centered-screen">
      <div className="login-card">
        <h1 className="brand">{appTitle}</h1>
        <p className="muted">Completing sign-in…</p>
      </div>
    </div>
  );
}
