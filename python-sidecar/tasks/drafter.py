from schemas import (
    ResearchState, GeoIntelligenceSchema, DataCenterSchema, EnergyProfileSchema, AnchorFilingSchema,
    MarkdownSectionSchema, STRICT_CONFIG, InternalFact
)
from llm import llm, LLAMA_CTX_PER_REQUEST, LLAMA_OUTPUT_RESERVATION
from utils.geocoder import geocoder
import logging
import json
import asyncio
from datetime import datetime
from typing import List, Type, TypeVar, AsyncGenerator, Union
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

# --- Shared wrapper types for structured LLM output ---

class DataCenterList(BaseModel):
    model_config = STRICT_CONFIG
    reasoning: str = Field(..., description="Analysis of data center distribution and site criticality.")
    dataCenters: List[DataCenterSchema]


async def draft_section(prompt: str, response_model: Type[T], system_prompt: str, facts: str = None) -> T:
    """Helper to draft a single section with retries."""
    return await llm.generate_structured(
        prompt=prompt,
        response_model=response_model,
        system_prompt=system_prompt,
        facts=facts
    )

async def get_fact_subset(facts: List[InternalFact], categories: List[str]) -> str:
    """
    Filters facts by category and returns a grouped formatted string. 
    """
    output = []
    for cat in categories:
        filtered = [f for f in facts if f.category == cat]
        if not filtered: continue
        output.append(f"### {cat}:\n")
        output.extend([f"- {fact.content} (Source: {fact.source_url})\n" for fact in filtered])
            
    return "".join(output) if output else ""
# -----------------------------------------------------------------------
# Module-level assembly functions.
# Accept explicit (facts, user_query) so they can be reused by both
# entity_assembly.py (gap detection) and run_drafter (final assembly).
# -----------------------------------------------------------------------

def _fill(template: str, query: str = None, facts: str = None) -> str:
    """Brace-free template interpolation helper."""
    res = template
    if query: res = res.replace("__QUERY__", query)
    if facts: res = res.replace("__FACTS__", facts)
    return res


async def get_data_centers(facts: List, user_query: str) -> DataCenterList:
    """Extract data center locations and metrics from categorized facts."""
    template = "Extract all data center locations and infrastructure metrics for __QUERY__ from these facts:\n__FACTS__\n\nRequirements:\n- Coordinates must be decimal degrees.\n- id must be slug: TICKER-CITY-DATACENTER.\n- Extract itLoadMW, facilityLoadMW, averageRackDensityKW, wue, status, energyConsumption, waterConsumption, pue, coolingTechnology and ownershipType if available.\\n- For capacity (itLoadMW), extract the currently commissioned Critical IT Load. If only total planned capacity is available, note this in the status.\\n- For PUE, prefer the trailing 12-month operational average over the theoretical design PUE.\\n- Distinguish between the total facility size and the specific capacity leased by the target company.\n- confidence must be 'verified' (Tier 1 source), 'unverified', 'unknown', or explicitly set to null."
    sys_prompt = f"Extract geographic data center data for {user_query}. MANDATE: Prioritize the parent company's data center footprint. Include major subsidiaries only if they are globally significant. NEVER use placeholders like 'Data Center A'; only extract specific named sites."

    base_prompt = _fill(template, query=user_query)
    facts_text = await get_fact_subset(facts, ['DATA_CENTERS', 'CORPORATE'])
    res = await draft_section(base_prompt, DataCenterList, sys_prompt, facts=facts_text)

    for o in res.dataCenters:
        if (o.lat is None or o.lng is None) and (o.city or o.country):
            location_str = f"{o.city}, {o.country}" if o.city and o.country else (o.city or o.country)
            c = await geocoder.get_coords_async(city=o.city, country=o.country)
            if c:
                o.lat, o.lng = c["lat"], c["lng"]
                if "confidence" in c:
                    o.confidence = c["confidence"]
                elif o.confidence is None:
                    o.confidence = 'city_center_approximation'
    return res




# -----------------------------------------------------------------------
# Orchestrator
# -----------------------------------------------------------------------

