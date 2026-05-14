import { useCallback, useMemo } from 'react'
import {
    Loader2, ArrowRight,
    Globe, AlertTriangle, MapPin, Zap, Map, Server
} from 'lucide-react'
import type {
    GlobalCapacityMatrix, RegionalConcentration, EnergyTransitionIndex
} from '../types'

type TabId = 'overview' | 'capacity' | 'regions' | 'energy'

interface GlobalPanelProps {
    globalCapacity: GlobalCapacityMatrix | null
    regionalConcentration: RegionalConcentration | null
    energyTransition: EnergyTransitionIndex | null
    loading: boolean
    error: string | null
    activeTab: TabId
    onTabChange: (tab: TabId) => void
    onClose: () => void
    onNavigate: (lat: number, lng: number) => void
}

const TABS: { id: TabId; label: string; icon: typeof Globe }[] = [
    { id: 'overview', label: 'Overview', icon: Globe },
    { id: 'capacity', label: 'Global Capacity', icon: Server },
    { id: 'regions', label: 'Regional Hubs', icon: Map },
    { id: 'energy', label: 'Energy Transition', icon: Zap },
]

export default function GlobalPanel({
    globalCapacity,
    regionalConcentration,
    energyTransition,
    loading,
    error,
    activeTab,
    onTabChange,
    onClose,
    onNavigate
}: GlobalPanelProps) {
    const handleNavigate = useCallback((lat: number, lng: number) => {
        onNavigate(lat, lng)
    }, [onNavigate])

    if (loading) return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[var(--color-bg-paper)]">
            <Loader2 size={32} className="animate-spin text-[var(--color-ink)] mb-4" />
            <h2 className="text-xl font-serif italic text-[var(--color-ink)] mb-2">Synthesizing Data Center Intelligence...</h2>
            <p className="text-sm font-mono text-[var(--color-ink-muted)]">SYSTEM AGGREGATION IN PROGRESS</p>
        </div>
    )

    if (error) return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[var(--color-bg-paper)]">
             <div className="w-16 h-16 border-2 border-[var(--color-accent-red)] flex items-center justify-center mb-6">
                  <AlertTriangle size={32} className="text-[var(--color-accent-red)]" />
             </div>
             <h2 className="text-xl font-serif font-bold text-[var(--color-ink)] mb-2">Aggregation Failed</h2>
             <p className="text-sm font-mono text-[var(--color-ink-muted)] mb-6">{error}</p>
             <button onClick={onClose} className="border border-[var(--color-ink)] px-6 py-2 font-serif font-bold hover:bg-[var(--color-ink)] hover:text-white transition-colors">
                 RETURN TO MAP
             </button>
        </div>
    )

    return (
        <div className="flex-1 flex flex-col h-full bg-[var(--color-bg-paper)]">
            {/* Dossier Header */}
            <div className="px-8 py-8 border-b-2 border-[var(--color-ink)]">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--color-ink-muted)] mb-1">
                            Strategic Global Analysis
                        </p>
                        <h2 className="text-3xl font-serif font-bold text-[var(--color-ink)] leading-none">
                            DATA CENTER INTELLIGENCE
                        </h2>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-mono font-bold text-[var(--color-ink)]">DOC. DCI-2026-A</p>
                        <p className="text-[10px] font-mono text-[var(--color-ink-muted)]">REV: {globalCapacity?.version || '2.0'}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 text-[11px] font-serif italic text-[var(--color-ink-muted)]">
                    <span>COVERAGE: {globalCapacity?.capacities.length || 0} KEY ENTITIES</span>
                    <span>·</span>
                    <span>UPDATED: {globalCapacity?.lastUpdated ? new Date(globalCapacity.lastUpdated).toLocaleDateString() : 'RECENT'}</span>
                </div>
            </div>

            {/* Index Tabs */}
            <div className="flex flex-nowrap overflow-x-auto px-8 mt-4 pb-[2px]" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id as TabId)}
                        className={`index-tab shrink-0 whitespace-nowrap ${activeTab === tab.id ? 'active' : ''}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto px-8 py-6 bg-[var(--color-bg-paper)]">
                <div className="max-w-2xl mx-auto">
                    {activeTab === 'overview' && <OverviewTab capacity={globalCapacity} regions={regionalConcentration} energy={energyTransition} />}
                    {activeTab === 'capacity' && <CapacityTab capacity={globalCapacity} />}
                    {activeTab === 'regions' && <RegionsTab regions={regionalConcentration} onNavigate={handleNavigate} />}
                    {activeTab === 'energy' && <EnergyTab energy={energyTransition} />}
                    
                    {/* Dossier Footer */}
                    <div className="mt-12 pt-6 border-t border-[var(--color-ink-muted)]/30 text-center">
                        <p className="text-[10px] font-mono text-[var(--color-ink-muted)] uppercase tracking-widest">
                            End of Data Center Intelligence Summary
                        </p>
                        <div className="flex justify-center gap-1 mt-2">
                             {[...Array(5)].map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-[var(--color-ink-light)]" />)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function OverviewTab({ capacity, regions, energy }: { capacity: GlobalCapacityMatrix | null, regions: RegionalConcentration | null, energy: EnergyTransitionIndex | null }) {
    const totalDCs = useMemo(() => {
        if (!capacity) return 0;
        return capacity.capacities.reduce((sum, c) => sum + c.totalDataCenters, 0)
    }, [capacity]);

    return (
        <div className="space-y-8 animate-fade-in">
            <section>
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-[var(--color-ink)] mb-3 border-b border-[var(--color-ink)] pb-1">Executive Summary</h3>
                <p className="text-base font-serif leading-relaxed text-[var(--color-ink-muted)] first-letter:text-4xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:text-[var(--color-ink)]">
                    The expansion of hyperscale data centers continues to accelerate, driven largely by AI compute demands. This dossier aggregates global infrastructure metrics, regional concentration hubs, and the corresponding shift towards renewable energy to power these massive computational engines.
                </p>
            </section>

            <div className="grid grid-cols-2 gap-px bg-[var(--color-ink)] border border-[var(--color-ink)]">
                <StatCell label="Total Facilities" value={String(totalDCs)} />
                <StatCell label="Tracked Companies" value={String(capacity?.capacities.length || 0)} />
                <StatCell label="Major Hubs" value={String(regions?.regions.length || 0)} />
                <StatCell label="Energy Profiles" value={String(energy?.companies.length || 0)} />
            </div>

            <section className="bg-[var(--color-ink)] text-[var(--color-bg-paper)] p-6">
                <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle size={20} className="text-[var(--color-accent-red)]" />
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-white">Systemic Shift</p>
                </div>
                <p className="text-sm font-serif italic leading-relaxed text-white/90">
                    A significant transition to liquid cooling technology is underway, alongside massive commitments to 100% renewable energy matching, as companies prepare for next-generation, high-density AI infrastructure deployments.
                </p>
            </section>
        </div>
    )
}

function CapacityTab({ capacity }: { capacity: GlobalCapacityMatrix | null }) {
    if (!capacity) return null

    const totalDCs = capacity.capacities.reduce((sum, c) => sum + c.totalDataCenters, 0)
    const liquidCooled = capacity.capacities.reduce((sum, c) => sum + c.liquidCooled, 0)
    const liquidPct = totalDCs > 0 ? Math.round((liquidCooled / totalDCs) * 100) : 0

    return (
        <div className="animate-fade-in space-y-6">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-ink-muted)] border-b border-[var(--color-ink)] pb-1 mb-4">
                Global Capacity Overview
            </p>

            <div className="stat-summary-bar">
                <div>
                    <p className="text-[9px] font-mono uppercase tracking-widest text-[var(--color-ink-muted)] font-bold">Total Centers</p>
                    <p className="text-xl font-serif font-bold text-[var(--color-ink)]">{totalDCs}</p>
                </div>
                <div>
                    <p className="text-[9px] font-mono uppercase tracking-widest text-[var(--color-ink-muted)] font-bold">Liquid Cooled</p>
                    <p className="text-xl font-serif font-bold" style={{ color: '#0d9488' }}>{liquidCooled}</p>
                    <div className="stat-fill-bar">
                        <div className="stat-fill-bar-inner" style={{ width: `${liquidPct}%`, background: '#0d9488' }} />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {capacity.capacities.map(c => (
                    <div key={c.ticker} className="dossier-card border border-[var(--color-ink-light)] p-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-serif font-bold text-[var(--color-ink)]">{c.ticker}</span>
                            <span className="text-[10px] font-mono font-bold bg-[var(--color-ink)] text-white px-2 py-0.5">{c.totalDataCenters} FACILITIES</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-[10px] font-mono text-[var(--color-ink-muted)]">
                            <div>
                                <p>COMMISSIONED: <span className="font-bold text-[var(--color-ink)]">{c.commissioned}</span></p>
                                <p>BUILDING: <span className="font-bold text-[var(--color-ink)]">{c.underConstruction}</span></p>
                                <p>PLANNED: <span className="font-bold text-[var(--color-ink)]">{c.planned}</span></p>
                            </div>
                            <div>
                                <p>LIQUID COOLED: <span className="font-bold text-[#0d9488]">{c.liquidCooled}</span></p>
                                <p>AIR COOLED: <span className="font-bold text-[var(--color-ink)]">{c.airCooled}</span></p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function RegionsTab({ regions, onNavigate }: { regions: RegionalConcentration | null, onNavigate: (lat: number, lng: number) => void }) {
    if (!regions) return null

    return (
        <div className="animate-fade-in space-y-6">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-ink-muted)] border-b border-[var(--color-ink)] pb-1 mb-4">
                Regional Hubs
            </p>

            {regions.regions.map((hub, i) => (
                <div key={i} className="dossier-card border-l-4 border-[var(--color-ink)] group p-4 bg-white">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-serif font-bold text-[var(--color-ink)]">{hub.region}</h4>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 bg-[var(--color-ink-light)] text-[var(--color-ink)]`}>
                            {hub.dataCenterCount} FACILITIES
                        </span>
                    </div>
                    
                    <p className="text-sm font-serif italic text-[var(--color-ink-muted)] leading-relaxed mb-4">
                        {hub.summary}
                    </p>
                    
                    <div className="mb-4">
                        <p className="text-[9px] font-mono uppercase tracking-widest text-[var(--color-ink-muted)] mb-2 font-bold">Top Entities</p>
                        <div className="flex flex-wrap gap-2">
                            {hub.topCompanies.map((tc, idx) => (
                                <span key={`${tc.ticker}-${idx}`} className="text-[10px] font-mono font-bold border border-[var(--color-ink-light)] px-1.5 py-0.5 text-[var(--color-ink)]">
                                    {tc.ticker}: {tc.count}
                                </span>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={() => onNavigate(hub.lat, hub.lng)}
                        className="text-[10px] font-mono font-bold border border-[var(--color-ink)] px-3 py-1 hover:bg-[var(--color-ink)] hover:text-white transition-all flex items-center gap-2"
                    >
                        <MapPin size={10} /> INSPECT REGION <ArrowRight size={10} />
                    </button>
                </div>
            ))}
        </div>
    )
}

