import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listUsers, switchUser, type HomeUser } from "../api/users";
import { GlyphBack, GlyphBackspace, GlyphCheck, GlyphClose, GlyphLock } from "./Glyphs";
import { usePlayer } from "../store/player";

/** Large, touch-friendly modal for switching between Plex Home users. */
export function SwitchUserModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const clearQueue = usePlayer((s) => s.clearQueue);
  const [pinFor, setPinFor] = useState<HomeUser | null>(null);
  const [pin, setPin] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: listUsers });

  const doSwitch = useMutation({
    mutationFn: ({ uuid, pin }: { uuid: string; pin?: string }) => switchUser(uuid, pin),
    onSuccess: () => {
      // The whole library is user-specific — reset playback and refetch all data.
      clearQueue();
      queryClient.invalidateQueries();
      onClose();
    },
  });

  const choose = (user: HomeUser) => {
    if (user.protected) {
      setPin("");
      setPinFor(user);
    } else {
      doSwitch.mutate({ uuid: user.uuid });
    }
  };

  const submitPin = () => {
    if (pinFor && pin.length >= 4) doSwitch.mutate({ uuid: pinFor.uuid, pin });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close icon" onClick={onClose} title="Close">
          <GlyphClose />
        </button>

        {!pinFor ? (
          <>
            <h2>Switch User</h2>
            {isLoading && <p className="muted">Loading users…</p>}
            <div className="user-grid">
              {data?.users.map((user) => (
                <button
                  key={user.uuid}
                  className={`user-tile ${user.uuid === data.currentUuid ? "current" : ""}`}
                  onClick={() => choose(user)}
                  disabled={doSwitch.isPending}
                >
                  <span className="user-avatar">
                    {user.thumb ? <img src={user.thumb} alt="" /> : <span>{user.title[0]}</span>}
                  </span>
                  <span className="user-name">{user.title}</span>
                  {user.protected && <GlyphLock className="user-lock" />}
                  {user.uuid === data.currentUuid && <span className="user-badge">Current</span>}
                </button>
              ))}
            </div>
            {data && data.users.length === 0 && (
              <p className="muted">
                No Plex Home users found. You can sign out to use a different account.
              </p>
            )}
            {doSwitch.isError && <p className="error">Could not switch user.</p>}
          </>
        ) : (
          <div className="pin-pad">
            <h2>Enter PIN for {pinFor.title}</h2>
            <div className="pin-display">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`pin-dot ${i < pin.length ? "filled" : ""}`} />
              ))}
            </div>
            <div className="keypad">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
                <button
                  key={n}
                  className="key"
                  onClick={() => setPin((p) => (p.length < 8 ? p + n : p))}
                >
                  {n}
                </button>
              ))}
              <button className="key" onClick={() => setPin((p) => p.slice(0, -1))} title="Delete">
                <GlyphBackspace />
              </button>
              <button className="key" onClick={() => setPin((p) => (p.length < 8 ? p + "0" : p))}>
                0
              </button>
              <button
                className="key key-go"
                onClick={submitPin}
                disabled={pin.length < 4 || doSwitch.isPending}
              >
                <GlyphCheck />
              </button>
            </div>
            {doSwitch.isError && <p className="error">Wrong PIN. Try again.</p>}
            <button className="link big-link" onClick={() => setPinFor(null)}>
              <GlyphBack /> Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
