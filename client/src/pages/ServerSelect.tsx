import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listServers, selectServer } from "../api/auth";

export function ServerSelect() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["servers"],
    queryFn: listServers,
  });

  const select = useMutation({
    mutationFn: selectServer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  return (
    <div className="centered-screen">
      <div className="login-card">
        <h1 className="brand">Choose a server</h1>
        {isLoading && <p className="muted">Finding your Plex servers…</p>}
        {error && <p className="error">Could not load servers.</p>}
        {select.isError && (
          <p className="error">Could not connect to that server. Try another.</p>
        )}
        <ul className="server-list">
          {data?.servers.map((s) => (
            <li key={s.machineId}>
              <button
                className="server-item"
                disabled={select.isPending}
                onClick={() => select.mutate(s.machineId)}
              >
                <span>{s.name}</span>
                <span className="muted small">{s.owned ? "owned" : "shared"}</span>
              </button>
            </li>
          ))}
          {data && data.servers.length === 0 && (
            <li className="muted">No servers found on your account.</li>
          )}
        </ul>
        {select.isPending && <p className="muted small">Connecting…</p>}
      </div>
    </div>
  );
}
