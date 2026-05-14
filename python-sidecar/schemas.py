from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal, Union

# --- Strict Config to enforce GBNF grammar generation ---
STRICT_CONFIG = ConfigDict(extra='forbid', strict=True)

# --- Research State ---

class FactSchema(BaseModel):
    """Schema for LLM extraction (no metadata)."""
    model_config = STRICT_CONFIG
    reasoning: str = Field(..., description="Brief logical justification for why this specific fact was extracted and its relevance.")
    content: str = Field(..., description="The factual statement or data point.")
    category: Literal['CORPORATE', 'DATA_CENTERS', 'ENERGY_PROFILE', 'UNKNOWN'] = Field(..., description="The intelligence module this fact belongs to.")

class InternalFact(FactSchema):
    """Internal state fact with programmatic metadata."""
    source_url: str | None = Field(None, description="The URL or filing the fact was extracted from.")

class ResearchState(BaseModel):
    user_query: str
    pipeline_step: str = "init"
    scratchpad: str = ""
    extracted_facts: List[InternalFact] = []
    urls: List[str] = []
    search_queries: List[str] = []
    search_results: List[dict] = []
    raw_content: List[dict] = []
    enrichment_queries: List[str] = []
    blocked_domains: set[str] = Field(default_factory=set, description="Domains that returned HTTP 451 from Jina, skipped in subsequent extractions.")
    nudge_count: int = 0
    is_exhausted: bool = False
    is_complete: bool = False
    final_report_md: str = ""
    final_report_json: Optional[dict] = None

# --- Intelligence Tasks Schemas (Reasoning First, All Required) ---

class PlannerSchema(BaseModel):
    model_config = STRICT_CONFIG
    reasoning: str = Field(..., description="Step-by-step internal logic for the research plan.")
    search_queries: List[str] = Field(..., description="Array of precise search strings to explore all facets of the query.")

class SingleTriageSchema(BaseModel):
    """Binary outcome schema for evaluating a single URL's authority."""
    model_config = STRICT_CONFIG
    reasoning: str = Field(..., description="Brief justification for the boolean decision.")
    is_authoritative: bool = Field(..., description="True if the source is high-signal, credible, and NOT SEO spam.")

class SynthesizerSchema(BaseModel):
    model_config = STRICT_CONFIG
    reasoning: str = Field(..., description="High-level analysis of the document's utility and geographic density.")
    extracted_facts: List[FactSchema] = Field(..., description="Dense list of specific categorized facts, numbers, and findings. If none are found, return an empty list.")

# --- Geo-Intelligence Output Schemas (Mirroring TS types - STRICT) ---

class DataCenterSchema(BaseModel):
    model_config = STRICT_CONFIG
    id: str = Field(..., description="Unique ID for the data center.")
    name: str = Field(..., description="Descriptive name of the data center.")
    city: str | None = Field(..., description="City location.")
    state: str | None = Field(..., description="State/Province.")
    country: str | None = Field(..., description="Country location.")
    address: str | None = Field(..., description="Full street address.")
    lat: float | None = Field(..., description="Latitude coordinate.")
    lng: float | None = Field(..., description="Longitude coordinate.")
    itLoadMW: float | None = Field(..., description="Critical IT Load capacity in Megawatts (MW).")
    facilityLoadMW: float | None = Field(..., description="Total facility utility feed capacity in Megawatts (MW).")
    averageRackDensityKW: float | None = Field(..., description="Average power density per rack in Kilowatts (kW).")
    energyConsumption: str | None = Field(..., description="Annual energy consumption (e.g., in GWh or MWh).")
    waterConsumption: str | None = Field(..., description="Annual water consumption (e.g., millions of gallons).")
    wue: float | None = Field(..., description="Water Usage Effectiveness (WUE) ratio.")
    pue: float | None = Field(..., description="Power Usage Effectiveness (PUE) ratio.")
    coolingTechnology: str | None = Field(..., description="Type of cooling technology used (e.g., air, liquid, immersion).")
    ownershipType: Literal['owned', 'leased', 'colocation', 'joint_venture', 'unknown'] = Field(..., description="Ownership model.")
    status: Literal['planned', 'under_construction', 'commissioned', 'unknown'] | None = Field(..., description="Lifecycle phase of the facility.")
    sources: List[str] = Field(..., description="List of source URLs or filings. Empty list if none.")
    confidence: Literal['verified', 'unverified', 'city_center_approximation', 'unknown'] | None = Field(..., description="Data accuracy label.")

class EnergyProfileSchema(BaseModel):
    model_config = STRICT_CONFIG
    reasoning: str = Field(..., description="Internal logic for compiling the energy profile.")
    totalEnergyConsumption: str | None = Field(..., description="Total corporate energy consumption across all data centers.")
    renewableEnergy: str | None = Field(..., description="Description of renewable energy sources, mix, or procurement.")
    traditionalEnergy: str | None = Field(..., description="Description of traditional/fossil fuel energy sources or mix.")
    sustainabilityInitiatives: str | None = Field(..., description="Summary of energy sustainability initiatives and projects.")
    sources: List[str] = Field(..., description="List of source references. Empty list if none.")

class AnchorFilingSchema(BaseModel):
    model_config = STRICT_CONFIG
    reasoning: str = Field(..., description="Internal logic for selecting this specific filing as the anchor, for instance if we need to prioritize an earnings release/transcript over an older 10-Q/10-K.")
    type: str = Field(..., description="Filing type (e.g., 10-K, 10-Q, 8-K, Earnings Release, Earnings Transcript).")
    date: str = Field(..., description="Filing date (YYYY-MM-DD).")
    fiscalPeriod: str = Field(..., description="Reporting period (e.g., Q1 2026).")

class MarkdownSectionSchema(BaseModel):
    model_config = STRICT_CONFIG
    reasoning: str = Field(..., description="Plan for the markdown narrative structure.")
    markdown_content: str = Field(..., description="The full markdown content for the section, including headers and markdown formatting.")

class SummarySchema(BaseModel):
    model_config = STRICT_CONFIG
    reasoning: str = Field(..., description="Logic for data compression and point selection.")
    summary: str = Field(..., description="A high-density summary of the provided information, preserving all exact numbers, coordinates, and citations.")

class GeoIntelligenceSchema(BaseModel):
    model_config = STRICT_CONFIG
    company: str = Field(..., description="Company name.")
    ticker: str | None = Field(..., description="Stock ticker.")
    website: str | None = Field(..., description="Official URL.")
    sector: str | None = Field(..., description="Industry sector.")
    description: str = Field(..., description="Business summary.")
    anchorFiling: AnchorFilingSchema = Field(..., description="Primary source filing.")
    generatedDate: str = Field(..., description="Current date.")
    dataCenters: List[DataCenterSchema] = Field(..., description="Data center facilities, locations, capacity in MW, cooling technology, and ownership models")
    energyProfile: EnergyProfileSchema = Field(..., description="Corporate energy consumption, renewable percentages, and sustainability initiatives")
