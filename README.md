# BA_EM_Interaction

This repository contains a simple example of two agents iteratively creating and reviewing slide content. A minimal web interface built with FastAPI streams tokens from each agent as they converse.

## Running the demo UI

1. Install dependencies (FastAPI and Uvicorn are already included in this environment. Install `copilotkit` if you want live agent output):
   ```bash
   pip install copilotkit
   ```
2. Start the server:
   ```bash
   uvicorn app:app --reload
   ```
3. Open `http://localhost:8000/` in your browser. Enter a prompt to watch the agents stream their responses.

`app.py` will automatically use your CopilotKit agent if the library is installed and `CopilotKit.get_agent("agent")` is defined. Otherwise a fake stream is used for demonstration.
