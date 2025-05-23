import asyncio
import json
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

# Placeholder imports for CopilotKit and agents
try:
    from copilotkit import CopilotKit
except ImportError:  # pragma: no cover - library likely missing in this env
    CopilotKit = None

app = FastAPI()
app.mount("/", StaticFiles(directory="static", html=True), name="static")


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

    # This assumes you have configured a CopilotKit agent elsewhere in your code
    # named "agent" that exposes an async `stream` method yielding text tokens.
    agent = kit.get_agent("agent")
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


# placeholder CopilotKit integration
kit = CopilotKit() if CopilotKit else None

