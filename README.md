# Gridgraphica: Geographic Intelligence Dashboard

**[Gridgraphica](https://zhicheng-wang.com/Gridgraphica/)** is a high-fidelity Geographic Intelligence (GEOINT) visualization and strategic analysis platform. It provides a "Parchment and Ink" styled 3D interface to explore the global footprint, infrastructure dependencies, and energy profiles of major multinational corporations (currently focused on global data center networks).

It features a local-first, autonomous Geo-Intelligence research agent pipeline. A user submits a query, and the pipeline searches the web, extracts content, and reasons over it to produce structured intelligence briefs and Markdown narratives, which are integrated directly into the dashboard.

## 🌍 Key Features

- **Interactive 3D Globe:** High-fidelity visualization of global infrastructure using `react-globe.gl` and Three.js, featuring office hubs, supply chain arcs, and risk hotspots.
- **Global Strategy Hub:** Integrated dashboards for cross-company analysis:
    - **Global Capacity Matrix:** Comparative analysis of data center capacity, status (commissioned vs. under construction), and cooling technologies.
    - **Regional Concentration:** Identification of geographic hotspots where multiple companies cluster their infrastructure, with regional summaries.
    - **Energy Transition Index:** Tracking the sustainability profiles, renewable energy usage, and energy consumption of global tech infrastructure.
- **Autonomous Research Agent:** A multi-stage Python pipeline that executes a deterministic research workflow:
    1.  **Planning:** Generating targeted search queries.
    2.  **Searching:** Web search for broad coverage.
    3.  **Extraction:** Content extraction and summarization.
    4.  **Entity Assembly:** Structured data synthesis and geographic geocoding.
    5.  **Drafting:** Generation of structured JSON intel and rich Markdown dossiers.
- **Adaptive LLM Engine:** Supports Gemini and local (llama.cpp) providers with intelligent token management and structured JSON generation.
- **Integrated Dossiers:** Detailed Markdown research reports and structured intelligence data accessible directly from the globe interface.
- **Parchment Aesthetic:** A unique, professional visual style inspired by classic cartography and modern intelligence briefs.

## 🛠️ Tech Stack

### Frontend UI
- **Framework:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS 4
- **State Management:** Zustand 5
- **Visualization:** [react-globe.gl](https://github.com/vasturiano/react-globe.gl), Three.js, Lucide-React
- **Content:** React-Markdown

### Research Agent (Python Sidecar)
- **API Engine:** FastAPI (SSE Streaming endpoint)
- **Orchestration:** Async generators driving a multi-phase Research Pipeline
- **Inference Client:** LiteLLM for multi-provider support (Gemini, Llama)
- **Structured Generation:** Pydantic for schema validation
- **Search & Extraction:** Brave Search API & Jina Reader API

## 📁 Project Structure

```text
├── docker-compose.yaml      # LLM infrastructure (llama.cpp server)
├── public/data/             # Intelligence data & research reports cache
│   ├── intel/               # Per-company JSON intelligence files
│   ├── research/            # Per-company Markdown reports & global analysis
│   └── countries.json       # GeoJSON for global boundaries
├── python-sidecar/          # Autonomous research pipeline (FastAPI)
│   ├── main.py              # FastAPI entry point
│   ├── pipeline.py          # Research Orchestrator
│   ├── llm.py               # LLM Client logic
│   ├── schemas.py           # Pydantic models for GEOINT schema
│   └── tasks/               # Pipeline stages (planner, extractor, assembly, etc.)
├── scripts/                 # Data synchronization and analysis scripts
│   ├── register_intel.py    # Synchronizes per-company intel to the main registry
│   └── generate_analysis.py # Aggregates global analysis (Capacity, Regions, Energy)
├── src/                     # Frontend UI application
│   ├── components/          # React components (Globe, IntelPanel, GlobalPanel)
│   ├── useGeoIntel.ts       # Centralized Zustand store
│   └── types.ts             # TypeScript definitions for the GEOINT schema
└── vite.config.ts           # Vite configuration
```

## 🚀 Getting Started

### Prerequisites

- **Node.js:** v20 or higher
- **Python:** v3.10 or higher
- **Docker:** (For local inference engine)
- **Environment Variables:** Set in `.env` (copy from `.env.example` if available)
    - `BRAVE_SEARCH_API_KEY`: For web research.
    - `GEMINI_API_KEY`: For using Gemini as the research engine.

### Installation

1.  **Clone and Install Frontend Dependencies:**
    ```bash
    npm install
    ```

2.  **Setup Python Environment:**
    ```bash
    cd python-sidecar
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    cd ..
    ```

### Development

1.  **Start the Local LLM Server:**
    ```bash
    docker-compose up -d
    ```

2.  **Run the Research Pipeline Backend:**
    ```bash
    cd python-sidecar
    source .venv/bin/activate
    uvicorn main:app --reload --port 8000
    ```

3.  **Run the Vite Frontend:**
    In a new terminal:
    ```bash
    npm run dev
    ```

## 📝 License

© 2026 Gridgraphica Project. Built for strategic analysis and geographic visualization.
Data sources: OpenStreetMap, SEC Filings (simulated), Brave Search, and public reports.
