import asyncio
import json
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

# Simple wrapper to mimic a minimal CopilotKit interface
try:
    from copilotkit import CopilotKitRemoteEndpoint as RealCopilotKit
except Exception:  # pragma: no cover - library likely missing in this env
    RealCopilotKit = None

class SimpleCopilotKit:
    """Minimal agent registry used if the real CopilotKit is unavailable."""

    def __init__(self):
        self._agents = {}

    def register_agent(self, name: str, agent) -> None:
        self._agents[name] = agent

    def get_agent(self, name: str):
        return self._agents.get(name)

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
    with open("static/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())


async def fake_agent_stream(prompt: str):
    """Simulate streaming tokens from two agents."""
    messages = [
        ("agent1", f"Received prompt: {prompt}"),
        ("agent2", "Analyzing request"),
        ("agent1", "Providing initial response"),
        ("agent2", "Reviewing response"),
        ("agent1", "Finalizing output"),
    ]
    for agent, text in messages:
        for token in text.split():
            yield agent, token
            await asyncio.sleep(0.2)


async def copilot_agent_stream(prompt: str):
    """Yield tokens from a CopilotKit agent if available."""
    if kit is None:
        raise RuntimeError("CopilotKit is not installed")

    # Retrieve the streaming crew agent registered below
    agent = kit.get_agent("crew")
    async for token in agent.stream(prompt):
        yield agent.name, token


@app.get("/stream")
async def stream(prompt: str):
    async def event_generator():
        stream_fn = copilot_agent_stream if kit else fake_agent_stream
        async for agent, token in stream_fn(prompt):
            data = json.dumps({"agent": agent, "token": token})
            yield f"data: {data}\n\n"
    return StreamingResponse(event_generator(), media_type="text/event-stream")


# Instantiate and register the crew agent
from iterative_crew import CopilotCrewAgent

if RealCopilotKit:
    kit = SimpleCopilotKit()
else:
    kit = SimpleCopilotKit()

kit.register_agent("crew", CopilotCrewAgent())

