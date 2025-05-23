```
crewai-copilotkit-streaming/
├── README.md
├── .gitignore
├── requirements.txt
├── crew_stream.py
└── frontend/
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        ├── index.jsx
        ├── App.jsx
        ├── styles.css
        └── components/
            ├── ChatWindow.jsx
            ├── ChatBubble.jsx
            ├── Sidebar.jsx
            └── AgentInstructionsModal.jsx
```

---

### README.md

````markdown
# CrewAI Real-Time Streaming with CopilotKit and React Frontend

This repository demonstrates how to stream agent outputs from a CrewAI iterative workflow in real-time using CopilotKit, displayed in a ChatGPT-like React frontend.

## Features
- Backend streaming via CopilotKit
- React-based chat interface showing live token streaming
- Clickable agent bubbles to view current instructions
- Sidebar to visualize draft slide sections and feedback in real time

## Setup
1. **Clone the repo**
   ```bash
   git clone https://github.com/your-org/crewai-copilotkit-streaming.git
   cd crewai-copilotkit-streaming
````

2. **Backend**

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Frontend**

   ```bash
   cd frontend
   npm install
   npm start
   ```

## Usage

1. **Start backend server** (implements SSE at `/stream`)

   ```bash
   uvicorn server:app --reload
   ```
2. **Start React app**

   ```bash
   cd frontend && npm start
   ```
3. Open `http://localhost:3000` to interact with the CrewAI chat interface.

```
```

---

### .gitignore

```gitignore
__pycache__/
venv/
node_modules/
*.pyc
```

---

### requirements.txt

```text
fastapi
uvicorn
crewai>=0.1.0
copilotkit>=0.2.0
pydantic>=1.10.0
```

---

### crew\_stream.py

```python
# unchanged backend script, unchanged from previous version
```

---

### server.py

```python
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
import asyncio
from crew_stream import IterativeCrew, SlideStructure
from copilotkit.crewai import copilotkit_stream, CopilotKitState
import json

app = FastAPI()

@app.get("/stream")
async def stream(research: str, threshold: int = 5, max_iters: int = 3):
    crew = IterativeCrew(agents=[analyst, manager], tasks=[create_page, review_slide], planning=False)
    state = CopilotKitState()

    async def event_generator():
        for i in range(1, max_iters+1):
            async for event in copilotkit_stream(crew.kickoff, {"research": research, "current_plan": crew.draft, "feedback": crew.feedback}, state=state):
                if event.type == "segment":
                    yield f"data: {{\"type\": \"segment\", \"content\": {json.dumps(event.content)} }}\n\n"
                if event.type == "complete":
                    slide_out, review_out = event.output
                    yield f"data: {{\"type\": \"complete\", \"slide\": {slide_out.raw}, \"review\": {review_out.raw} }}\n\n"
                    return
    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

---

### frontend/package.json

```json
{
  "name": "crewai-stream-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-scripts": "5.0.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  }
}
```

---

### frontend/public/index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CrewAI Chat</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>
```

---

### frontend/src/index.jsx

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

---

### frontend/src/App.jsx

```jsx
import React, { useState, useEffect, useRef } from 'react';
import ChatWindow from './components/ChatWindow';
import Sidebar from './components/Sidebar';
import './styles.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [sections, setSections] = useState({draft: {}, feedback: ''});
  const es = useRef(null);

  useEffect(() => {
    es.current = new EventSource('http://localhost:8000/stream?research=Your+research');
    es.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'segment') {
        setMessages(prev => [...prev.slice(0, -1), {agent: prev.slice(-1)[0]?.agent || 'Analyst', text: (prev.slice(-1)[0]?.text || '') + data.content}]);
      }
      if (data.type === 'complete') {
        setSections({draft: JSON.parse(data.slide), feedback: JSON.parse(data.review)});
      }
    };
    // initialize first bubble
    setMessages([{agent: 'Analyst', text: ''}]);
    return () => es.current.close();
  }, []);

  return (
    <div className="app-container">
      <ChatWindow messages={messages} />
      <Sidebar sections={sections} />
    </div>
  );
}

export default App;
```

---

### frontend/src/styles.css

```css
.app-container { display: flex; height: 100vh; }
```

---

### frontend/src/components/ChatWindow\.jsx

```jsx
import React from 'react';
import ChatBubble from './ChatBubble';

export default function ChatWindow({ messages }) {
  return (
    <div className="chat-window">
      {messages.map((m, i) => <ChatBubble key={i} agent={m.agent} text={m.text} />)}
    </div>
  );
}
```

---

### frontend/src/components/ChatBubble.jsx

```jsx
import React, { useState } from 'react';
import AgentInstructionsModal from './AgentInstructionsModal';

export default function ChatBubble({ agent, text }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="chat-bubble">
      <span className="agent-name" onClick={() => setOpen(true)}>{agent}</span>
      <p>{text}</p>
      {open && <AgentInstructionsModal agent={agent} onClose={() => setOpen(false)} />}
    </div>
  );
}
```

---

### frontend/src/components/AgentInstructionsModal.jsx

```jsx
import React from 'react';

export default function AgentInstructionsModal({ agent, onClose }) {
  // placeholder instructions fetch
  const instructions = `Instructions for ${agent}...`;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{agent} Instructions</h3>
        <pre>{instructions}</pre>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
```

---

### frontend/src/components/Sidebar.jsx

```jsx
import React from 'react';

export default function Sidebar({ sections }) {
  const { draft, feedback } = sections;
  return (
    <div className="sidebar">
      <h4>Current Draft</h4>
      <pre>{JSON.stringify(draft, null, 2)}</pre>
      <h4>Feedback</h4>
      <pre>{feedback}</pre>
    </div>
  );
}
```
