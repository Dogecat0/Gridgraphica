import { X, MapPin, Building2, Map } from 'lucide-react'
import type { MapEntity, Company, DataCenter, RegionalHub } from '../types'

interface EntityPopupProps {
    entity: MapEntity | null
    company: Company | null
    onClose: () => void
}

export default function EntityPopup({ entity, company, onClose }: EntityPopupProps) {
    if (!entity) return null

    const { type, data } = entity

    return (
        <div className="absolute top-8 left-8 w-80 bg-[var(--color-bg-paper)] shadow-lg border-2 border-[var(--color-ink)] z-40 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-bg-paper)] p-3">
                <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-80 mb-1 flex items-center gap-2">
                        {type === 'dataCenter' && <><Building2 size={12} /> Data Center</>}
                        {type === 'regionalHub' && <><Map size={12} /> Regional Hub</>}
                    </p>
                    <h3 className="text-lg font-serif font-bold leading-tight">
                        {type === 'dataCenter' && (data as DataCenter).name}
                        {type === 'regionalHub' && `${(data as RegionalHub).region} Hub`}
                    </h3>
                </div>
                <button onClick={onClose} className="hover:opacity-70 transition-opacity">
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="p-4 bg-[var(--color-bg-paper)]">
                {type === 'dataCenter' && <DataCenterContent data={data as DataCenter} company={company} />}
                {type === 'regionalHub' && <RegionalHubContent data={data as RegionalHub} />}
            </div>
        </div>
    )
}

function DataCenterContent({ data, company }: { data: DataCenter; company: Company | null }) {
    return (
        <div className="space-y-4">
            {company && (
                <div className="flex items-center justify-between border-b border-[var(--color-border-muted)] pb-2 mb-2">
                    <p className="text-xs font-serif font-bold text-[var(--color-ink)]">{company.company}</p>
                    <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">{company.ticker}</span>
                </div>
            )}
            
            <div className="flex justify-between items-end">
                <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--color-ink-muted)]">
                    <MapPin size={12} />
                    <span>{data.city}{data.city && data.country ? ', ' : ''}{data.country}</span>
                </div>
                <span className="text-[9px] font-mono uppercase tracking-widest font-bold border border-[var(--color-ink)] px-1.5 py-0.5">
                    {data.ownershipType.replace(/_/g, ' ')}
                </span>
            </div>

            {data.itLoadMW && (
                <p className="text-sm font-serif italic text-[var(--color-ink-muted)] leading-snug border-l-2 border-[var(--color-ink)] pl-3">
                    Capacity: {data.itLoadMW} MW
                </p>
            )}

            <div className="flex items-center gap-4 text-[10px] font-mono text-[var(--color-ink-muted)] mt-2 pt-3 border-t border-[var(--color-border-muted)]">
                <span>LAT: {data.lat.toFixed(4)}</span>
                <span>LNG: {data.lng.toFixed(4)}</span>
            </div>
        </div>
    )
}

function RegionalHubContent({ data }: { data: RegionalHub }) {
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-end">
                <span className="text-xs font-mono text-[var(--color-ink-muted)] uppercase">Data Centers</span>
                <span className="text-xl font-serif font-bold" style={{ color: '#2563eb' }}>
                    {data.dataCenterCount}
                </span>
            </div>
            <p className="text-sm font-serif italic text-[var(--color-ink-muted)] border-l-2 border-[#2563eb] pl-3 py-1">
                Top Entities: {data.topCompanies.map(c => c.ticker).join(', ')}
            </p>
            <div className="text-[10px] font-mono text-[var(--color-ink-muted)] pt-2 border-t border-[var(--color-border-muted)]">
                LAT: {data.lat.toFixed(4)} · LNG: {data.lng.toFixed(4)}
            </div>
        </div>
    )
}
