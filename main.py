#test
print(1+1)

from crewai import Crew, Agent, Task, LLM

ollama_llm = LLM(
    model="ollama/qwen2.5:3b_lcg",
    base_url="http://localhost:11434",
)

research_agent = Agent(
    role="You are a helpful assistant that can answer questions about the web.",
    goal="Answer the user's question.",
    backstory="You have a creative mind to answer questions",
    llm=ollama_llm,
    verbose=True
)

task = Task(
  description="Answer the following question: {question}",
  expected_output="A detailed and accurate answer to the user's question.",
  agent=research_agent
)

crew = Crew(
    agents=[research_agent],
    tasks=[task],
)

results = crew.kickoff(inputs={"question": "What is the capital of France?"})
print(results)