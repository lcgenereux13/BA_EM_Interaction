import crewai
print(crewai.__version__)  
# should be 0.121.0

import crewai.utilities.events as ev
print("default_emitter" in dir(ev))  
# → True

import importlib.util
print(importlib.util.find_spec("crewai.utilities.events.llm_events") is not None)  
# → True

print(importlib.util.find_spec("crewai.utilities.events.agent_events") is not None)  
# → True

import crewai.utilities.events as ev
print([n for n in dir(ev) if not n.startswith("_")])