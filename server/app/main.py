from __future__ import annotations

import asyncio
import contextlib
import fcntl
import json
import os
import pty
import select
import struct
import subprocess
import termios
import threading
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .agent import check_command

DEFAULT_ROOT = Path(__file__).resolve().parents[2] / "Aether ai testing"
MAX_MESSAGE_BYTES = int(os.environ.get("AETHER_MAX_WS_MESSAGE_BYTES", "65536"))
MAX_CONNECTIONS = int(os.environ.get("AETHER_MAX_TERMINAL_CONNECTIONS", "8"))


def resolve_testing_root() -> Path:
    configured = os.environ.get("AETHER_TESTING_ROOT")
    root = Path(configured).expanduser() if configured else DEFAULT_ROOT
    root = root.resolve()
    root.mkdir(parents=True, exist_ok=True)
    if not root.is_dir():
        raise RuntimeError(f"AETHER_TESTING_ROOT is not a directory: {root}")
    return root


ROOT = resolve_testing_root()
ROOT.mkdir(parents=True, exist_ok=True)

terminal_slots = asyncio.Semaphore(MAX_CONNECTIONS)
active_sessions: set[tuple[subprocess.Popen, int]] = set()


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan — runs startup code before yield, shutdown code after."""
    yield  # application runs here
    # Shutdown: clean up all active PTY sessions
    for process, master in list(active_sessions):
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                process.kill()
        try:
            os.close(master)
        except OSError:
            pass
    active_sessions.clear()


app = FastAPI(title="Aether AI Terminal Server", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def _reader(fd: int, queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
    while True:
        ready, _, _ = select.select([fd], [], [], 0.5)
        if fd in ready:
            try:
                data = os.read(fd, 4096)
            except OSError:
                break
            if not data:
                break
            asyncio.run_coroutine_threadsafe(queue.put(data.decode(errors="replace")), loop)


def _resize(fd: int, cols: int, rows: int) -> None:
    cols = max(20, min(int(cols), 300))
    rows = max(5, min(int(rows), 120))
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))


@app.get("/health")
async def health():
    return {"ok": True, "testing_root": str(ROOT)}


@app.post("/api/command/check")
async def command_check(payload: dict):
    command = payload.get("command", "")
    if not isinstance(command, str):
        return {"allowed": False, "reason": "command must be a string"}
    if len(command.encode()) > MAX_MESSAGE_BYTES:
        return {"allowed": False, "reason": "command is too large"}
    result = check_command(command)
    return result


@app.websocket("/ws/terminal")
async def terminal(websocket: WebSocket):
    if terminal_slots.locked():
        await websocket.close(code=1013, reason="terminal connection limit reached")
        return
    await terminal_slots.acquire()
    await websocket.accept()
    loop = asyncio.get_running_loop()
    master, slave = pty.openpty()
    _resize(master, 100, 30)
    env = os.environ.copy()
    env.update({"AETHER_TESTING_ROOT": str(ROOT), "AETHER_TERMINAL": "1"})
    process = subprocess.Popen(
        ["bash", "--noprofile", "--norc"], stdin=slave, stdout=slave, stderr=slave,
        cwd=ROOT, env=env, close_fds=True,
    )
    os.close(slave)
    active_sessions.add((process, master))
    queue: asyncio.Queue[str] = asyncio.Queue()
    threading.Thread(target=_reader, args=(master, queue, loop), daemon=True).start()
    session_id = str(uuid.uuid4())
    interactive_app = False
    shell_buffer = ""
    await websocket.send_json({"type": "session", "id": session_id, "cwd": str(ROOT), "mode": "shell"})

    async def forward_output():
        while True:
            text = await queue.get()
            await websocket.send_json({"type": "output", "data": text})

    forwarder = asyncio.create_task(forward_output())
    try:
        while True:
            raw_message = await websocket.receive_text()
            if len(raw_message.encode()) > MAX_MESSAGE_BYTES:
                await websocket.send_json({"type": "error", "message": "message is too large"})
                continue
            try:
                message: Any = json.loads(raw_message)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "message must be valid JSON"})
                continue
            if not isinstance(message, dict):
                await websocket.send_json({"type": "error", "message": "message must be an object"})
                continue
            message_type = message.get("type")
            if message_type == "resize":
                try:
                    _resize(master, int(message.get("cols", 100)), int(message.get("rows", 30)))
                except (TypeError, ValueError, OSError):
                    await websocket.send_json({"type": "error", "message": "invalid terminal size"})
                continue
            if message_type == "detach":
                break
            if message_type != "input":
                await websocket.send_json({"type": "error", "message": "unsupported message type"})
                continue
            data = message.get("data", "")
            if not isinstance(data, str):
                await websocket.send_json({"type": "error", "message": "input data must be a string"})
                continue
            if len(data.encode()) > MAX_MESSAGE_BYTES:
                await websocket.send_json({"type": "error", "message": "input is too large"})
                continue
            if not interactive_app:
                shell_buffer += data
            complete_shell_line = shell_buffer if ("\n" in shell_buffer or "\r" in shell_buffer) else ""
            # Validate shell commands, but preserve raw keystrokes and input for
            # an interactive foreground application such as OpenCode.
            if not interactive_app and complete_shell_line and "\x1b" not in complete_shell_line:
                result = check_command(complete_shell_line.strip())
                if not result["allowed"]:
                    shell_buffer = ""
                    await websocket.send_json({"type": "policy", "data": result["reason"] + "\r\n"})
                    continue
            os.write(master, data.encode())
            if not interactive_app and complete_shell_line:
                command_name = complete_shell_line.strip().split(" ", 1)[0]
                shell_buffer = ""
            else:
                command_name = ""
            if not interactive_app and command_name in {"opencode", "opencode.cmd"}:
                interactive_app = True
                await websocket.send_json({"type": "mode", "mode": "application", "name": "opencode"})
    except (WebSocketDisconnect, RuntimeError, ValueError):
        pass
    finally:
        forwarder.cancel()
        try:
            process.terminate()
            process.wait(timeout=2)
        except (OSError, subprocess.TimeoutExpired):
            process.kill()
            process.wait(timeout=2)
        active_sessions.discard((process, master))
        try:
            os.close(master)
        except OSError:
            pass
        terminal_slots.release()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "8765")),
        reload=False,
    )
