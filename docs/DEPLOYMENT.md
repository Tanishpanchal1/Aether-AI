# Aether private remote deployment

## Architecture

The Expo web export is served by Caddy on `127.0.0.1:3000`. Caddy sends `/health`,
`/api/*`, and `/ws/*` to FastAPI on `127.0.0.1:8765`; every other route is served
from `mobile/dist`, with `/index.html` as the client-side fallback. Tailscale Serve
is the only remote entry point and proxies the local Caddy listener inside the
tailnet. No router port forwarding or Funnel is required.

The terminal WebSocket creates a local PTY in `AETHER_TESTING_ROOT`. OpenCode stays
on this PC. The chat UI remains mock-backed; no chat history is persisted until a
future Firebase Authentication and Firestore integration is implemented.

## Garuda/Arch prerequisites

Install Node/npm and Caddy using distribution-supported packages:

```bash
sudo pacman -Syu nodejs npm caddy
```

Install Tailscale using the current Arch package, then enable its daemon:

```bash
sudo pacman -S tailscale
sudo systemctl enable --now tailscaled
sudo tailscale up
```

`tailscale up` may open an authentication URL. Complete that interactive step; do
not put an auth key in a repository or systemd unit.

## Build and start

```bash
cd /path/to/Aether
cp .env.example .env.local
python3 -m venv server/.venv
server/.venv/bin/pip install -r server/requirements.txt
(cd mobile && npm ci && npm run export -- --platform web)

export AETHER_WEB_ROOT="$PWD/mobile/dist"
caddy validate --config "$PWD/Caddyfile" --adapter caddyfile
./scripts/start-aether.sh
```

The startup script checks dependencies, exports the web app when needed, starts
FastAPI, waits for `/health`, validates Caddy, and checks the local static page.
It uses `${XDG_RUNTIME_DIR:-/tmp}/aether-ai` for logs and PID files. Stop it with:

```bash
./scripts/stop-aether.sh
```

For an authorized tailnet deployment, start with `AETHER_REMOTE=1`. The script
checks `tailscale status`, then runs the supported current syntax:

```bash
tailscale serve --bg 3000
tailscale serve status
```

Open the HTTPS `*.ts.net` URL printed by `tailscale serve status` on the phone.
Install Tailscale on the phone, sign into the same tailnet, and confirm the
tailnet ACL/grant policy permits the phone to reach this device. Verify locally:

```bash
tailscale status
tailscale ip -4
curl --fail http://127.0.0.1:3000/health
```

Disable remote access without changing the local services:

```bash
tailscale serve reset
```

The reset command removes the Serve configuration. Use `AETHER_DISABLE_SERVE=1`
with the shutdown script if you want the script to do that reset as well.

## Development modes

For local Expo development, leave the backend on loopback for the same machine.
For a separate LAN device, explicitly opt in with a development override:

```bash
EXPO_PUBLIC_SERVER_URL=http://192.0.2.10:8765 npm start
```

Do not commit that value. Production web builds leave the override unset: the
browser uses `window.location.origin`, and the WebSocket converts HTTP/HTTPS to
WS/WSS automatically.

## Troubleshooting

* Missing `mobile/dist/index.html`: run `cd mobile && npm run export -- --platform web`.
* `/health` fails: inspect the backend log under the runtime directory and verify
  `server/.venv` contains the requirements.
* Caddy validation fails: export `AETHER_WEB_ROOT` to an absolute existing path.
* The page loads but the terminal is disconnected: check FastAPI `/health`, the
  browser console for the WSS request, and `tailscale serve status`.
* Tailscale prompts for HTTPS enablement: complete the official interactive
  consent flow, then rerun `tailscale serve --bg 3000`.
* A phone cannot connect: confirm Tailscale is installed and authenticated on
  both devices and review tailnet ACLs. Do not use Funnel.

## Security limitations and follow-up

FastAPI and Caddy default to loopback, but this does not make terminal execution
safe. The LangGraph command policy is a development-level filter. Interactive
OpenCode mode intentionally bypasses line-level checks so the existing PTY
interaction works. It is **not a sandbox**, and this deployment does not yet
provide application authentication, per-user session authorization, scoped OS
permissions, command approval, or container isolation.

Before exposing this to more than trusted tailnet devices, add Firebase
Authentication token verification at the backend boundary, authorize every
session against the authenticated user, and run terminal/OpenCode in a
least-privilege OS user or container with explicit filesystem and network
permissions. Never put Firebase service credentials, LLM keys, or private keys
in the Expo bundle; backend-only Firebase integration should own verification
and Firestore operations.

To return to local-only development, run `tailscale serve reset`, stop the local
scripts, and use Expo with no remote URL override.
