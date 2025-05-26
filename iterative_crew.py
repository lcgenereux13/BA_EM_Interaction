from pydantic import BaseModel, Field
from typing import List, AsyncGenerator, Tuple
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

class SlideSection(BaseModel):
    section_title: str
    section_bullets: List[str]

class SlideStructure(BaseModel):
    title: str
    subtitle: str
    sections: List[SlideSection]

class ReviewComment(BaseModel):
    element: str
    comment: str

class SlideReview(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Overall rating from 1 to 5")
    comments: List[ReviewComment]
    summary: str


# Analyst agent
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

# Task: create slide structure
create_page = Task(
    name="Synthesize unstructured research into PowerPoint slide structure",
    description=(
        "Use provided research to produce the structure of a PowerPoint slide in response to the prompt: {research}.\n"
        "You must consider any existing drafts or feedback:\n"
        "  draft: {current_plan}\n"
        "  feedback: {feedback}\n\n"
        "Follow these guidelines to transform research into action-oriented slides:\n\n"
        "1. **Understand What Constitutes an Insight**\n"
        "- Capture a deep understanding: explain *why* something happens, not just *what*.\n"
        "- Ask “why” repeatedly to uncover meaning that surprises or challenges conventional wisdom.\n"
        "- Benchmark insights against familiar standards to aid comprehension.\n\n"
        "2. **Write an Effective Header (Title & Subtitle)**\n"
        "- Convey one key insight in active voice, summarizing the slide in 1–2 lines.\n"
        "- Place the most important information at the start.\n"
        "- Avoid filler phrases like “Based on our analysis.”\n\n"
        "3. **Craft Impactful Bullets**\n"
        "- Don’t repeat the header; each bullet must convey a single fact or finding.\n"
        "- Use active voice and **bold** the first few words of each bullet.\n"
        "- Limit bullets to ≤3 lines; include 3–8 bullets (use sub-bullets if >5 items).\n"
        "- Ensure at least two items per list.\n\n"
        "4. **Apply MECE Principle**\n"
        "- Make bullets mutually exclusive and collectively exhaustive.\n\n"
        "5. **Eliminate Empty Verbiage**\n"
        "- Quantify adjectives (e.g., “20% increase” vs. “significant increase”).\n"
        "- Front-load key information (e.g., “Sales grew 20% in the US”).\n"
        "- Use bold sparingly for emphasis.\n\n"
        "6. **Review and Refine**\n"
        "- Ensure grammatical consistency and correct punctuation.\n"
        "- Verify bullets do not exceed two lines each.\n"
        "- Confirm there’s no redundancy between header and bullets.\n\n"
        "Steps:\n"
        "1. Read the research to gather facts, perspectives, and data.\n"
        "2. Derive a central, action-oriented insight (slide title) and supporting subtitle.\n"
        "3. Organize into 3–5 MECE sections, each with a short section title and 3–7 concise bullets.\n"
        "4. Make every item standalone, action-oriented, and data-driven.\n"
        "5. Return a JSON object:\n"
        "{"
        "  'title': str,"
        "  'subtitle': str,"
        "  'sections': ["
        "    { 'section_title': str, 'section_bullets': [str, ...] },"
        "    ..."
        "  ]"
        "}"
    ),
    expected_output='A JSON with slide "title", "subtitle", and a list of sections containing "section_title" and "section_bullets" where section_bullets do **NOT** contain "*" or "-".',
    output_pydantic=SlideStructure,
    agent=analyst
)

# Engagement Manager agent
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

# Task: review slide
review_slide = Task(
    name="Review and critique a slide for quality and clarity",
    description=(
        "Review the provided slide (in JSON format) against 10 dimensions of slide effectiveness:\n\n"
        "1. **Action Title**\n"
        "   - Clear and Insightful: Does the title succinctly convey the slide’s main takeaway?\n"
        "   - Action‐Oriented: Is it phrased as an insight or recommendation (e.g., “Emerging Markets Drive 15% Revenue Growth”)?\n"
        "   - Standalone Meaning: Can it convey the key message without additional context?\n\n"
        "2. **Pyramid Principle**\n"
        "   - Answer First: Is the main conclusion or recommendation up front?\n"
        "   - Supporting Arguments: Are the key reasons immediately after (e.g., 1. High demand; 2. Regulatory tailwinds; 3. Competitive edge)?\n"
        "   - Supporting Data: Is detailed evidence provided to substantiate each argument?\n\n"
        "3. **Key Messages**\n"
        "   - Prioritization: Are the most critical points highlighted or placed at the top?\n"
        "   - Brevity: Are messages concise and jargon‐free?\n"
        "   - Clarity: Are they understandable by someone unfamiliar with the topic?\n"
        "   - Alignment: Do they directly support the action title?\n\n"
        "4. **Supporting Text**\n"
        "   - Relevance: Is every bullet directly tied to its key message?\n"
        "   - Simplicity: Is the language free of unnecessary complexity?\n"
        "   - Quantification: Are claims backed by numbers where appropriate?\n"
        "   - No Redundancy: Is any repeated wording eliminated?\n\n"
        "5. **Logical Flow**\n"
        "   - Structure: Does it follow problem → analysis → insight → recommendation?\n"
        "   - Transitions: Are ideas connected smoothly without abrupt jumps?\n"
        "   - Hierarchy: Is information ordered from most to least important?\n\n"
        "6. **Language and Tone**\n"
        "   - Professional Tone: Is it formal and appropriate for a client?\n"
        "   - Active Voice: Are sentences direct (e.g., “We recommend reducing costs by 10%”)?\n"
        "   - Strong Verbs: Are verbs like “drive,” “enable,” “achieve” used?\n"
        "   - No Ambiguity: Are vague terms replaced with specifics?\n\n"
        "7. **Data and Insights**\n"
        "   - Interpretation: Does the text explain the “so what” of each data point?\n"
        "   - Insightful Commentary: Are insights drawn rather than just facts stated?\n"
        "   - Focus: Are only the most critical data points included?\n\n"
        "8. **Consistency**\n"
        "   - Terminology: Are terms, units, and formats consistent?\n"
        "   - Numbers: Are percentages, currency, and decimals uniformly formatted?\n"
        "   - Acronyms: Are they spelled out on first use and then used consistently?\n\n"
        "9. **Call to Action (if applicable)**\n"
        "   - Clarity: Is there a clear next step or recommendation?\n"
        "   - Actionable: Are recommendations specific (e.g., “Launch a pilot in Q3”)?\n\n"
        "10. **Proofreading**\n"
        "   - Grammar & Spelling: Any typos or awkward phrasing?\n"
        "   - Punctuation: Is punctuation consistent and correct?\n"
        "   - Readability: Does it flow smoothly when read aloud?\n\n"
        "Return your feedback as a JSON object containing:\n"
        "- `rating` (1-5),\n"
        "- `comments`: a list of `{ element: string, comment: string }`,\n"
        "- `summary`: a final recommendation."
    ),
    expected_output=(
        'A JSON with:'
        '{'
        '  "rating": int (1-5) where 4 is passing and 5 is exceptional,'
        '  "comments": ['
        '    { "element": str, "comment": str },'
        '    ...'
        '  ],'
        '  "summary": str'
        '}'
    ),
    output_pydantic=SlideReview,
    agent=manager,
    context=[create_page]
)

# 6) IterativeCrew with draft as dict only
class IterativeCrew(Crew):
    draft:    dict = Field(default_factory=lambda: {"title":"", "subtitle":"", "sections":[]})
    feedback: str  = ""

    def _resolve_element_text(self, element: str) -> str:
        """Return the text of the referenced slide element if possible."""
        obj = self.draft
        if not element or not isinstance(obj, dict):
            return element

        import re
        # split like "sections[0].section_bullets[1]"
        parts = re.findall(r"(\w+)(?:\[(\d+)\])?", element)
        for key, index in parts:
            if isinstance(obj, dict):
                obj = obj.get(key)
            else:
                return element
            if index:
                num = int(index)
                try:
                    obj = obj[num]
                except (IndexError, ValueError, TypeError):
                    # fall back to 1-based indexing if 0-based failed
                    try:
                        obj = obj[num - 1]
                    except Exception:
                        return element
        if isinstance(obj, str):
            return obj
        try:
            return json.dumps(obj)
        except Exception:
            return element

    def _replace_comment_elements(self, review: dict) -> dict:
        """Replace element paths in review comments with the actual text."""
        for comment in review.get("comments", []):
            elem = comment.get("element")
            if elem:
                comment["element"] = self._resolve_element_text(elem)
        return review

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

        # remove common code block markers
        candidate = candidate.replace("```", "")
        candidate = _strip_outer_braces(candidate)

        attempts = [candidate, _convert_single_quotes(candidate)]

        for attempt in attempts:
            try:
                return json.loads(attempt)
            except json.JSONDecodeError:
                # try to auto-close brackets and braces if the JSON looks truncated
                fix = attempt
                braces = fix.count("{") - fix.count("}")
                if braces > 0:
                    fix += "}" * braces
                brackets = fix.count("[") - fix.count("]")
                if brackets > 0:
                    fix += "]" * brackets
                try:
                    return json.loads(fix)
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
            review_dict = self._replace_comment_elements(review_dict)
            rating = review_dict.get("rating", 0)
            print(f"Manager rated: {rating}/5")

            if rating >= threshold:
                print("✅ Threshold reached—done!")
                return SlideStructure(**new_dict)

            # otherwise update for next pass
            self.draft    = new_dict
            # flatten comments into a string, resolving element paths to text
            self.feedback = "\n".join(
                f"{self._resolve_element_text(c['element'])}: {c['comment']}"
                for c in review_dict.get("comments", [])
            )

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
            analyst_tokens: list[str] = []
            manager_tokens: list[str] = []

            def on_agent_started(source, event: AgentExecutionStartedEvent) -> None:
                nonlocal current_agent, analyst_tokens, manager_tokens
                role = event.agent.role
                if role == analyst.role:
                    current_agent = "analyst"
                elif role == manager.role:
                    if current_agent == "analyst" and analyst_tokens:
                        try:
                            new_dict = self.crew._extract_json("".join(analyst_tokens))
                        except Exception as e:
                            print(f"Error parsing analyst draft: {e}")
                            # keep the last valid draft and display it
                            token_q.put(("draft", json.dumps(self.crew.draft)))
                        else:
                            self.crew.draft = new_dict
                            token_q.put(("draft", json.dumps(self.crew.draft)))
                        analyst_tokens = []
                    manager_tokens = []
                    current_agent = "manager"

            def on_chunk(source, event: LLMStreamChunkEvent) -> None:
                if current_agent == "analyst":
                    token_q.put((current_agent, event.chunk))
                    analyst_tokens.append(event.chunk)
                elif current_agent == "manager":
                    token_q.put((current_agent, event.chunk))
                    manager_tokens.append(event.chunk)
                else:
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

            try:
                if getattr(slide_out, "pydantic", None):
                    new_dict = slide_out.pydantic.model_dump()
                else:
                    new_dict = self.crew._extract_json(slide_out.raw)
            except Exception as e:
                print(f"Error parsing final analyst output: {e}")
                new_dict = self.crew.draft

            try:
                review_dict = self.crew._extract_json(review_out.raw)
                review_dict = self.crew._replace_comment_elements(review_dict)
            except Exception as e:
                print(f"Error parsing manager review: {e}")
                review_dict = {"rating": 0, "comments": [], "summary": ""}

            cleaned = json.dumps(review_dict)
            for ch in cleaned:
                yield "manager", ch, i

            rating = review_dict.get("rating", 0)

            # update the current draft after each pass in case parsing during
            # streaming failed for any reason
            self.crew.draft = new_dict

            if rating >= self.threshold:
                break

            # Prepare for the next iteration by updating feedback
            self.crew.feedback = "\n".join(
                f"{self.crew._resolve_element_text(c['element'])}: {c['comment']}"
                for c in review_dict.get("comments", [])
            )

            # Inform the frontend that a new iteration will begin if
            # the threshold hasn't been met and the max iterations allow it
            if i < self.max_iters:
                message = (
                    f"New iteration: number {i + 1}.\n"
                    "The current draft has not met the EM's requirements "
                    "and maximum iterations have not been reached"
                )
                yield "crew", message, i + 1



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
        planning=True
    )
    final_slide = crew.refine_until_good(research_report)
    if not final_slide.title:
        final_slide.title = "Untitled Slide"

    print("\n=== FINAL SLIDE STRUCTURE ===")
    print(final_slide.model_dump_json(indent=2))

