from fastapi.testclient import TestClient

from app.main import app


def test_health_and_command_policy():
    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        assert health.json()["ok"] is True

        allowed = client.post("/api/command/check", json={"command": "printf ok"})
        assert allowed.json()["allowed"] is True

        blocked = client.post("/api/command/check", json={"command": "sudo reboot"})
        assert blocked.json()["allowed"] is False


def test_command_payload_validation():
    with TestClient(app) as client:
        invalid = client.post("/api/command/check", json={"command": 42})
        assert invalid.json()["allowed"] is False
