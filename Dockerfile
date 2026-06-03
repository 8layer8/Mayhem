# syntax=docker/dockerfile:1

# --- Build stage: install all deps and build client + server ---
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies (uses the lockfile for reproducible builds).
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci

# Build both workspaces.
COPY . .
RUN npm run build

# Prune to production dependencies for the runtime image.
RUN npm prune --omit=dev

# --- Runtime stage: minimal image serving the built app ---
FROM node:22-alpine AS runtime
RUN apk update && apk upgrade && apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_DIR=/data

# Bring in production node_modules and the built artifacts, preserving the
# workspace layout the server expects (server/dist resolves ../../client/dist).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist

# Persisted client identifier lives here; owned by the runtime user.
RUN mkdir -p /data && chown -R node:node /data

USER node
EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/dist/index.js"]
