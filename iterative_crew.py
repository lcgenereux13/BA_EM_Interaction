from pydantic import BaseModel, Field
from typing import List, Dict, AsyncGenerator, Tuple
import json
import ast
import asyncio
import threading
import queue

# crewai exposes the event bus directly from the events module
from crewai.utilities.events import crewai_event_bus
from crewai.utilities.events import LLMStreamChunkEvent, AgentExecutionStartedEvent

from crewai import Crew, Agent, Task, LLM

# Use a local Ollama instance for all LLM interactions
ollama_llm = LLM(
    model="ollama/qwen2.5:3b_lcg",
    base_url="http://localhost:11434",
    stream=True,
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
    verbose=False,
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
        "{{\n"
        "  'title': str,\n"
        "  'subtitle': str,\n"
        "  'sections': [\n"
        "    {{ 'section_title': str, 'section_bullets': [str, str, ...] }},\n"
        "    ...\n"
        "  ]\n"
        "}}"
    ),
    expected_output='A JSON with slide "title", "subtitle", and a list of sections containing "section_title" and "section_bullets".',
    # Parsing through instructor often fails with local models. We'll parse the JSON ourselves.
    output_pydantic=None,
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
    verbose=False,
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
        '{{\n'
        '  "rating": int (1-5),\n'
        '  "comments": [\n'
        '    {{ "element": str, "comment": str }},\n'
        '    ...\n'
        '  ],\n'
        '  "summary": str\n'
        '}}'
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
        Parse a JSON or JSON-like string produced by the LLM.

        Strategy:
        1) Try ``json.loads`` directly.
        2) If that fails, extract the substring between the first ``{"`` and
           last ``}`` and attempt ``json.loads`` again.
        3) If single quotes are used and contain unescaped apostrophes (e.g.
           ``'There's ...'``), convert them to double quotes with a small
           state machine and retry ``json.loads``.
        4) As a last resort, fall back to ``ast.literal_eval``.
        """

        def _convert_single_quotes(s: str) -> str:
            """Convert single-quoted JSON to double-quoted JSON."""
            result: list[str] = []
            in_string = False
            i = 0
            while i < len(s):
                c = s[i]
                if c == "'":
                    if not in_string:
                        result.append('"')
                        in_string = True
                    else:
                        prev = s[i - 1] if i > 0 else ""
                        nxt = s[i + 1] if i + 1 < len(s) else ""
                        if prev == "\\":
                            # Escaped quote, keep as-is
                            result.append("'")
                        elif nxt.isalpha():
                            # Apostrophe inside a word (e.g. B.C.'s)
                            result.append("'")
                        else:
                            result.append('"')
                            in_string = False
                elif c == '"' and in_string:
                    # Escape double quotes inside a single-quoted string
                    result.append('\\"')
                else:
                    result.append(c)
                i += 1
            return "".join(result)

        def _strip_outer_braces(text: str) -> str:
            """Recursively remove duplicate outer braces."""
            trimmed = text.strip()
            while trimmed.startswith("{{") and trimmed.endswith("}}"):
                trimmed = trimmed[1:-1].strip()
            return trimmed

        try:
            return json.loads(blob)
        except json.JSONDecodeError:
            pass

        # Extract potential JSON substring
        trimmed = blob.strip()
        start = trimmed.find("{")
        end = trimmed.rfind("}")
        candidate = trimmed[start : end + 1] if start != -1 and end != -1 and end > start else trimmed

        candidate = _strip_outer_braces(candidate)

        for attempt in (candidate, _convert_single_quotes(candidate)):
            try:
                return json.loads(attempt)
            except json.JSONDecodeError:
                continue

        # final fallback
        try:
            return ast.literal_eval(candidate)
        except Exception as e:
            raise ValueError(f"Unable to parse JSON from:\n{blob}") from e

    def refine_until_good(self, research: str, threshold: int = 5, max_iters: int = 3) -> SlideStructure:
        for i in range(1, max_iters+1):
            print(f"\n––– pass {i} –––")
            out = self.kickoff({
                "research":     research,
                # crewai expects strings for interpolation variables
                "current_plan": json.dumps(self.draft),
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


class CopilotCrewAgent:
    """Expose the iterative crew as a streaming agent for CopilotKit."""

    def __init__(self, threshold: int = 5, max_iters: int = 3):
        self.name = "crew"
        self.threshold = threshold
        self.max_iters = max_iters
        self.crew = IterativeCrew(
            agents=[analyst, manager],
            tasks=[create_page, review_slide],
            planning=False,
        )

    async def stream(self, prompt: str) -> AsyncGenerator[Tuple[str, str, int], None]:
        """Yield (agent_name, token, run) tuples while refining the slide."""
        research = prompt
        for i in range(1, self.max_iters + 1):
            token_q: "queue.Queue[Tuple[str, str]]" = queue.Queue()
            current_agent = ""

            def on_agent_started(source, event: AgentExecutionStartedEvent) -> None:
                nonlocal current_agent
                role = event.agent.role
                if role == analyst.role:
                    current_agent = "analyst"
                elif role == manager.role:
                    current_agent = "manager"

            def on_chunk(source, event: LLMStreamChunkEvent) -> None:
                token_q.put((current_agent or "crew", event.chunk))

            with crewai_event_bus.scoped_handlers():
                crewai_event_bus.register_handler(AgentExecutionStartedEvent, on_agent_started)
                crewai_event_bus.register_handler(LLMStreamChunkEvent, on_chunk)

                result_container = {}

                def run_kickoff():
                    result_container["out"] = self.crew.kickoff(
                        {
                            "research": research,
                            "current_plan": json.dumps(self.crew.draft),
                            "feedback": self.crew.feedback,
                        }
                    )

                t = threading.Thread(target=run_kickoff)
                t.start()

                while t.is_alive() or not token_q.empty():
                    try:
                        agent_name, token = token_q.get_nowait()
                        yield agent_name, token, i
                    except queue.Empty:
                        await asyncio.sleep(0.05)

                t.join()

            out = result_container["out"]
            slide_out, review_out = out.tasks_output

            if getattr(slide_out, "pydantic", None):
                new_dict = slide_out.pydantic.model_dump()
            else:
                new_dict = self.crew._extract_json(slide_out.raw)

            review_dict = self.crew._extract_json(review_out.raw)
            rating = review_dict.get("rating", 0)

            # update the current draft after each pass so the UI can render it
            # incrementally as the analyst iterates on the slide
            self.crew.draft = new_dict
            yield "draft", json.dumps(self.crew.draft), i

            if rating >= self.threshold:
                break

            self.crew.feedback = "\n".join(
                f"{c['element']}: {c['comment']}" for c in review_dict.get("comments", [])
            )



# 7) Run the loop
if __name__ == "__main__":
    research_report = """
