from pydantic import BaseModel, Field
from typing import List, Dict
import json
import ast

from crewai import Crew, Agent, Task, LLM

# Use a local Ollama instance for all LLM interactions
ollama_llm = LLM(
    model="ollama/qwen2.5:3b_lcg",
    base_url="http://localhost:11434",
)

class SlideStructure(BaseModel):
    title: str
    subtitle: str
    sections: List[Dict[str, List[str]]]

analyst = Agent(
    role="McKinsey Business Analyst",
    goal="Develop a compelling slide based on unstructured research for: {research}.",
    backstory=(
        "As a Business Analyst at McKinsey & Company, you collaborate with consulting teams to address complex client challenges.\n"
        "Your strengths include:\n"
        "- Gathering information from multiple sources (client data, market research, expert interviews);\n"
        "- Structuring complex problems using MECE principles (Mutually Exclusive, Collectively Exhaustive);\n"
        "- Developing hypotheses and iterating them through rigorous analysis;\n"
        "- Communicating insights clearly and professionally.\n\n"
        "You follow McKinsey's hypothesis-driven approach and ensure each insight is backed by evidence.\n"
        "You expect your researchers to sequentially use the following tools: (a) web research, (b) unstructured data retrieval (RAG), (c) structured data retrieval.\n"
    ),
    verbose=True,
    allow_delegation=False,
    llm=ollama_llm
)

create_page = Task(
    name="Synthesize unstructured research into PowerPoint slide structure",
    description=(
        "Use provided data to produce the structure of a PowerPoint slide in response to the prompt: {research}.\n"
        "You must consider any existing drafts or feedback:\n draft:{current_plan}\n feedback: {feedback}.\n\n"
        "Steps:\n"
        "1. Read the provided research to gather relevant facts, perspectives, and data.\n"
        "2. Derive a central message or insight based on the research (this becomes the slide title).\n"
        "3. Identify a supporting subtitle that frames the slide’s context or significance.\n"
        "4. Organize insights into 3–5 MECE sections. Each section should have a clear, short section title and 3-7 concise sub-bullets.\n"
        "5. Prioritize data-driven insights and use specific examples, metrics, or named entities where appropriate.\n"
        "6. Review the structure for logical flow, clarity, and standalone readability.\n"
        "7. Modify the wording of all items such that they are action oriented and can be understand and read as standalone items.\n"
        "8. Return a JSON object in the format:\n"
        "{\n"
        "  'title': str,\n"
        "  'subtitle': str,\n"
        "  'sections': [\n"
        "    { 'section_title': str, 'section_bullets': [str, str, ...] },\n"
        "    ...\n"
        "  ]\n"
        "}"
    ),
    expected_output='A JSON with slide "title", "subtitle", and a list of sections containing "section_title" and "section_bullets".',
    output_pydantic=SlideStructure,
    agent=analyst
)

manager = Agent(
    role="Engagement Manager",
    goal="Review a draft slide for structure, clarity, insightfulness, and client-readiness.",
    backstory=(
        "You are an Engagement Manager at McKinsey & Company. You are responsible for ensuring the quality and impact of all client-facing materials.\n"
        "Your expertise lies in:\n"
        "- Structuring compelling narratives using the Pyramid Principle,\n"
        "- Distilling complex analysis into clear insights,\n"
        "- Coaching junior consultants on effective communication,\n"
        "- Spotting inconsistencies, vague statements, or misaligned messaging.\n\n"
        "You are methodical, direct, and hold slides to the highest standards of clarity, actionability, and insight. Your job is to flag every issue before a slide reaches the client."
    ),
    verbose=True,
    allow_delegation=False,
    llm=ollama_llm
)

