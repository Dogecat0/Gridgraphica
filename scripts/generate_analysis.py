#!/usr/bin/env python3
"""
Analysis Generator for Gridgraphica
===================================
Aggregates individual company intel files into cross-company analysis files:
- global_capacity.json
- regional_concentration.json
- energy_transition.json

Usage:
    python scripts/generate_analysis.py
"""

import json
import os
import glob
from datetime import datetime
from collections import defaultdict

# ── Configuration ──────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
INTEL_DIR = os.path.join(PROJECT_ROOT, "public", "data", "intel")
RESEARCH_DIR = os.path.join(PROJECT_ROOT, "public", "data", "research")

def load_all_intel():
    intel_files = glob.glob(os.path.join(INTEL_DIR, "*.json"))
    all_intel = []
    for file_path in sorted(intel_files):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                all_intel.append(json.load(f))
        except Exception as e:
            print(f"Error loading {file_path}: {e}")
    return all_intel

def generate_global_capacity(all_intel):
    capacities = []
    
    for intel in all_intel:
        dcs = intel.get('dataCenters', [])
        
        commissioned = sum(1 for dc in dcs if dc.get('status') == 'commissioned')
        under_construction = sum(1 for dc in dcs if dc.get('status') == 'under_construction')
        planned = sum(1 for dc in dcs if dc.get('status') == 'planned')
        
        liquid = sum(1 for dc in dcs if dc.get('coolingTechnology') == 'liquid')
        air = sum(1 for dc in dcs if dc.get('coolingTechnology') == 'air')
        
        capacities.append({
            "ticker": intel['ticker'],
            "totalDataCenters": len(dcs),
            "commissioned": commissioned,
            "underConstruction": under_construction,
            "planned": planned,
            "liquidCooled": liquid,
            "airCooled": air
        })

    return {
        "lastUpdated": datetime.now().isoformat(),
        "version": "2.0.0",
        "capacities": capacities
    }

def generate_regional_concentration(all_intel):
    # Determine region from country/state
    def get_region(dc):
        country = dc.get('country', '')
        if country in ['United States', 'Canada']:
            return 'North America'
        elif country in ['Ireland', 'Netherlands', 'Norway', 'UK', 'Germany', 'France', 'Sweden', 'Finland']:
            return 'Europe'
        elif country in ['Taiwan', 'Japan', 'South Korea', 'Singapore', 'India', 'China', 'Malaysia', 'Australia']:
            return 'Asia Pacific'
        elif country in ['Brazil', 'Chile', 'Mexico']:
            return 'Latin America'
        return 'Other'
        
    regional_hubs = defaultdict(lambda: {
        "region": "",
        "lat": 0,
        "lng": 0,
        "dataCenterCount": 0,
        "companyCounts": defaultdict(int),
        "lat_sum": 0,
        "lng_sum": 0
    })

    for intel in all_intel:
        ticker = intel['ticker']
        for dc in intel.get('dataCenters', []):
            if not dc.get('lat') or not dc.get('lng'):
                continue
            
            region = get_region(dc)
            hub = regional_hubs[region]
            hub['region'] = region
            hub['dataCenterCount'] += 1
            hub['companyCounts'][ticker] += 1
            hub['lat_sum'] += dc['lat']
            hub['lng_sum'] += dc['lng']
            
    regions = []
    for region, data in regional_hubs.items():
        count = data['dataCenterCount']
        if count == 0: continue
        
        # Calculate centroid for the region's hot-spot
        lat = data['lat_sum'] / count
        lng = data['lng_sum'] / count
        
        top_companies = [
            {"ticker": t, "count": c} 
            for t, c in sorted(data['companyCounts'].items(), key=lambda x: x[1], reverse=True)[:3]
        ]
        
        regions.append({
            "region": region,
            "lat": round(lat, 4),
            "lng": round(lng, 4),
            "dataCenterCount": count,
            "topCompanies": top_companies,
            "summary": f"Major infrastructure hub with {count} key data centers."
        })

    return {
        "lastUpdated": datetime.now().isoformat(),
        "regions": regions
    }

def generate_energy_transition(all_intel):
    companies = []
    for intel in all_intel:
        ep = intel.get('energyProfile', {})
        companies.append({
            "ticker": intel['ticker'],
            "renewableEnergy": ep.get('renewableEnergy'),
            "traditionalEnergy": ep.get('traditionalEnergy'),
            "sustainabilityInitiatives": ep.get('sustainabilityInitiatives')
        })

    return {
        "lastUpdated": datetime.now().isoformat(),
        "companies": companies
    }

def main():
    print("🚀 Generating Cross-Company Analysis Data...")
    all_intel = load_all_intel()
    
    if not all_intel:
        print("❌ No intel data found. Exiting.")
        return

    os.makedirs(RESEARCH_DIR, exist_ok=True)

    capacity_matrix = generate_global_capacity(all_intel)
    with open(os.path.join(RESEARCH_DIR, "global_capacity.json"), "w", encoding="utf-8") as f:
        json.dump(capacity_matrix, f, indent=2)
    print(f"  ✓ Generated: global_capacity.json ({len(capacity_matrix['capacities'])} companies)")

    regional_concentration = generate_regional_concentration(all_intel)
    with open(os.path.join(RESEARCH_DIR, "regional_concentration.json"), "w", encoding="utf-8") as f:
        json.dump(regional_concentration, f, indent=2)
    print(f"  ✓ Generated: regional_concentration.json ({len(regional_concentration['regions'])} regions)")

    energy_transition = generate_energy_transition(all_intel)
    with open(os.path.join(RESEARCH_DIR, "energy_transition.json"), "w", encoding="utf-8") as f:
        json.dump(energy_transition, f, indent=2)
    print(f"  ✓ Generated: energy_transition.json ({len(energy_transition['companies'])} companies)")

    print("\n✅ Analysis generation complete.")

if __name__ == "__main__":
    main()
