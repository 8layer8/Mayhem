import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { listUsers, switchUser, type HomeUser } from "../api/users";
import { usePlayer } from "../store/player";
import { isTvBrowser } from "../util/tv";
import { GlyphBack, GlyphBackspace, GlyphCheck, GlyphClose, GlyphLock } from "./Glyphs";

function focusFirstInModal(modalEl: HTMLElement, ...selectors: string[]) {
  for (const selector of selectors) {
    const target = modalEl.querySelector<HTMLElement>(selector);
    if (target) {
      target.focus();
      return;
    }
  }
}

/** Large, touch-friendly modal for switching between Plex Home users. */
export function SwitchUserModal({
  onClose,
  returnFocusRef,
}: {
  onClose: () => void;
  /** Element to focus after a successful switch on TV (usually the nav user button). */
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const queryClient = useQueryClient();
  const clearQueue = usePlayer((s) => s.clearQueue);
  const [pinFor, setPinFor] = useState<HomeUser | null>(null);
  const [pin, setPin] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const closedBySuccess = useRef(false);
  const tv = isTvBrowser();

  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: listUsers });

  const restoreTvFocus = (serverCleared: boolean) => {
    requestAnimationFrame(() => {
      if (serverCleared) {
        document.querySelector<HTMLElement>(".server-item")?.focus();
        return;
      }
      returnFocusRef?.current?.focus();
    });
  };

  const doSwitch = useMutation({
    mutationFn: ({ uuid, pin }: { uuid: string; pin?: string }) => switchUser(uuid, pin),
    onSuccess: async (result) => {
      closedBySuccess.current = true;
      clearQueue();
      await queryClient.invalidateQueries();
      onClose();
      if (tv) restoreTvFocus(result.serverCleared);
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

  // TV: trap focus in the modal and restore on dismiss.
  useEffect(() => {
    if (!tv) return;

    const shell = document.querySelector(".app-shell");
    shell?.setAttribute("inert", "");
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    return () => {
      shell?.removeAttribute("inert");
      if (!closedBySuccess.current) {
        returnFocusRef?.current?.focus() ?? previousFocus?.focus();
      }
    };
  }, [tv, returnFocusRef]);

  // TV: move focus into the modal when content is ready.
  useEffect(() => {
    if (!tv || !modalRef.current) return;

    if (pinFor) {
      focusFirstInModal(modalRef.current, ".key", ".link.big-link", ".modal-close");
      return;
    }
    if (isLoading) return;

    focusFirstInModal(
      modalRef.current,
      ".user-tile:not(.current):not([disabled])",
      ".user-tile:not([disabled])",
      ".modal-close",
    );
  }, [tv, pinFor, isLoading, data]);

  const modal = (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={pinFor ? `Enter PIN for ${pinFor.title}` : "Switch user"}
        onClick={(e) => e.stopPropagation()}
      >
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

  return createPortal(modal, document.body);
}