Introduction and National Overview
The September 20, 2021 federal election returned a Liberal minority government under Prime Minister Justin Trudeau. Continuity in leadership allowed existing pandemic-recovery measures, climate policies, and stimulus programs to proceed uninterrupted. As a result:

GDP Growth: Real GDP rebounded by 5.1% in 2021 and 3.4% in 2022, outpacing most G7 peers in post-COVID recovery.

Unemployment: National unemployment fell from a pandemic peak of ~9% in 2020 to near historic lows (~5%) by early 2023.

Inflation: Surged to ~8% in 2022—multi-decade highs—driven by global supply shocks and commodity prices, prompting aggressive Bank of Canada rate hikes.

Fiscal Policy: The 2022 federal budget ran a $90 billion deficit, funding housing, clean-tech, and social programs, while public debt remained around 45% of GDP.

This backdrop framed both short-term gains (strong rebound, job creation) and challenges (inflation, housing affordability). What follows is a province-by-province breakdown, an industry-level assessment, and a discussion of immediate versus long-range implications.

Province-by-Province Impacts

Province	2022 GDP Δ	Key Drivers	Federal Policy Highlights
Ontario	+3.6%	Services rebound (pro-services +8.6%, hospitality +24.9%); manufacturing +4.5%	$13 B EV battery plant subsidies; $10/day child care; housing accelerator fund
Quebec	+2.6%	Services growth led by professional services; aerospace recovery	$46 B health funding deal; Critical Minerals Strategy; EV battery components plant support
B.C.	+3.6%	Population +2.2%; major projects (LNG Canada, Trans Mountain)	Infrastructure investments; carbon tax model retained
Alberta	+5.1%	Oil & gas boom (record output); agriculture rebound	Carbon tax up to $50/ton; CCUS tax credits; Trans Mountain completion
Saskatchewan	+5.7%	Potash price surge (+75%) and record crop yields	Carbon backstop rebates; SMR exploration; trade corridor upgrades
Manitoba	+3.9%	Agriculture +20.7% post-drought; manufacturing recovery	$10/day child care; immigration influx; innovation funding
Atlantic	+1.8 – 2.9%	Construction booms; tourism & shipbuilding; population inflows	Shipbuilding contracts; Atlantic Immigration Program; disaster-relief funding
NL	–1.7%	Offshore oil outages; service-sector rebound	Bay du Nord approval; Muskrat Falls federal aid; green hydrogen R&D ties
Ontario
Service Sector drove 90% of growth in 2022, with professional services and hospitality leading; manufacturing’s recovery (+4.5%) was buoyed by easing supply-chain issues.

