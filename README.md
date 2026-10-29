# Aether AI

Aether AI is a cross-device terminal workspace prototype. It connects an
Expo/React Native interface to a local FastAPI server, gives the user a
browser- or phone-accessible terminal, and starts OpenCode inside a dedicated
testing workspace.

The project is intentionally split into three parts:

```text
Phone or browser
        |
        | WebSocket terminal stream
        v
FastAPI PTY server
        |
        | local process
        v
bash shell -> OpenCode
```

## Current capabilities

### FastAPI terminal server

The server in `server/`:

- Exposes `GET /health` for readiness checks
- Exposes `POST /api/command/check` for command-policy checks
- Exposes `WS /ws/terminal` for interactive terminal sessions
- Creates a pseudo-terminal backed by a local Bash process
- Streams terminal output to connected clients
- Accepts terminal input, resize events, and detach messages as JSON
- Assigns a session identifier and reports the active working directory
- Limits message size and concurrent terminal connections
- Cleans up the PTY process and file descriptor when a session closes

Each terminal starts in the configured `AETHER_TESTING_ROOT`. If no root is
configured, the server creates an `Aether ai testing/` directory next to the
server package.

### Development command policy

Before normal shell lines are written to the PTY, a small LangGraph state graph
checks the command. The current policy blocks:

- Parent-directory traversal using `..`
- Absolute paths
- Directory changes through `cd`
- Common destructive or privileged tokens such as `rm`, `sudo`, `mkfs`,
  `shutdown`, `reboot`, `chmod`, and `chown`

The policy is also available through `/api/command/check`, which returns an
`allowed` flag and a reason.

This is a development-level command filter, not a security sandbox. Once the
user starts `opencode`, the server switches to interactive application mode so
OpenCode can receive raw terminal input. That mode intentionally bypasses the
line-level shell policy. Do not expose this service to untrusted users.

### Expo interface

The `mobile/` application is an Expo React Native app that can run on Android,
iOS, and the web. It includes:

- A terminal screen backed by xterm.js on the web
- A native WebView terminal on mobile
- Connection status and reconnect controls
- Terminal resize synchronization
- A responsive sidebar and navigation shell
- A chat-style UI and voice-call overlay prototype

The terminal UI is the functional client path. The chat screen is currently a
UI prototype backed by mock sessions and mock assistant responses; it does not
yet persist conversations or call a chat backend.

### Local OpenCode launcher

The `pc/launch_opencode.sh` script opens the configured testing workspace and
starts OpenCode locally. OpenCode remains on the host machine; it is not
executed inside the phone or browser client.

## Repository layout

```text
.
├── server/
│   ├── app/
│   │   ├── main.py          # FastAPI app, PTY lifecycle, WebSocket protocol
│   │   └── agent.py         # LangGraph command-policy graph
│   ├── requirements.txt
│   ├── run.sh
│   ├── test_app.py
│   └── test_smoke.py
├── mobile/
│   ├── src/screens/         # Terminal, chat, and application screens
│   ├── src/components/     # Navigation, terminal, chat, and status UI
│   └── package.json
├── pc/
│   └── launch_opencode.sh   # Local OpenCode launcher
├── scripts/
│   ├── start-aether.sh      # Backend/static site startup orchestration
│   └── stop-aether.sh
├── docs/DEPLOYMENT.md       # Local and private tailnet deployment
├── Caddyfile                # Static app and API/WebSocket reverse proxy
└── systemd/                 # Optional user service definitions
```

## Technology

### Backend

- Python 3
- FastAPI and Uvicorn
- WebSockets
- POSIX PTYs and Bash
- LangGraph and LangChain Core
- `ptyprocess` and low-level terminal resize handling

### Client

- Expo SDK 53
- React Native and React Native Web
- xterm.js and the xterm fit addon
- React Native WebView for native terminal rendering

### Private remote access

The supported remote deployment path uses:

- Expo web export
- Caddy on loopback
- FastAPI on loopback
- Tailscale Serve for authorized tailnet access
- Optional systemd user services

The deployment documentation intentionally does not use public router port
forwarding or Tailscale Funnel.

## Local development

### Start the FastAPI server

```bash
git clone https://github.com/Tanishpanchal1/Aether-AI.git
cd Aether-AI

python3 -m venv server/.venv
server/.venv/bin/pip install -r server/requirements.txt

./scripts/start-aether.sh
```

For direct backend development:

```bash
cd server
source .venv/bin/activate
./run.sh
```

The default server listens on `127.0.0.1:8765`. Override the port with:

```bash
PORT=8766 ./run.sh
```

Verify the server:

```bash
curl http://127.0.0.1:8765/health
```

### Start the Expo client

```bash
cd mobile
npm ci
npm start
```

For the browser client:

```bash
npm run web
```

For a phone on the same LAN, set the server URL explicitly:

```bash
EXPO_PUBLIC_SERVER_URL=http://<computer-lan-ip>:8765 npm start
```

Do not commit a machine-specific URL.

### Start OpenCode

In another terminal:

```bash
./pc/launch_opencode.sh
```

The launcher uses the local testing workspace configured by the project.

## Deployment

For a private tailnet deployment, follow
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). The startup script can:

1. Validate backend and frontend prerequisites
2. Export the Expo web app
3. Start FastAPI
4. Wait for `/health`
5. Validate and start Caddy
6. Optionally configure Tailscale Serve

Stop the local services with:

```bash
./scripts/stop-aether.sh
```

## Security limitations

Aether AI currently has no application authentication, per-user authorization,
container isolation, or least-privilege execution boundary. The terminal runs
local processes with the permissions of the host user. The command policy is
useful as a development guardrail but must not be treated as a sandbox.

Before exposing the service beyond a trusted development environment, add:

- Authentication and authorization at the WebSocket boundary
- Per-session user authorization
- A dedicated least-privilege OS user or container
- Explicit filesystem and network restrictions
- Stronger command approval and audit logging
- Backend-only secret and credential handling

## Testing

Backend tests are located in `server/`:

```bash
cd server
source .venv/bin/activate
pytest
```

The mobile app can be built/exported with:

```bash
cd mobile
npm run export -- --platform web
```

## Project status

Aether AI is an active prototype. The terminal-to-PTY workflow, command
policy endpoint, Expo terminal client, reconnect behavior, OpenCode launcher,
and private deployment scripts are implemented. The chat experience,
authentication, durable sessions, multi-user access control, and production
sandboxing remain future work.

## License

No license has currently been declared for this repository.
