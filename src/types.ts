/** Data center ownership categories */
export type OwnershipType =
    | 'owned'
    | 'leased'
    | 'colocation'
    | 'joint_venture'
    | 'unknown'

/** A single data center location */
export interface DataCenter {
    id: string
    name: string
    city: string
    state?: string | null
    country: string
    address?: string | null
    lat: number
    lng: number
    itLoadMW?: number | null
    facilityLoadMW?: number | null
    averageRackDensityKW?: number | null
    wue?: number | null
    status?: 'planned' | 'under_construction' | 'commissioned' | 'unknown' | null
    energyConsumption?: string | null
    waterConsumption?: string | null
    pue?: number | null
    coolingTechnology?: string | null
    ownershipType: OwnershipType
    sources?: string[] | null
    confidence?: 'verified' | 'unverified' | 'city_center_approximation' | null
    /** Set at runtime when flattening — the parent company name */
    companyId?: string
}

/** A company with its data center locations */
export interface Company {
    company: string
    website: string
    ticker: string
    sector: string
    description: string
    dataCenters: DataCenter[]
}

/** Ring datum used by react-globe.gl rings layer */
export interface RingDatum {
    lat: number
    lng: number
    color: string
    size: number
    isSelected: boolean
    isCore: boolean
    dataCenterRef: DataCenter
}

/** Arc datum used by react-globe.gl arcs layer */
export interface ArcDatum {
    startLat: number
    startLng: number
    endLat: number
    endLng: number
    color: [string, string]
}

/* ===== Geo-Intelligence Types ===== */

export interface EnergyProfile {
    reasoning?: string | null
    totalEnergyConsumption: string | null
    renewableEnergy: string | null
    traditionalEnergy: string | null
    sustainabilityInitiatives: string | null
    sources?: string[] | null
}

export interface AnchorFiling {
    type: string
    date: string
    fiscalPeriod: string
}

/** Root geo-intelligence data for a company */
export interface GeoIntelligence {
    company: string
    ticker: string
    website: string
    sector: string
    description: string
    anchorFiling: AnchorFiling
    generatedDate: string
    dataCenters: DataCenter[]
    energyProfile: EnergyProfile
}

/* ===== Cross-Company Analysis Types ===== */

export interface CapacityStat {
    ticker: string
    totalDataCenters: number
    commissioned: number
    underConstruction: number
    planned: number
    liquidCooled: number
    airCooled: number
}

export interface GlobalCapacityMatrix {
    lastUpdated: string
    version: string
    capacities: CapacityStat[]
}

export interface RegionalHub {
    region: string
    lat: number
    lng: number
    dataCenterCount: number
    topCompanies: { ticker: string; count: number }[]
    summary: string
}

export interface RegionalConcentration {
    lastUpdated: string
    regions: RegionalHub[]
}

export interface EnergyTransitionStat {
    ticker: string
    renewableEnergy: string | null
    traditionalEnergy: string | null
    sustainabilityInitiatives: string | null
}

export interface EnergyTransitionIndex {
    lastUpdated: string
    companies: EnergyTransitionStat[]
}

export type MapEntity =
    | { type: 'dataCenter', data: DataCenter }
    | { type: 'regionalHub', data: RegionalHub }

/** Layer visibility toggles */
export type LayerName = 'dataCenters' | 'regionalHubs' | 'energy'
