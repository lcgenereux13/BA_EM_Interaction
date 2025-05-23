# BA_EM_Interaction

This repository contains a simple example of two agents iteratively creating and reviewing slide content. A minimal web interface built with FastAPI streams tokens from each agent as they converse.
The `static/index.html` page now uses Tailwind CSS and an improved layout inspired by the React components located in the `frontend` directory. All application logic remains unchanged and still communicates with the `/stream` endpoint for real-time updates.

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
3. Open `http://localhost:8000/` in your browser. Enter a prompt and press **Start Crew** to kick off the crew. Tokens from each agent now stream to the page as soon as they are produced. Each batch of messages is grouped under a "Run N" heading so you can follow the crew's iterative passes.

`app.py` registers the iterative crew as a CopilotKit agent named `crew`. When
the `copilotkit` package is available, the UI streams tokens from this agent in
real time. Otherwise a small fake generator is used for demonstration.

## Running the iterative crew script

With the dependencies installed, you can run `iterative_crew.py` directly:

```bash
python iterative_crew.py
```

The script expects a local LLM accessible at `http://localhost:11434`.


Important: https://github.com/CopilotKit/CopilotKit/tree/main/docs/content/docs/crewai-crews


