"""
Entity Assembly — Programmatic gap detection for geographic intelligence.

Runs the same structural LLM extraction used by the drafter (get_offices,
get_supply_chain, get_geopolitical_risks, get_customer_concentration) against the current fact pool,
then inspects the Pydantic objects for missing critical geographic data
(addresses, coordinates, cities). Gaps are converted to targeted search
strings appended to ``state.enrichment_queries``.

This is a *pure inspection* step — it produces search strings, not data.
If no gaps are found, the pipeline skips the enrichment sub-loop entirely
and proceeds directly to drafting.
"""

import asyncio
import json
import logging
import os

from schemas import ResearchState
from tasks.drafter import get_data_centers

logger = logging.getLogger(__name__)


def _build_data_center_queries(data_centers, user_query: str) -> list[str]:
    """Generate enrichment queries for data centers missing critical metrics."""
    queries: list[str] = []
    for dc in data_centers:
        missing_address = not dc.address
        unverified_coords = dc.confidence != "verified"
        missing_capacity = dc.itLoadMW is None and dc.facilityLoadMW is None
        missing_efficiency = dc.pue is None or dc.coolingTechnology is None
        
        if missing_address or unverified_coords or missing_capacity or missing_efficiency:
            location_hint = " ".join(filter(None, [dc.city, dc.state, dc.country]))
            needs = []
            if missing_address or unverified_coords: needs.append("exact street address location coordinates")
            if missing_capacity: needs.append("critical IT load MW utility feed power capacity")
            if missing_efficiency: needs.append("PUE and cooling technology")
            
            needs_str = " and ".join(needs)
            queries.append(
                f"{user_query} {dc.name} {location_hint} data center {needs_str}"
            )
    return queries


async def run_entity_assembly(state: ResearchState) -> ResearchState:
    """
    Pre-assemble Pydantic models to programmatically detect missing
    geographic data. Populate ``state.enrichment_queries`` with targeted
    search strings for the one-shot enrichment pass.
    """
    if not state.extracted_facts:
        logger.warning("No facts available for entity assembly.")
        return state

    logger.info(
        f"Entity assembly: inspecting {len(state.extracted_facts)} facts for geographic gaps."
    )

    # Run the modular assembly functions in parallel against current facts
    
    dc_res = await get_data_centers(state.extracted_facts, state.user_query)

    # Programmatic gap detection
    gap_queries: list[str] = []
    gap_queries.extend(_build_data_center_queries(dc_res.dataCenters, state.user_query))

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique_queries: list[str] = []
    for q in gap_queries:
        normalized = q.strip().lower()
        if normalized not in seen:
            seen.add(normalized)
            unique_queries.append(q)

    state.enrichment_queries = unique_queries

    logger.info(
        f"Entity assembly complete. Identified {len(unique_queries)} enrichment gaps."
    )
    if unique_queries:
        for i, q in enumerate(unique_queries):
            logger.debug(f"  Gap {i+1}: {q}")

    # ------------------------------------------------------------------
    # Store assembly output for log replay
    # ------------------------------------------------------------------
    try:
        from llm import llm

        async with llm.counter_lock:
            llm.inference_counter += 1
            current_index = llm.inference_counter

        filepath = os.path.join(
            llm.log_dir, f"{current_index:04d}_EntityAssemblyData_output.json"
        )
        with open(filepath, "w") as f:
            json.dump(
                {"enrichment_queries": state.enrichment_queries},
                f,
                indent=2,
            )
        logger.info(f"Entity assembly logged for replay: {filepath}")
    except Exception as e:
        logger.error(f"Failed to log EntityAssemblyData: {e}")

    return state
