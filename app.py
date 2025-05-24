import asyncio
import json
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel
from uuid import uuid4
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

# In-memory store for prompts keyed by a short ID
PROMPTS: dict[str, str] = {}


@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
    with open("static/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())


class PromptIn(BaseModel):
    prompt: str


@app.post("/start")
async def start(prompt_in: PromptIn) -> dict[str, str]:
    """Store the prompt and return a short ID for streaming."""
    pid = uuid4().hex
    PROMPTS[pid] = prompt_in.prompt
    return {"id": pid}


async def fake_agent_stream(prompt: str):
    """Simulate streaming tokens from two agents."""
    messages = [
        ("agent1", f"Received prompt: {prompt}"),
        ("agent2", "Analyzing request"),
        ("agent1", "Providing initial response"),
        ("agent2", "Reviewing response"),
        ("agent1", "Finalizing output"),
    ]
    for run, (agent, text) in enumerate(messages, start=1):
        for token in text.split():
            yield agent, token, run
            await asyncio.sleep(0.2)


async def copilot_agent_stream(prompt: str):
    """Yield tokens from a CopilotKit agent if available."""
    if kit is None:
        raise RuntimeError("CopilotKit is not installed")

    # Retrieve the streaming crew agent registered below
    agent = kit.get_agent("crew")
    async for agent_name, token, run in agent.stream(prompt):
        yield agent_name, token, run


@app.get("/stream/{pid}")
async def stream(pid: str):
    """Stream tokens for the prompt associated with ``pid``."""
    prompt = PROMPTS.pop(pid, None)
    if prompt is None:
        return StreamingResponse(iter(()), media_type="text/event-stream")

    async def event_generator():
        stream_fn = copilot_agent_stream if kit else fake_agent_stream
        async for agent, token, run in stream_fn(prompt):
            data = json.dumps({"agent": agent, "token": token, "run": run})
            yield f"data: {data}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# Instantiate and register the crew agent
from iterative_crew import CopilotCrewAgent

if RealCopilotKit:
    kit = SimpleCopilotKit()
else:
    kit = SimpleCopilotKit()

kit.register_agent("crew", CopilotCrewAgent())

