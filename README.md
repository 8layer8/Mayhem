# Mayhem

A self-hosted, web-based music player for your **Plex Media Server**. Sign in with your Plex account, pick a server, and browse / search / play
your music library from any browser — with a now-playing screen, play queue, playlist editing,
best-effort gapless playback, and an audio visualizer.

It runs as a single Docker container: a small Node/Express backend handles Plex authentication
and **proxies all Plex API and audio traffic** (so your Plex token never reaches the browser and
there are no CORS headaches), and serves a React single-page app.

## Why?

Because Plexamp is the best and there's no way to have it in a Tesla besides Bluetooth and running it on your phone. Yes it works, but it's no fun. Note: No, Teslas do not currently have CarPlay or Android Auto. This is a project for the Tesla/Plex/Self-Hosters/Plex music fans who are all too aware of this.

It does not have all of Plexamp's features, far from it. However, it does give you a nice web-based interface for all your Plex based music. It can run fullscreen or the standard 2/3rds while driving. It works while the car is driving, while navigation is active, while backing up, while sitting still, etc. It has a Visualizer spectrum analyzer (you can turn it off). The UI is nice and snappy and easy to use while driving (please pay attention to the road!) with big buttons and visual feedback.

It tries to not transcode anything, it plays everything I've thrown at it from 24khz mono Audiobooks to 4mbit FLAC. Cell coverage will come into play for the higher bitrate FLACs, that's just the way it is, we're streaming everything here.

## Quick start (Docker)

Clone this repo to your docker server.

There are example docker-compose.yml files, pick what you need to suit your environment. There is a traefik/docker swarm compatible file and a regular docker version that exposes a port.

There are example .env files, again, pick one that suits your needs. (I like the fullscreen version)

```bash
cp .env.example .env
# edit .env and set a long random SESSION_SECRET (openssl rand -base64 48)

docker compose up --build
```

To test, open <http://localhost:8080>, click **Sign in with Plex**, authorize on plex.tv, pick your
server, and start playing.

You will need this available to the public internet for this to work. You can't do a VPN from the Tesla, so it has to be public, and your Plex server has to be public. If you have gone to the effort of setting up a Pi with VPN in your car, you don't need this, you should just run plexamp on the Pi and control it headlessly. That was a bridge too far for me.

Once it is available on the internet, you need to go to the site from the browser in your Tesla. You can do this over http or https, by domain name or by IP address directly. That is all on you. If you made it this far, I'm sure you can handle it. I'm considering hosting this somewhere public for anyone to use (abuse) but need to see what the bandwidth/security aspects are if I do that. I would prefer to not do that at all, but if the demand is there, maybe.

Note that the Plex login will open a new tab even on the Tesla browser. Sign into YOUR Plex server. It may leave the sign-in tab open and say that it failed, just close it and go back to the player tab. If you have multiple Plex servers, you will be able to choose one here. It will log you in as the owner account, but you can choose Switch User and change to your regular user with the PIN.

You will see all your shared audio libraries, playlists, artists and a search option.

Once you are playing something, you can touch the bottom left image and pop the player fullscreen.

The steering wheel controls do not work to control the player (sorry) so you have to run the radio like it's 1985. But you can minimize the browser (and the media player on the left) and it stays running. It allows navigation prompts to cut through, and will come back to the playing page if you touch the browser button again. Sometimes the browser remembers the site when you get back in the car, sometimes not, so favorite the site by pressing the Star. I have not had it re-prompt for login in normal use, but that's always a possibility. Check before you start driving.

## Local development

Requires Node 20+.

```bash
npm install
cp .env.example .env   # set SESSION_SECRET
npm run dev            # starts the API (8080) and the Vite dev server (5173)
```

- Frontend dev server: <http://localhost:5173> (proxies `/api` to the backend on 8080).
- Backend: <http://localhost:8080>.

> The dev server is yours to start — run `npm run dev` yourself when you want it running.

## How it works

| Piece | Role |
|-------|------|
| `server/` | Express + TypeScript. Plex OAuth PIN sign-in, server discovery, JSON/image/audio proxy. Holds the token in an encrypted cookie session. |
| `client/` | React + Vite + TypeScript SPA. Browse, search, queue, now-playing, playlists, visualizer. |

### Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `PORT` | `8080` | Listen / exposed port. |
| `SESSION_SECRET` | _(required)_ | Encrypts the session cookie. Use a long random value. |
| `PLEX_CLIENT_IDENTIFIER` | _(generated)_ | Stable Plex client id; auto-generated and persisted to `data/client-id` if unset. |
| `COOKIE_SECURE` | `false` | Set `true` when serving over HTTPS. |
| `UI_SCALE` | `medium` | UI sizing preset: `small`, `medium`, `large`, `extra-large`, or `full`. Controls button/touch targets and now-playing album art size. `extra-large` maximizes album art. `full` uses album art as the now-playing background and disables the visualizer. |
| `VISUALIZER_ENABLED` | `true` | Show the frequency visualizer on the now-playing screen. Ignored when `UI_SCALE=full`. |

## Notes

- **Token security:** your Plex token lives only server-side inside an encrypted, httpOnly cookie
  session — it is never exposed to client JavaScript.
- **Transcoding:** audio is transcoded to a browser-safe format by default (with direct-play
  passthrough when the source codec is browser-playable). Transcoding trades true gapless for
  universal compatibility.
- **Audience:** designed for personal / small trusted self-hosting. Each browser gets its own
  session.
