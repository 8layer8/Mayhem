import { useEffect } from "react";
import { useUiConfig } from "../context/UiConfig";
import { peekPendingPin, pinIdFromCallbackUrl } from "../util/authFlow";

/**
 * Legacy SPA callback route. Immediately hands off to the server-side callback
 * which sets the session cookie on redirect (required for WebView / Tesla).
 */
export function AuthCallback() {
  const { appTitle } = useUiConfig();

  useEffect(() => {
    const pin = pinIdFromCallbackUrl() ?? peekPendingPin();
    if (pin) {
      window.location.replace(`/api/auth/callback/${pin}`);
      return;
    }
    window.location.replace("/api/auth/callback");
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