review_slide = Task(
    name="Review and critique a slide for quality and clarity",
    description=(
        "Review the provided slide (in JSON format) against 10 dimensions of slide effectiveness: \n\n"
        "1. **Action Title** – Is the title clear, action-oriented, and standalone?\n"
        "2. **Pyramid Principle** – Is the conclusion upfront, followed by reasons and supporting data?\n"
        "3. **Key Messages** – Are they prioritized, clear, concise, and aligned with the title? Are there minimum 3 bullets per section?\n"
        "4. **Supporting Text** – Is it relevant, simple, quantified, and non-redundant?\n"
        "5. **Logical Flow** – Does the structure guide the reader from insight to recommendation?\n"
        "6. **Language and Tone** – Is the language formal, active, precise, and free from ambiguity?\n"
        "7. **Data and Insights** – Are insights derived from data and not just restated facts?\n"
        "8. **Consistency** – Are terms, units, acronyms, and formats used consistently?\n"
        "9. **Call to Action (if applicable)** – Is there a clear, specific recommendation?\n"
        "10. **Proofreading** – Are grammar, punctuation, and sentence flow error-free?\n\n"
        "Return your feedback as a JSON object containing an overall rating (1-5), a list of specific improvement comments (each tagged with a slide element), and a final summary recommendation."
    ),
    expected_output=(
        'A JSON with:\n'
        '{\n'
        '  "rating": int (1-5),\n'
        '  "comments": [\n'
        '    { "element": str, "comment": str },\n'
        '    ...\n'
        '  ],\n'
        '  "summary": str\n'
        '}'
    ),
    output_pydantic=None,
    agent=manager,
    context=[create_page]
)

# 6) IterativeCrew with draft as dict only
class IterativeCrew(Crew):
    draft:    dict = Field(default_factory=lambda: {"title":"", "subtitle":"", "sections":[]})
    feedback: str  = ""

    def _extract_json(self, blob: str) -> dict:
        """
        1) Try strict json.loads(blob).
        2) If that fails, grab substring from first '{' to last '}' and try json.loads.
        3) If still fails, fallback to ast.literal_eval.
        """
        try:
            return json.loads(blob)
        except json.JSONDecodeError:
            # attempt to grab the JSON object substring
            start = blob.find("{")
            end   = blob.rfind("}")
            if start != -1 and end != -1 and end > start:
                sub = blob[start:end+1]
                try:
                    return json.loads(sub)
                except json.JSONDecodeError:
                    pass
            # final fallback
            try:
                return ast.literal_eval(blob)
            except Exception as e:
                raise ValueError(f"Unable to parse JSON from:\n{blob}") from e

    def refine_until_good(self, research: str, threshold: int = 5, max_iters: int = 3) -> SlideStructure:
        for i in range(1, max_iters+1):
            print(f"\n––– pass {i} –––")
            out = self.kickoff({
                "research":     research,
                "current_plan": self.draft,
                "feedback":     self.feedback
            })

            slide_out, review_out = out.tasks_output

            # 1) parse the slide draft into a plain dict
            if getattr(slide_out, "pydantic", None):
                new_dict = slide_out.pydantic.model_dump()
            else:
                new_dict = self._extract_json(slide_out.raw)

            # 2) parse the manager review
            review_dict = self._extract_json(review_out.raw)
            rating = review_dict.get("rating", 0)
            print(f"Manager rated: {rating}/5")

            if rating >= threshold:
                print("✅ Threshold reached—done!")
                return SlideStructure(**new_dict)

            # otherwise update for next pass
            self.draft    = new_dict
            # flatten comments into a string
            self.feedback = "\n".join(f"{c['element']}: {c['comment']}"
                                      for c in review_dict.get("comments", []))

        print("⚠️ Reached max iterations; returning latest draft.")
        return SlideStructure(**self.draft)


# 7) Run the loop
if __name__ == "__main__":
    crew = IterativeCrew(
        agents=[analyst, manager],
        tasks=[create_page, review_slide],
        planning=False
    )
    final_slide = crew.refine_until_good(research_report)

    print("\n=== FINAL SLIDE STRUCTURE ===")
    print(final_slide.model_dump_json(indent=2))

