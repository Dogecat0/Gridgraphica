import { useState, useCallback, useMemo } from 'react'
import {
    Building2, Zap, FileText, MapPin, AlertTriangle, Loader2, ArrowRight
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import type {
    GeoIntelligence, EnergyProfile
} from '../types'


type TabId = 'overview' | 'energy' | 'research'

interface IntelPanelProps {
    intel: GeoIntelligence | null
    loading?: boolean
    error?: string | null
    markdown?: string | null
    onClose: () => void
    onNavigate: (lat: number, lng: number) => void
}

const TABS: { id: TabId; label: string; icon: typeof Building2 }[] = [
    { id: 'overview', label: 'Data Centers', icon: Building2 },
    { id: 'energy', label: 'Energy Profile', icon: Zap },
    { id: 'research', label: 'Research', icon: FileText },
]

export default function IntelPanel({ intel, loading, error, markdown, onClose, onNavigate }: IntelPanelProps) {
    const [activeTab, setActiveTab] = useState<TabId>('overview')

    const handleNavigate = useCallback((lat: number, lng: number) => {
        onNavigate(lat, lng)
    }, [onNavigate])

    const availableTabs = useMemo(() => {
        let tabs = [...TABS]
        if (!markdown) {
            tabs = tabs.filter(t => t.id !== 'research')
        }
        return tabs
    }, [markdown])

    if (loading) return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[var(--color-bg-paper)]">
            <Loader2 size={32} className="animate-spin text-[var(--color-ink)] mb-4" />
            <h2 className="text-xl font-serif italic text-[var(--color-ink)] mb-2">Consulting the Archives...</h2>
            <p className="text-sm font-mono text-[var(--color-ink-muted)]">PLEASE STAND BY</p>
        </div>
    )

    if (error) return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[var(--color-bg-paper)]">
            <div className="w-16 h-16 border-2 border-[var(--color-accent-red)] flex items-center justify-center mb-6">
                <AlertTriangle size={32} className="text-[var(--color-accent-red)]" />
            </div>
            <h2 className="text-xl font-serif font-bold text-[var(--color-ink)] mb-2">Record Not Found</h2>
            <p className="text-sm font-mono text-[var(--color-ink-muted)] mb-6">{error}</p>
            <button onClick={onClose} className="border border-[var(--color-ink)] px-6 py-2 font-serif font-bold hover:bg-[var(--color-ink)] hover:text-white transition-colors">
                RETURN TO MAP
            </button>
        </div>
    )

    if (!intel) return null

    return (
        <div className="flex-1 flex flex-col h-full bg-[var(--color-bg-paper)]">
            {/* Dossier Header */}
            <div className="px-8 py-8 border-b-2 border-[var(--color-ink)]">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--color-ink-muted)] mb-1">
                            Data Center Intelligence
                        </p>
                        <h2 className="text-3xl font-serif font-bold text-[var(--color-ink)] leading-none">
                            {intel.company}
                        </h2>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-mono font-bold text-[var(--color-ink)]">NO. {intel.ticker}-2026</p>
                        <p className="text-[10px] font-mono text-[var(--color-ink-muted)]">SEC {intel.anchorFiling.type} · {intel.anchorFiling.fiscalPeriod}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] font-serif italic text-[var(--color-ink-muted)]">
                    <span>STATUS: ACTIVE / VERIFIED</span>
                </div>
            </div>

            {/* Index Tabs */}
            <div className="flex flex-nowrap overflow-x-auto px-8 mt-4 pb-[2px]" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {availableTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabId)}
                        className={`index-tab shrink-0 whitespace-nowrap ${activeTab === tab.id ? 'active' : ''}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 bg-[var(--color-bg-paper)]">
                <div className="max-w-2xl mx-auto">
                    {activeTab === 'overview' && <OverviewTab intel={intel} onNavigate={handleNavigate} />}
                    {activeTab === 'energy' && <EnergyTab profile={intel.energyProfile} />}
                    {activeTab === 'research' && markdown && <ResearchTab markdown={markdown} onNavigate={handleNavigate} />}

                    {/* Dossier Footer */}
                    <div className="mt-12 pt-6 border-t border-[var(--color-ink-muted)]/30 text-center">
                        <p className="text-[10px] font-mono text-[var(--color-ink-muted)] uppercase tracking-widest">
                            End of Document · Printed {intel.generatedDate}
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

function OverviewTab({ intel, onNavigate }: { intel: GeoIntelligence; onNavigate: (lat: number, lng: number) => void }) {
    const totalMW = intel.dataCenters.reduce((sum, dc) => sum + (dc.itLoadMW || 0), 0);
    const countries = new Set(intel.dataCenters.map(dc => dc.country));

    return (
        <div className="space-y-8 animate-fade-in">
            <section>
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-[var(--color-ink)] mb-3 border-b border-[var(--color-ink)] pb-1">Executive Summary</h3>
                <p className="text-base font-serif leading-relaxed text-[var(--color-ink-muted)] first-letter:text-4xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:text-[var(--color-ink)]">
                    {intel.description}
                </p>
            </section>

            <div className="grid grid-cols-2 gap-px bg-[var(--color-ink)] border border-[var(--color-ink)]">
                <StatCell label="Total Facilities" value={String(intel.dataCenters.length)} />
                <StatCell label="Global Jurisdictions" value={String(countries.size)} />
                <StatCell label="Total Capacity" value={totalMW > 0 ? `${totalMW} MW` : 'Unknown'} />
                <StatCell label="Avg PUE" value={
                    (() => {
                        const withPue = intel.dataCenters.filter(d => d.pue);
                        if (!withPue.length) return 'N/A';
                        const avg = withPue.reduce((s, d) => s + d.pue!, 0) / withPue.length;
                        return avg.toFixed(2);
                    })()
                } />
            </div>

            <section className="space-y-6">
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-ink-muted)] border-b border-[var(--color-ink)] pb-1">Data Center Footprint</p>
                <div className="divide-y divide-[var(--color-ink)]">
                    {intel.dataCenters.map((dc, i) => (
                        <div key={i} className="py-6 flex gap-4 group">
                            <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="text-lg font-serif font-bold text-[var(--color-ink)]">{dc.name}</h4>
                                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 border border-[var(--color-ink)]">
                                        {dc.ownershipType.toUpperCase()}
                                    </span>
                                </div>
                                <p className="text-xs font-mono text-[var(--color-ink-muted)] mb-3 flex items-center gap-1">
                                    <MapPin size={10} /> {dc.city}, {dc.country}
                                </p>
                                <div className="text-sm font-serif italic text-[var(--color-ink-muted)] leading-snug mb-4 space-y-1 border-l-2 border-[var(--color-ink)] pl-3">
                                    {dc.itLoadMW && <p>Capacity: <span className="text-[var(--color-ink)] font-bold">{dc.itLoadMW} MW</span></p>}
                                    {dc.investment && <p>Investment: <span className="text-[var(--color-ink)] font-bold">{dc.investment}</span></p>}
                                    {dc.squareFootage && <p>Area: <span className="text-[var(--color-ink)] font-bold">{dc.squareFootage.toLocaleString()} sq ft</span></p>}
                                    {dc.coolingTechnology && <p>Cooling: <span className="text-[var(--color-ink)] font-bold">{dc.coolingTechnology}</span></p>}
                                    {dc.certifications && dc.certifications.length > 0 && (
                                        <p className="text-[10px] font-mono pt-1">
                                            CERT: {dc.certifications.join(' · ')}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => dc.lat && dc.lng && onNavigate(dc.lat, dc.lng)}
                                    className={`text-[10px] font-mono font-bold border border-[var(--color-ink)] px-3 py-1 transition-all flex items-center gap-2 ${dc.lat && dc.lng ? 'hover:bg-[var(--color-ink)] hover:text-white cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                                    disabled={!dc.lat || !dc.lng}
                                >
                                    COORDINATES: {dc.lat != null ? dc.lat.toFixed(4) : 'N/A'}, {dc.lng != null ? dc.lng.toFixed(4) : 'N/A'} <ArrowRight size={10} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}

function EnergyTab({ profile }: { profile: EnergyProfile }) {
    const isLongConsumption = profile.totalEnergyConsumption && profile.totalEnergyConsumption.length > 50;
    return (
        <div className="space-y-8 animate-fade-in">
            <section className="border-b-2 border-[var(--color-ink)] pb-4">
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-ink-muted)] mb-2">Corporate Energy Consumption</p>
                <div className="flex justify-between items-end">
                    <h3 className={isLongConsumption ? "text-xl font-serif font-bold text-[var(--color-ink)] leading-snug" : "text-4xl font-serif font-bold text-[var(--color-ink)]"}>
                        {profile.totalEnergyConsumption || 'Unknown'}
                    </h3>
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 bg-[var(--color-bg-paper-dark)] border border-[var(--color-border-muted)]">
                    <p className="text-[10px] font-mono font-bold text-[var(--color-ink-muted)] uppercase mb-2">Renewable Energy Profile</p>
                    <p className="text-sm font-serif leading-relaxed text-[var(--color-ink-muted)]">
                        {profile.renewableEnergy || 'Unknown'}
                    </p>
                </div>
                {profile.traditionalEnergy && (
                    <div className="p-6 bg-[var(--color-bg-paper-dark)] border border-[var(--color-border-muted)]">
                        <p className="text-[10px] font-mono font-bold text-[var(--color-ink-muted)] uppercase mb-2">Traditional Energy</p>
                        <p className="text-sm font-serif leading-relaxed text-[var(--color-ink-muted)]">
                            {profile.traditionalEnergy}
                        </p>
                    </div>
                )}
            </div>

            <section className="p-6 bg-[var(--color-bg-paper-dark)] border border-[var(--color-border-muted)] mt-6">
                <p className="text-[10px] font-mono font-bold text-[var(--color-ink-muted)] uppercase mb-2">Sustainability Initiatives</p>
                <p className="text-sm font-serif leading-relaxed italic text-[var(--color-ink-muted)]">
                    {profile.sustainabilityInitiatives || 'No detailed initiatives reported.'}
                </p>
            </section>
        </div>
    )
}

