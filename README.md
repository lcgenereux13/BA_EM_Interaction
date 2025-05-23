# BA_EM_Interaction

This repository contains a simple example of two agents iteratively creating and reviewing slide content. A minimal web interface built with FastAPI streams tokens from each agent as they converse.

## Running the demo UI

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   The `copilotkit` package is optional and only needed for the demo UI.
2. Start the server:
   ```bash
   uvicorn app:app --reload
   ```
3. Open `http://localhost:8000/` in your browser. Enter a prompt to watch the agents stream their responses.

`app.py` will automatically use your CopilotKit agent if the library is installed and `CopilotKit.get_agent("agent")` is defined. Otherwise a fake stream is used for demonstration.

## Running the iterative crew script

With the dependencies installed, you can run `iterative_crew.py` directly:

```bash
python iterative_crew.py
```

The script expects a local LLM accessible at `http://localhost:11434`.
