# Aether AI — Codebase Documentation

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [Server (`server/`)](#3-server-server)
4. [PC Launcher (`pc/`)](#4-pc-launcher-pc)
5. [Mobile / Web UI (`mobile/`)](#5-mobile--web-ui-mobile)
   - [Entry Points](#51-entry-points)
   - [Screens](#52-screens)
   - [Components](#53-components)
   - [Theme](#54-theme)
   - [Config](#55-config)
6. [Data Flow](#6-data-flow)
7. [Policy System](#7-policy-system)
8. [WebSocket Protocol](#8-websocket-protocol)
9. [Running the Project](#9-running-the-project)
10. [Known Bugs Fixed](#10-known-bugs-fixed)
11. [What's Not Yet Implemented](#11-whats-not-yet-implemented)

---

## 1. Project Overview

Aether AI is a three-part application that lets you control and observe an AI coding agent (OpenCode) from a mobile or web interface.

```
┌─────────────────────────────────────────────────────────────┐
│                        Aether AI                            │
│                                                             │
│  ┌──────────────┐   WebSocket    ┌──────────────────────┐  │
│  │  Mobile/Web  │◄──────────────►│   FastAPI Server     │  │
│  │  Expo UI     │   port 8765    │   (PTY + Policy)     │  │
│  │  (React Nav) │                └──────────┬───────────┘  │
│  └──────────────┘                           │ PTY          │
│                                   ┌─────────▼──────────┐  │
│  ┌──────────────┐   starts        │   bash shell inside │  │
│  │  PC Launcher │────────────────►│  "Aether ai testing"│  │
│  │  (shell script)│               │   → runs opencode   │  │
│  └──────────────┘                 └────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

The three parts are:
- **`server/`** — FastAPI WebSocket server that spawns a bash PTY, validates every command through a LangGraph policy node, and streams terminal I/O to the UI.
- **`pc/`** — A shell script that opens a graphical terminal in `Aether ai testing/` and launches `opencode`.
- **`mobile/`** — Expo React Native app (runs on iOS, Android, and **web**) that mirrors the server PTY and provides a Chat UI.

---

## 2. Repository Structure

```
Aether/
├── server/                    # FastAPI PTY WebSocket server
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI app, PTY logic, WebSocket handler
│   │   └── agent.py           # LangGraph policy graph
│   ├── requirements.txt
│   ├── run.sh                 # Start script
│   └── test_smoke.py          # PTY smoke test
│
├── pc/
│   └── launch_opencode.sh     # Opens terminal + starts opencode
│
├── mobile/                    # Expo React Native UI
│   ├── App.js                 # Root component, tab state
│   ├── index.js               # Expo entry point
│   ├── app.json               # Expo config
│   ├── babel.config.js
│   ├── package.json
│   └── src/
│       ├── screens/
│       │   ├── TerminalScreen.js   # Live PTY terminal
│       │   └── ChatScreen.js       # Chat UI (mock data, backend pending)
│       ├── components/
│       │   ├── TabBar.js           # Bottom tab bar
│       │   ├── Navbar.js           # Top navbar (title, sidebar toggle, new chat)
│       │   ├── Sidebar.js          # Slide-out chat history drawer
│       │   ├── ChatMessage.js      # User + assistant message bubbles
│       │   ├── ChatInput.js        # Message input with send/voice/stop buttons
│       │   ├── ChatPlaceholder.js  # Welcome screen with suggestion cards
│       │   └── VoiceCallOverlay.js # Full-screen voice call UI
│       ├── config/
│       │   └── server.js           # Server URL resolution + xterm CSS
│       └── theme/
│           └── theme.js            # Colors, spacing, typography, radius
│
├── Aether ai testing/         # Sandboxed working directory for the bash PTY
│
├── .github/
│   └── modernize/             # GitHub Dependabot / upgrade configs
│
├── README.md
├── CODEBASE.md                # This file
└── .gitignore
```

---

## 3. Server (`server/`)

### `app/main.py`

The core of the backend. Responsibilities:

**PTY spawning**
- On each WebSocket connection, opens a Unix PTY (`pty.openpty()`).
- Spawns `bash --noprofile --norc` with `stdin/stdout/stderr` all connected to the PTY slave end.
- Working directory is always `Aether ai testing/` (configurable via `AETHER_TESTING_ROOT` env var).
- Starts a daemon thread (`_reader`) that reads PTY output and pushes it into an `asyncio.Queue`.
- A `forward_output` coroutine drains the queue and sends `{"type": "output", "data": "..."}` messages over the WebSocket.

**Resize handling**
- Accepts `{"type": "resize", "cols": N, "rows": N}` messages and calls `fcntl.ioctl(TIOCSWINSZ)` to resize the PTY.

**Command policy**
- Tracks a line buffer (`shell_buffer`) built from incoming keystrokes.
- When a complete line is detected (contains `\n` or `\r`), and the terminal is not in interactive app mode, it calls `check_command()` from `agent.py`.
- If blocked: discards the input, sends `{"type": "policy", "data": "<reason>\r\n"}` back to the client.
- If allowed: writes the raw keystrokes to the PTY master fd.

**Interactive app mode**
- When a command named `opencode` or `opencode.cmd` is submitted and passes policy, the server switches `interactive_app = True`.
- In this mode, all keystroke policy checks are bypassed (raw input passes straight to the PTY). This allows full TUI interaction with OpenCode.
- Sends `{"type": "mode", "mode": "application", "name": "opencode"}` to the client when switching.

**REST endpoints**
- `GET /health` — returns `{"ok": true, "testing_root": "..."}`.
- `POST /api/command/check` — accepts `{"command": "..."}` and returns the policy result. Useful for testing policy rules without a live PTY.

**WebSocket endpoint**
- `WS /ws/terminal` — the main terminal channel.

**Session init**
- Immediately after accepting a connection, sends `{"type": "session", "id": "<uuid>", "cwd": "<path>", "mode": "shell"}`.

---

### `app/agent.py`

A minimal LangGraph state graph with a single `policy` node.

**State schema (`CommandState`)**
```python
class CommandState(TypedDict, total=False):
    command: str
    allowed: bool
    reason: str
```

**Policy rules (all checked in `_policy_node`)**

| Rule | Trigger | Reason |
|---|---|---|
| Empty input | `command == ""` | Allowed — passes through |
| Parent path traversal | `..` anywhere in command | Blocked |
| Absolute path | command starts with `/` | Blocked |
| Directory change | `cd ` in command (case-insensitive) | Blocked |
| `rm` | ` rm ` or ` rm\t` | Blocked |
| `sudo` | anywhere in command | Blocked |
| `mkfs` | anywhere in command | Blocked |
| `shutdown` | anywhere in command | Blocked |
| `reboot` | anywhere in command | Blocked |
| `chmod` | anywhere in command | Blocked |
| `chown` | anywhere in command | Blocked |

The graph: `START → policy → END`. Compiled once at module import as `command_graph`.

Public function:
```python
def check_command(command: str) -> CommandState:
    return command_graph.invoke({"command": command})
    # Returns: {"command": "...", "allowed": True/False, "reason": "..."}
```

---

### `requirements.txt`

```
fastapi>=0.115,<1
uvicorn[standard]>=0.30,<1
langgraph>=0.2,<1
langchain-core>=0.3,<1
ptyprocess>=0.7,<1
```

---

### `run.sh`

```bash
source .venv/bin/activate
HOST=127.0.0.1 PORT="${PORT:-8765}" ./run.sh
```

Default port: **8765**. Override with `PORT=8766 ./run.sh`.

---

### `test_smoke.py`

A basic integration test that:
1. Connects to `ws://127.0.0.1:8765/ws/terminal` using `websockets`.
2. Sends `mkdir -p smoke_test\n`.
3. Waits up to 10 messages for output containing `smoke_test`.
4. Asserts the directory exists on disk in `Aether ai testing/`.

Run with the server already running: `python server/test_smoke.py`.

---

## 4. PC Launcher (`pc/`)

### `launch_opencode.sh`

Opens a graphical terminal emulator, `cd`'s into `Aether ai testing/`, and runs `opencode`.

**Terminal detection order:**
1. `gnome-terminal`
2. `x-terminal-emulator` (Debian/Ubuntu alternatives system)
3. `xterm` (if `$DISPLAY` is set)
4. Falls back to running `opencode` in the current terminal if no GUI terminal found.

**Environment variables set:**
- `AETHER_TESTING_ROOT` — absolute path to `Aether ai testing/`.
- `AETHER_TERMINAL=1` — signals to OpenCode that it's running inside Aether.

**Usage:** `./pc/launch_opencode.sh` — optionally pass extra args forwarded to `opencode`.

---

## 5. Mobile / Web UI (`mobile/`)

Built with **Expo SDK 53**, **React Native 0.79**, **React 19**, and **react-native-web 0.20** for web support. Uses Metro bundler. No Expo Router — plain React state navigation.

### 5.1 Entry Points

**`index.js`**
```js
import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
```

**`App.js`**
- Root component. Holds two pieces of state: `activeTab` (`'terminal'` | `'chat'`) and `sidebarVisible` (boolean).
- Renders either `<TerminalScreen>` or `<ChatScreen>` based on `activeTab`, plus a persistent `<TabBar>` at the bottom.
- Background color: `colors.bg` (`#0d0d0d`).

---

### 5.2 Screens

#### `TerminalScreen.js`

Renders a live terminal connected to the server WebSocket.

**On web** (`Platform.OS === 'web'`):
- Uses `@xterm/xterm` and `@xterm/addon-fit` loaded via `require()` (not import — Metro can't handle CSS imports from npm packages).
- Injects xterm CSS via a dynamically created `<style>` element using the pre-bundled `XTERM_CSS` string from `src/config/server.js`.
- Creates a `Terminal` instance, opens it into a `ref`-attached `<View>`, connects a `WebSocket` to `WS_URL`.
- Handles resize with `FitAddon` + `window.addEventListener('resize', ...)`.
- Sends `{"type": "resize", "cols": N, "rows": N}` on resize.
- Sends `{"type": "input", "data": "..."}` on user keystrokes (`terminal.onData`).
- Receives `{"type": "output"|"policy", "data": "..."}` and writes to the terminal.

**On native** (iOS/Android):
- Uses `react-native-webview` with an inline HTML string that loads xterm from CDN (`jsdelivr.net`).
- Same WebSocket logic embedded inside the HTML `<script>`.

Both paths display a `<Navbar>` at the top with the title "Terminal".

---

#### `ChatScreen.js`

Chat UI. Currently **UI-only** — uses mock data, no real AI backend connected yet.

**State:**
| State | Type | Purpose |
|---|---|---|
| `activeSessionId` | `string\|null` | Currently selected chat session |
| `messages` | `Message[]` | Array of `{id, role, content}` objects |
| `input` | `string` | Controlled input field value |
| `voiceActive` | `boolean` | Whether the voice overlay is shown |
| `voiceStatus` | `'listening'\|'thinking'\|'speaking'` | Voice overlay status |
| `isGenerating` | `boolean` | Whether assistant is responding |

**Rendering logic:**
- If `messages.length === 0`: shows `<ChatPlaceholder>` (welcome screen with suggestion cards).
- Otherwise: shows a `<FlatList>` of `<ChatMessage>` components. The `FlatList` has `style={styles.scrollArea}` (`flex: 1`) — required for correct height on web.
- Below the message list: `<KeyboardAvoidingView>` wrapping `<ChatInput>`.
- `<Sidebar>` and `<VoiceCallOverlay>` are rendered as absolute overlays.

**Mock data:**
- `MOCK_SESSIONS` — 6 fake chat sessions with titles and timestamps.
- `MOCK_MESSAGES` — 4 fake messages explaining the Aether architecture.

**`sendMessage(text)`:**
Appends a user message, sets `isGenerating = true`, then after 800ms appends a mock assistant reply and sets `isGenerating = false`.

---

### 5.3 Components

#### `TabBar.js`
Bottom navigation bar. Props: `tabs` (array of `{key, label, icon}`), `active` (string), `onSelect` (function).
- Each tab is a `<Pressable>` with icon (emoji) and label text.
- Active tab uses `colors.accent` (`#80edc4`) for both icon and label.
- Background: `colors.gray[850]` (`#262626`), top border: `colors.gray[800]` (`#333333`).

---

#### `Navbar.js`
Top navigation bar. Props: `title`, `onToggleSidebar`, `onNewChat`.
- Left: hamburger button (`☰`) → calls `onToggleSidebar`.
- Center: title text (truncated to 1 line).
- Right: pencil button (`✎`) → calls `onNewChat`, plus a user avatar circle showing `"U"`.
- Background: `transparent` (inherits screen background).

---

#### `Sidebar.js`
Slide-out drawer showing chat history. Props: `visible`, `onClose`, `sessions`, `activeSessionId`, `onSelectSession`, `onNewChat`.

When `visible = false`, renders `null`.

When `visible = true`, renders:
1. **Backdrop** — full-screen semi-transparent `<Pressable>` (`rgba(0,0,0,0.6)`), tapping closes the sidebar.
2. **Drawer** — 260px wide, positioned absolutely on the left, `zIndex: 50`.
   - **Header** — Æ logo circle + "New Chat" button + hamburger close button.
   - **Search bar** — filters sessions by title or `lastMessage`.
   - **Chat list** — sessions grouped by time range: Today / Yesterday / Previous 7 days / Previous 30 days / Older.
   - **User profile row** — avatar + name at the bottom (currently hardcoded `"User"`).

Time grouping logic mirrors Open WebUI's approach using `getTimeRange(timestamp)`.

---

#### `ChatMessage.js`
Renders a single message. Props: `message` (`{role, content, timestamp?}`), `isLastMessage`.

**User messages:** right-aligned bubble, `colors.gray[850]` background, `radius.xl` (24px) border radius.

**Assistant messages:** left-aligned layout with:
- Avatar circle (Æ, accent green background).
- Name label `"Aether"` + optional timestamp.
- Content text.
- Action buttons row: Copy (`⧉`), Regenerate (`↻`), Speak (`🔊`).
  - Copy uses `navigator.clipboard.writeText` (web) with a 2-second "✓" feedback state.
  - Speak uses `window.speechSynthesis` (web).

---

#### `ChatInput.js`
Message input bar. Props: `value`, `onChangeText`, `onSend`, `onVoiceCall`, `onAttach`, `isGenerating`, `onStop`.

Layout (horizontal):
```
[ + ]  [ text input (flex: 1) ]  [ 🎤 ]  [ send/call/stop ]
```

Right button logic:
- `isGenerating = true` → stop button (white square inside gray circle) → calls `onStop`.
- `isGenerating = false`, input empty → headphone button (`🎧`) → calls `onVoiceCall`.
- `isGenerating = false`, input has text → send button (white circle, black `↑`) → calls `onSend`.

`maxHeight` is set directly as a prop on `<TextInput>` (capped at 200px). The `useEffect` with `setNativeProps` was removed as it crashed on web (`setNativeProps` is native-only).

Below the input bar: disclaimer text `"LLMs can make mistakes. Verify important information."`.

---

#### `ChatPlaceholder.js`
Welcome screen shown when there are no messages. Props: `onSuggestion`.

Contains:
- Æ avatar circle (accent green).
- Greeting: `"Hello, User"`.
- Subtitle: `"How can I help you today?"`.
- Horizontally scrollable suggestion cards (4 cards): Explain / Brainstorm / Write / Summarize. Tapping a card calls `onSuggestion(promptText)`.

---

#### `VoiceCallOverlay.js`
Full-screen voice call modal. Props: `visible`, `status` (`'listening'|'thinking'|'speaking'`), `onClose`.

- When `visible = false`, renders `null`.
- When `visible = true`: covers the entire screen (`position: absolute`, `zIndex: 9999`).
- Center: large white pulsing circle (160×160px) animated with `Animated.loop` scaling between 0.85 and 1.15.
- Bottom row: camera toggle button (left), status text (center), close button (right).
- Tapping the circle or the close button calls `onClose`.

---

### 5.4 Theme

**`src/theme/theme.js`** — single source of truth for all visual tokens.

**Color palette** — Open WebUI's gray scale:
| Token | Value | Usage |
|---|---|---|
| `gray[950]` | `#0d0d0d` | App background |
| `gray[900]` | `#171717` | Surface / active items |
| `gray[850]` | `#262626` | Elevated surfaces, input bg, user bubbles |
| `gray[800]` | `#333333` | Borders |
| `gray[700]` | `#4e4e4e` | Subtle borders, stop button |
| `gray[600]` | `#676767` | Muted text, inactive icons |
| `gray[500]` | `#9b9b9b` | Secondary text |
| `gray[400]` | `#b4b4b4` | Icon color |
| `gray[300]` | `#cdcdcd` | Card titles |
| `gray[200]` | `#e3e3e3` | Primary text |
| `gray[100]` | `#ececec` | Bright text |
| `colors.accent` | `#80edc4` | Aether brand green (active tab, avatar, cursor) |
| `colors.danger` | `#ff6b8a` | Error red |

**Spacing scale:**
`xs=4`, `sm=8`, `md=12`, `lg=16`, `xl=20`, `xxl=28`

**Border radius:**
`sm=6`, `md=12` (buttons), `lg=16`, `xl=24` (bubbles/inputs, `rounded-3xl`), `pill=999`

**Typography** — Inter font stack (`Inter, -apple-system, ...`):
`title`, `subtitle`, `body`, `bodySmall`, `mono`, `caption`, `button`

---

### 5.5 Config

**`src/config/server.js`**

Server URL resolution (in priority order):
1. `process.env.EXPO_PUBLIC_SERVER_URL` — explicit override (e.g. for physical phone on LAN).
2. If `window.location.hostname !== 'localhost'` — uses the current page's hostname with port 8765 (useful when the web app is accessed from another device on LAN).
3. Falls back to `http://localhost:8765`.

Exports:
- `WS_URL` — WebSocket URL (`ws://...`), appends `/ws/terminal`.
- `HTTP_API` — HTTP base URL.
- `SERVER_PORT` — `8765`.
- `XTERM_CSS` — full minified xterm CSS string, injected at runtime to avoid Metro CSS import issues.

---

## 6. Data Flow

### Terminal tab (live PTY)

```
User types in xterm
       │
       ▼
WebSocket.send({ type: 'input', data: '<keystroke>' })
       │
       ▼
server: shell_buffer += data
       │
       ├── if complete line → check_command() via LangGraph policy
       │       ├── blocked → send { type: 'policy', data: '<reason>\r\n' } → xterm displays it
       │       └── allowed → os.write(master, data)
       │
       └── if interactive_app → os.write(master, data) directly
       │
       ▼
PTY master fd → bash process
       │
       ▼ (output via _reader thread)
asyncio.Queue → forward_output coroutine
       │
       ▼
WebSocket.send({ type: 'output', data: '<terminal output>' })
       │
       ▼
xterm.write(data)  →  displayed in browser/app
```

### Chat tab (current — mock)

```
User types → onChangeText → input state
User presses send → sendMessage()
  → appends user message to messages[]
  → setTimeout 800ms
  → appends mock assistant reply
  → setIsGenerating(false)
```

---

## 7. Policy System

The LangGraph policy runs on **every complete shell line** before it reaches the PTY. It is bypassed in two cases:

1. The input contains an ESC character (`\x1b`) — raw escape sequences pass through (arrow keys, etc.).
2. `interactive_app = True` — after `opencode` has been launched.

The policy is designed to keep the bash shell confined to `Aether ai testing/`:

- **No `..`** — prevents escaping the sandbox via relative paths.
- **No `/` prefix** — prevents accessing arbitrary filesystem locations.
- **No `cd`** — prevents changing the working directory.
- **No destructive commands** — `rm`, `sudo`, `mkfs`, `shutdown`, `reboot`, `chmod`, `chown`.

This is a **development-level sandbox**, not a security boundary. For production, the server should run inside a container or OS-level sandbox.

---

## 8. WebSocket Protocol

All messages are JSON. Port: **8765** by default.

### Server → Client

| `type` | Fields | Description |
|---|---|---|
| `session` | `id`, `cwd`, `mode` | Sent immediately on connect |
| `output` | `data: string` | Raw PTY output (ANSI escape codes included) |
| `policy` | `data: string` | Policy block message (rendered in red in terminal) |
| `mode` | `mode: 'application'`, `name: 'opencode'` | Sent when interactive app mode activates |

### Client → Server

| `type` | Fields | Description |
|---|---|---|
| `input` | `data: string` | Keystrokes to write to the PTY |
| `resize` | `cols: number`, `rows: number` | Terminal resize event |
| `detach` | — | Cleanly disconnect the PTY session |

---

## 9. Running the Project

### Server

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
./run.sh
# Server runs at http://localhost:8765
# WebSocket at ws://localhost:8765/ws/terminal
```

Override port: `PORT=8766 ./run.sh`

### PC launcher (optional — for running OpenCode)

```bash
./pc/launch_opencode.sh
# Opens a graphical terminal in "Aether ai testing/" and starts opencode
# Requires opencode to be installed and on PATH
```

### Web / Mobile UI

```bash
cd mobile
npm install
npm run web          # Opens at http://localhost:8081
# or
npm start            # Expo DevTools + QR code for mobile
```

**Physical phone on LAN:**
```bash
EXPO_PUBLIC_SERVER_URL=http://<your-lan-ip>:8765 npm start
```

### Smoke test

```bash
cd server
source .venv/bin/activate
python test_smoke.py   # Server must already be running
```

---

## 10. Known Bugs Fixed

| Bug | Root Cause | Fix |
|---|---|---|
| White screen on Chat tab | `ChatInput` called `inputRef.current.setNativeProps()` in a `useEffect` — `setNativeProps` doesn't exist on `react-native-web` | Removed the `useEffect`; `maxHeight` was already set as a direct prop on `<TextInput>` |
| Chat tab FlatList invisible | `FlatList` had no `style` prop — on web, `react-native-web` doesn't auto-fill flex space without an explicit `style={{ flex: 1 }}` | Added `style={styles.scrollArea}` (`flex: 1`) to the `FlatList` |

---

## 11. What's Not Yet Implemented

| Feature | Status |
|---|---|
| Chat backend | UI only — mock data. No real LLM calls wired up |
| Voice call | UI only — `VoiceCallOverlay` is visual-only, no audio capture/playback |
| User authentication | None |
| Session persistence | No chat history saved to disk or database |
| OpenCode status in UI | `{"type": "mode"}` message received but not visually reflected in the UI |
| Native mobile build | `android/` folder removed (was unmodified boilerplate). Run `npx expo prebuild` to regenerate |
| Sidebar on web (fixed layout) | Sidebar is always a floating overlay — on wide screens it could be a fixed left panel |
| Error handling in TerminalScreen | WebSocket disconnects show a message in the terminal but no reconnect logic |