Housing cooled sharply as interest rates rose, with prices down ~18% from early-2022 peaks; government introduced a foreign-buyer ban and the $4 B Housing Accelerator Fund to spur supply.

EV Strategy: Major federal subsidies (up to $13 B) secured VW’s St. Thomas battery plant, projected to create 3,000 jobs and $200 B in economic activity over its lifetime.

Quebec
Broad Recovery: 16 of 20 industries expanded in 2022, led by professional services and aerospace. Unemployment fell to ~4%.

Construction declined –10% on high borrowing costs, intensifying Montreal’s housing squeeze. The federal Housing Accelerator Fund and National Housing Strategy provide targeted support.

Health Funding: The 2023 federal-provincial health accord commits $46.2 B over 10 years, bolstering personnel and reducing surgical backlogs.

British Columbia
Population Surge (+2.2%) and immigration drove housing demand and consumer spending.

Infrastructure & Energy: LNG Canada and Trans Mountain pipeline sustained construction growth; carbon tax continuity supported climate goals.

Natural Resources: Forestry woes persisted under U.S. softwood tariffs, while mining and hydro-electric exports posted record revenues ($5.8 B in 2022).

Alberta
Oil & Gas Boom: +5.1% GDP growth in 2022, with record oil sands output driving a $10.4 B provincial surplus—first since 2014.

Policy Tensions: Federal carbon tax rose to $50/ton; CCUS tax credits and hydrogen investments aim to decarbonize the sector.

Diversification Efforts: Renewables and petrochemical projects are emerging, with federal support under critical minerals and clean energy credits.

Saskatchewan
Top National Growth (+5.7%) driven by a potash-price spike (+74.8%) and crop rebound; mining and agriculture accounted for two-thirds of growth.

Carbon Policy: Federal backstop rebates for farmers; SMR research funding and trade-corridor upgrades aim to diversify the economy.

Manitoba
Historic High Growth (+3.9%), led by a 20.7% agricultural recovery and manufacturing gains.

Social Programs: Swift adoption of $10/day child care; immigration boosts workforce; Strategic Innovation Fund supports local industry.

Atlantic Provinces
Nova Scotia: +2.6% growth; construction booms from population gains; shipbuilding contracts sustain high-skilled jobs.

New Brunswick: +1.8% growth; public administration and education underpinned by equalization payments; nuclear SMR exploration.

PEI: +2.9% growth; record 3.6% population increase; resolution of U.S. potato ban and generous federal per-capita transfers.

Newfoundland & Labrador: –1.7% due to offshore oil outages; offset by service sector gains and Bay du Nord project approval; Muskrat Falls aid stabilized finances.

Major Industry Impacts
Housing & Real Estate
Boom & Bust: Home prices peaked in early 2022 (+50% over two years), then cooled 10–20% as interest rates rose; housing investment hit 8.9% of GDP before tapering off.

