import express from "express";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PORT } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { configRouter } from "./routes/config.js";
import { imageRouter } from "./routes/image.js";
import { playlistsRouter } from "./routes/playlists.js";
import { proxyRouter } from "./routes/proxy.js";
import { serversRouter } from "./routes/servers.js";
import { streamRouter } from "./routes/stream.js";
import { usersRouter } from "./routes/users.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(express.json());

// --- API ---
app.use("/api/config", configRouter);
app.use("/api/auth", authRouter);
app.use("/api/servers", serversRouter);
app.use("/api/users", usersRouter);
app.use("/api/playlists", playlistsRouter);
app.use("/api/plex", proxyRouter);
app.use("/api/image", imageRouter);
app.use("/api/stream", streamRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// --- Static SPA ---
// In the Docker image the built client lives next to the server bundle.
const clientDist = resolve(__dirname, "../../client/dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: anything that isn't an API route serves index.html.
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(resolve(clientDist, "index.html"));
  });
} else {
  console.warn(
    `[server] Client build not found at ${clientDist}. ` +
      "Run `npm run build:client` (or use the Vite dev server in development).",
  );
}

app.listen(PORT, () => {
  console.log(`[server] Mayhem listening on http://localhost:${PORT}`);
});
