from __future__ import annotations

from typing import TypedDict

from langgraph.graph import END, START, StateGraph


class CommandState(TypedDict, total=False):
    command: str
    allowed: bool
    reason: str


def _policy_node(state: CommandState) -> CommandState:
    command = state.get("command", "").strip()
    lowered = command.lower()
    blocked = (".." in command or command.startswith("/") or "cd " in lowered)
    blocked_tokens = (" rm ", " rm\t", "sudo", "mkfs", "shutdown", "reboot", "chmod", "chown")
    blocked = blocked or any(token in f" {lowered} " for token in blocked_tokens)
    if not command:
        return {"allowed": True, "reason": "empty input"}
    if blocked:
        return {"allowed": False, "reason": "command blocked by Aether testing-root policy"}
    return {"allowed": True, "reason": "command accepted"}


def build_command_graph():
    graph = StateGraph(CommandState)
    graph.add_node("policy", _policy_node)
    graph.add_edge(START, "policy")
    graph.add_edge("policy", END)
    return graph.compile()


command_graph = build_command_graph()


def check_command(command: str) -> CommandState:
    return command_graph.invoke({"command": command})
