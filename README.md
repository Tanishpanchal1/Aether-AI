# Aether AI

Three small apps share one workflow:

- `server/` — FastAPI PTY WebSocket server. The LangGraph policy node validates terminal lines before they reach the PTY.
- `pc/` — `launch_opencode.sh`, which opens a terminal in `Aether ai testing/` and starts `opencode`.
- `mobile/` — Expo React Native UI, also runnable on the web, mirroring the server PTY over WebSocket.

## Local development

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
./run.sh
```

The backend listens on `127.0.0.1:8765` by default. Override the bind port with `PORT=8766 ./run.sh` when needed.

In another terminal:

```bash
./pc/launch_opencode.sh
```

For the UI, install Node dependencies in `mobile/` and run `npm run web` or `npm start`. On a physical phone, point Expo at the computer running the server:

```bash
EXPO_PUBLIC_SERVER_URL=http://<your-computer-lan-ip>:8765 npm start
```

The server creates and uses only `Aether ai testing/` as its working directory. The current policy blocks parent/absolute paths, directory changes, and destructive privileged commands. Interactive OpenCode mode bypasses that line-level policy, so it is not a security sandbox.

## Private remote hosting

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the Caddy, Expo export, Garuda,
Tailscale Serve, startup/shutdown, systemd user-service, troubleshooting, and
security follow-up instructions. The supported remote path is Tailscale Serve;
Tailscale Funnel and public router ports are not used.