function ResearchTab({ markdown, onNavigate }: { markdown: string; onNavigate: (lat: number, lng: number) => void }) {
    return (
        <div className="animate-fade-in research-prose-archivist font-serif">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                    h1: ({ children }) => <h1 className="text-3xl font-serif font-bold text-[var(--color-ink)] mt-10 mb-6 border-b-2 border-[var(--color-ink)] pb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-serif font-bold text-[var(--color-ink)] mt-8 mb-4 border-b border-[var(--color-ink)] pb-1">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-serif italic font-bold text-[var(--color-ink)] mt-6 mb-3">{children}</h3>,
                    p: ({ children }) => <p className="text-base leading-relaxed text-[var(--color-ink-muted)] mb-5">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-5 text-base text-[var(--color-ink-muted)] space-y-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-5 text-base text-[var(--color-ink-muted)] space-y-2">{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                    a: ({ children, href }) => {
                        if (href && href.startsWith('geo:')) {
                            const [lat, lng] = href.replace('geo:', '').split(',').map(Number)
                            return (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault()
                                        if (!isNaN(lat) && !isNaN(lng)) onNavigate(lat, lng)
                                    }}
                                    className="inline-flex items-center gap-1 text-[var(--color-accent-blue)] font-bold hover:underline transition-colors"
                                    title="View on Map"
                                >
                                    <MapPin size={12} className="inline" />
                                    {children}
                                </button>
                            )
                        }
                        return <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent-blue)] font-bold hover:underline">{children}</a>
                    },
                    strong: ({ children }) => <strong className="font-bold text-[var(--color-ink)]">{children}</strong>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-[var(--color-ink)] pl-6 italic text-[var(--color-ink-muted)] my-8 py-2 bg-[var(--color-bg-paper-dark)]">{children}</blockquote>,
                }}
            >
                {markdown}
            </ReactMarkdown>
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