async def run_drafter(state: ResearchState) -> AsyncGenerator[Union[dict, ResearchState], None]:
    """
    Parallel multi-stage drafting with Granular Progress.
    Yields progress per drafted section and finally the updated state.
    """
    if not state.extracted_facts:
        logger.warning("No facts available to draft report.")
        yield state
        return

    logger.debug(f"Drafting final reports in parallel.")
    
    try:
        # A. JSON Definitions (Basic, Anchor, Offices, Revenue, Supply, Risks)
        class BasicInfo(BaseModel):
            model_config = STRICT_CONFIG
            reasoning: str = Field(..., description="Logic for identifying core company identity.")
            company: str
            ticker: str | None
            website: str | None
            sector: str | None
            description: str

        # A. Basic Info
        async def get_basic() -> BasicInfo:
            template = "Extract basic company details for __QUERY__ from these facts:\n__FACTS__\n\nRequirement: description must emphasize global geographic footprint."
            sys_prompt = "You are a precision Geo-Intelligence data extractor."
            base_prompt = _fill(template, query=state.user_query)
            facts_text = await get_fact_subset(state.extracted_facts, ['CORPORATE', 'REVENUE'])
            return await draft_section(base_prompt, BasicInfo, sys_prompt, facts=facts_text)

        # B. Anchor Filing
        async def get_anchor() -> AnchorFilingSchema:
            template = (
                "Identify the most recent primary source filing for __QUERY__ from these facts:\n__FACTS__\n\n"
                "MANDATE: Prioritize the LATEST fiscal period found in the facts. "
                "If a 10-K or 10-Q for the most recent period is not available, you MUST use the Earnings Release or Earnings Transcript for that period as the anchor."
            )
            sys_prompt = "Extract anchor filing details. Prioritize the most recent reporting period regardless of document type (10-K, 10-Q, 8-K, Earnings Release, or Transcript)."
            base_prompt = _fill(template, query=state.user_query)
            facts_text = await get_fact_subset(state.extracted_facts, ['CORPORATE'])
            return await draft_section(base_prompt, AnchorFilingSchema, sys_prompt, facts=facts_text)

        # C. Energy Profile
        async def get_energy_profile() -> EnergyProfileSchema:
            template = (
                "Extract the corporate energy profile and sustainability initiatives for __QUERY__ from these facts:\n__FACTS__\n\n"
                "Requirements:\n"
                "- MANDATE: Provide totalEnergyConsumption as a descriptive string if precise numbers aren't found.\n"
                "- Extrapolate renewableEnergy and traditionalEnergy as descriptive strings representing the energy mix."
            )
            sys_prompt = "Extract energy profile details. Prioritize the most recent reporting period data."
            base_prompt = _fill(template, query=state.user_query)
            facts_text = await get_fact_subset(state.extracted_facts, ['ENERGY_PROFILE', 'CORPORATE'])
            return await draft_section(base_prompt, EnergyProfileSchema, sys_prompt, facts=facts_text)

        # ------------------------------------------------------------------
        # 1. Start JSON Drafting: module-level functions receive explicit args
        # ------------------------------------------------------------------
        total_steps = 7  # 4 JSON + 3 MD sections

        # Yield discovery pulse
        yield {
            "status": "drafting",
            "units_discovered": total_steps,
            "message": f"Drafting: Initializing {total_steps} intelligence synthesis modules."
        }

        # ------------------------------------------------------------------
        # Phase 1: JSON Drafting (6 parallel tasks)
        #
        # asyncio.as_completed() yields *new* wrapper coroutines, so the
        # original future objects cannot be used as dict keys for back-
        # mapping results. Instead, we wrap each task to push (key, result)
        # pairs through a queue, preserving both identity and progress.
        # ------------------------------------------------------------------
        json_progress_queue: asyncio.Queue = asyncio.Queue()

        async def _json_task(key: str, coro):
            result = await coro
            await json_progress_queue.put((key, result))

        json_coros = [
            _json_task("b",   get_basic()),
            _json_task("anc", get_anchor()),
            _json_task("dc",  get_data_centers(state.extracted_facts, state.user_query)),
            _json_task("ep",  get_energy_profile()),
        ]

        gather_task = asyncio.ensure_future(asyncio.gather(*json_coros))

        json_results = {}
        for _ in range(len(json_coros)):
            key, result = await json_progress_queue.get()
            json_results[key] = result
            yield {
                "status": "drafting",
                "message": "Drafting: Assembling structured intelligence"
            }

        await gather_task  # propagate any exceptions

        b, anc, dc, ep = (
            json_results["b"], json_results["anc"], json_results["dc"], json_results["ep"]
        )

        final_json_obj = GeoIntelligenceSchema(
            company=b.company, ticker=b.ticker, website=b.website, sector=b.sector, description=b.description,
            generatedDate=datetime.now().strftime("%Y-%m-%d"), anchorFiling=anc, dataCenters=dc.dataCenters, energyProfile=ep
        )
        state.final_report_json = final_json_obj.model_dump()

        # ------------------------------------------------------------------
        # Phase 2: MD Drafting (7 parallel tasks, order-preserving)
        # ------------------------------------------------------------------
        async def draft_md_section(title: str, json_data: any, instructions: str) -> str:
            prompt = f"Generate '{title}' section.\n\nDATA:\n{json.dumps(json_data, indent=2)}\n\nINSTRUCTIONS:\n{instructions}\n\nReturn markdown content."
            res = await llm.generate_structured(prompt, MarkdownSectionSchema, "You are a professional Geo-Intelligence Analyst.")
            return res.markdown_content

        md_task_definitions = [
            ("## 1. Geographic Profile Summary", {"company": b.company, "description": b.description}, "Summarize global positioning."),
            ("## 2. Data Center Footprint", {"dataCenters": [d.model_dump() for d in dc.dataCenters]}, "Detail physical locations, capacity, and ownership."),
            ("## 3. Energy Profile & Sustainability", ep.model_dump(), "Analyze corporate energy consumption, renewables, and environmental initiatives.")
        ]

        md_progress_queue: asyncio.Queue = asyncio.Queue()
        md_sections = [""] * len(md_task_definitions)

        async def _md_task(index: int, title: str, json_data, instructions: str):
            content = await draft_md_section(title, json_data, instructions)
            await md_progress_queue.put((index, content))

        md_coros = [_md_task(i, *args) for i, args in enumerate(md_task_definitions)]
        md_gather = asyncio.ensure_future(asyncio.gather(*md_coros))

        for _ in range(len(md_coros)):
            idx, content = await md_progress_queue.get()
            md_sections[idx] = content
            yield {
                "status": "drafting",
                "message": "Drafting: Finalizing narrative sections"
            }

        await md_gather  # propagate any exceptions

        state.final_report_md = "\n\n".join(md_sections)
        logger.debug("Markdown report assembled.")

    except Exception as e:
        logger.error(f"Error in parallel drafting: {e}")
        state.final_report_json = {"error": str(e), "partial": True}
        
    yield state
