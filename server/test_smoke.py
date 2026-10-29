import json
from pathlib import Path
from urllib.request import urlopen

from websockets.sync.client import connect


with urlopen("http://127.0.0.1:8765/health") as response:
    health = json.load(response)
    assert health["ok"] is True

with connect("ws://127.0.0.1:8765/ws/terminal") as socket:
    session = json.loads(socket.recv())
    assert session["type"] == "session"
    assert session["mode"] == "shell"
    socket.send(json.dumps({"type": "resize", "cols": 100, "rows": 30}))
    socket.send(json.dumps({"type": "input", "data": "mkdir -p smoke_test\n"}))
    for _ in range(10):
        message = json.loads(socket.recv())
        if message.get("type") == "output" and "smoke_test" in message.get("data", ""):
            break

root = Path(__file__).resolve().parents[1] / "Aether ai testing"
assert (root / "smoke_test").is_dir(), root
print(f"PTY smoke test passed: {root / 'smoke_test'}")
