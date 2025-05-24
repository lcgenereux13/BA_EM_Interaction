# BA_EM_Interaction

This repository contains a simple example of two agents iteratively creating and reviewing slide content. A minimal web interface built with FastAPI streams tokens from each agent as they converse.
The `static/index.html` page now uses Tailwind CSS and an improved layout inspired by the React components located in the `frontend` directory. The UI posts your prompt to a new `/start` endpoint and then streams updates from `/stream/{id}` for real-time interaction.

### UI styling

The frontend uses the `new-york` design style from **shadcn/ui** and relies on the system font stack for a clean, modern look. The base body styles are defined in `client/src/index.css`:

```css
body {
  @apply font-sans antialiased bg-background text-foreground;
}
```

The design style is specified in `frontend/components.json`:

```json
{
    "style": "new-york",
    "...": "..."
}
```

A dark/light theme is implemented via CSS variables, and the `@tailwindcss/typography` plugin is enabled in `tailwind.config.ts` to improve formatting of rich text content.

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
3. Open `http://localhost:8000/` in your browser. Enter a prompt and press **Start Crew** to kick off the crew. The page sends your prompt via `/start` and then streams tokens from `/stream/{id}` as they are produced. Each batch of messages is grouped under a "Run N" heading so you can follow the crew's iterative passes.

`app.py` registers the iterative crew as a CopilotKit agent named `crew`. When
the `copilotkit` package is available, the UI streams tokens from this agent in
real time. Otherwise a small fake generator is used for demonstration.

### Improved token streaming

Tokens streamed from CrewAI sometimes contain JSON structures without line
breaks. The `appendToken` helper in `static/index.html` now splits tokens on
JSON punctuation and indents nested lists or objects so they display clearly as
the data arrives.

**Before**

```
Here is some text and a list [1,2,3] and a dict {'key': 'value', 'k2': [4, 5]} and a nested dict {'outer': {'inner': [6,7]}, 'another': 8}
```

**After**

```
Here is some text and a list
[
  1,
  2,
  3
]

and a dict
{
  'key': 'value',
  'k2': [
    4,
    5
  ]
}

and a nested dict
{
  'outer': {
    'inner': [
      6,
      7
    ]
  },
  'another': 8
}
```

## Running the iterative crew script

With the dependencies installed, you can run `iterative_crew.py` directly:

```bash
python iterative_crew.py
```

The script expects a local LLM accessible at `http://localhost:11434`.


Important: https://github.com/CopilotKit/CopilotKit/tree/main/docs/content/docs/crewai-crews