Federal Measures: Two-year foreign-buyer ban and a 1% tax on vacant foreign-owned homes; anti-flipping rules, TFSA for first-time buyers; $4 B Housing Accelerator Fund to incentivize municipal reforms; $1.5 B for 6,000 affordable units under Rapid Housing Initiative.

Outlook: Immigration targets (up to 500 k/year by 2025) will continue to fuel demand; success of supply-side measures is critical to long-run affordability.

Energy & Natural Resources
2022 Surge: Energy exports approached $170 B; oil/GDP growth soared; Canada ran a goods-trade surplus for the first time in years.

Carbon Pricing: Increased to $65/ton in 2023; household rebates often exceed carbon costs, making the net drag minimal (~0.6 p.p. of CPI over six years).

Clean Transition: Investment tax credits (30% for clean power, 15–40% for hydrogen, 30% for critical minerals) and CCUS credits (50%) drive a pivot toward renewables, EVs, and low-carbon processes. Bay du Nord approval and nuclear SMR agreements signal support for both traditional and emerging energy sources.

Technology & Innovation
Pandemic Boom → Market Correction: VC funding peaked at $14 B in 2021; tech layoffs occurred in 2022 (Shopify, Lightspeed, Wealthsimple) as valuations fell, but job postings remained above pre-2020 levels.

Federal Support: Renewal of the Pan-Canadian AI Strategy ($443 M); creation of the Canada Innovation Corporation ($1 B mandate); Global Talent Stream for fast skilled-worker permits; Strategic Innovation Fund for large-scale projects; quantum and biotech initiatives.

Outlook: Continued R&D funding and immigration keep Canada competitive in AI, quantum, and life sciences; commercialization remains the key challenge to boosting productivity.

Healthcare & Life Sciences
COVID Strains: Delta/Omicron waves in 2022 led to staffing shortages, surgical backlogs, and emergency federal aid (military support, rapid tests).

Health Accord: $46.2 B over 10 years for mental health, primary care, data systems, and pediatric care, plus immediate top-ups—aimed at hiring, training, and reducing wait times.

Dental & Pharmacare: Interim Canada Dental Benefit for children expanded to seniors and people with disabilities; groundwork laid for future pharmacare program.

Vaccine Sovereignty: Federal backing for Moderna’s Montreal mRNA plant and other domestic biomanufacturing to ensure future resilience.

Manufacturing & Industry
Rebound: Manufacturing GDP grew ~4% in 2022, led by transportation equipment (+11% in Ontario) and machinery; supply-chain normalization restored auto production.

EV Supply Chain: $5 B Stellantis-LG battery plant; $13 B VW battery plant—key to re-anchoring North American automotive manufacturing under USMCA and IRA incentives.

Decarbonizing Heavy Industry: $400 M for steel decarbonization; free carbon allowances and clean tech credits aim to keep Canadian steel, cement, and chemicals globally competitive.

Food & Processing: Pandemic underscored need for resilient food supply chains; federal grants bolster meat and grain processing; supply-management sectors maintained with compensation under CUSMA.

Trade & International Investment
Commodity Bonanza: High resource prices drove record export revenues; goods-trade surplus with the U.S. topped $100 B in 2022 for the first time.

Diversification: Indo-Pacific Strategy ($2.3 B) seeks new markets in Asia; CPTPP accession by new members; Canada-U.K. FTA negotiations underway.

Disputes & Resolutions: Softwood lumber duties persist; EV tax‐credit negotiations with the U.S. successfully included Canadian-assembled vehicles in IRA benefits; digital and CBAM rules loom.

FDI: Strong inflows into energy, mining, and tech; continued confidence in Canada’s political stability and resource base.
    """

    crew = IterativeCrew(
        agents=[analyst, manager],
        tasks=[create_page, review_slide],
        planning=False
    )
    final_slide = crew.refine_until_good(research_report)
    if not final_slide.title:
        final_slide.title = "Untitled Slide"

    print("\n=== FINAL SLIDE STRUCTURE ===")
    print(final_slide.model_dump_json(indent=2))