function EnergyTab({ energy }: { energy: EnergyTransitionIndex | null }) {
    if (!energy) return null

    return (
        <div className="animate-fade-in space-y-6">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-ink-muted)] border-b border-[var(--color-ink)] pb-1 mb-4">
                Energy Transition Index
            </p>

            {energy.companies.map(c => (
                <div key={c.ticker} className="dossier-card border border-[var(--color-ink-light)] p-4">
                    <h4 className="text-sm font-serif font-bold text-[var(--color-ink)] mb-3 border-b border-[var(--color-ink-light)] pb-1">
                        {c.ticker}
                    </h4>
                    
                    <div className="space-y-3">
                        {c.renewableEnergy && (
                            <div>
                                <p className="text-[9px] font-mono uppercase tracking-widest text-[var(--color-ink-muted)] font-bold mb-1">Renewable Strategy</p>
                                <p className="text-xs font-serif leading-snug text-[var(--color-ink)]">{c.renewableEnergy}</p>
                            </div>
                        )}
                        {c.traditionalEnergy && (
                            <div>
                                <p className="text-[9px] font-mono uppercase tracking-widest text-[var(--color-ink-muted)] font-bold mb-1">Traditional Energy Reliance</p>
                                <p className="text-xs font-serif leading-snug text-[var(--color-ink-muted)]">{c.traditionalEnergy}</p>
                            </div>
                        )}
                        {c.sustainabilityInitiatives && (
                            <div>
                                <p className="text-[9px] font-mono uppercase tracking-widest text-[var(--color-ink-muted)] font-bold mb-1">Sustainability Initiatives</p>
                                <p className="text-xs font-serif italic leading-snug text-[var(--color-ink-muted)]">{c.sustainabilityInitiatives}</p>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

function StatCell({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-[var(--color-bg-paper)] p-4 flex flex-col justify-center">
            <p className="text-[9px] font-mono uppercase tracking-widest text-[var(--color-ink-muted)] mb-1 font-bold">{label}</p>
            <p className="text-xl font-serif font-bold text-[var(--color-ink)]">{value}</p>
        </div>
    )
}
