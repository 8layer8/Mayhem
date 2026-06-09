/** Thin fetch wrapper around our own backend. Always sends cookies. */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, res.status);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  return undefined as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/** Build a same-origin artwork URL routed through the backend image proxy. */
export function artUrl(thumb: string | undefined, size = 300): string | undefined {
  if (!thumb) return undefined;
  const params = new URLSearchParams({ path: thumb, width: String(size), height: String(size) });
  return `/api/image?${params.toString()}`;
}

/** Build a same-origin audio stream URL for a track. */
export function streamUrl(ratingKey: string, transcode = false): string {
  const base = `/api/stream/${encodeURIComponent(ratingKey)}`;
  return transcode ? `${base}?transcode=1` : base;
}
