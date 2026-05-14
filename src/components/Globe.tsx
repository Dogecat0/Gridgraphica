import { useRef, useEffect, useState, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react'
import * as THREE from 'three'
import Globe from 'react-globe.gl'
import { fetchTextOrThrow } from '../utils/fetchTextOrThrow'
import { assignStackPositions, getStackOffset } from '../utils/nodeGrouping'
import type {
    DataCenter,
    GeoIntelligence, LayerName, MapEntity,
    GlobalCapacityMatrix, RegionalConcentration, EnergyTransitionIndex
} from '../types'

const DATA_CENTER_OWNERSHIP_COLORS: Record<string, string> = {
    owned: '#1a1a1a',      // Ink Black - Dominant
    leased: '#57534e',     // Warm Grey
    colocation: '#0891b2', // Cyan/Blue - Digital/Cool
    joint_venture: '#15803d', // Green - Commercial
    unknown: '#a8a29e',    // Light Warm Grey
}


export interface GlobeViewHandle {
    flyTo: (lat: number, lng: number, altitude?: number) => void
}

interface IntelNodeDatum {
    lat: number
    lng: number
    layerType: 'dataCenter' | 'regionalHub'
    label: string
    sublabel: string
    detail: string
    color: string
    id: string
    entity: MapEntity
    stackIndex: number
    stackTotal: number
    dimmed: boolean
}

interface GlobeViewProps {
    viewMode: 'global' | 'company'
    dataCenters: DataCenter[]
    onEntityClick: (entity: MapEntity | null) => void
    selectedEntity: MapEntity | null
    intel: GeoIntelligence | null
    globalCapacity: GlobalCapacityMatrix | null
    regionalConcentration: RegionalConcentration | null
    energyTransition: EnergyTransitionIndex | null
    activeLayers: Set<LayerName>
}

const GlobeView = forwardRef<GlobeViewHandle, GlobeViewProps>(function GlobeView(
    { viewMode, dataCenters, onEntityClick, selectedEntity, regionalConcentration, activeLayers },
    ref
) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globeRef = useRef<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null)
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

    useEffect(() => {
        if (!containerRef.current) return
        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect
            setDimensions({ width, height })
        })
        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [])

    useImperativeHandle(ref, () => ({
        flyTo(lat: number, lng: number, altitude: number = 1.8) {
            if (globeRef.current) {
                globeRef.current.controls().autoRotate = false
                globeRef.current.pointOfView({ lat, lng, altitude }, 1000)
            }
        },
    }))

    // Initialize globe settings
    useEffect(() => {
        const globe = globeRef.current
        if (!globe) return
        globe.controls().autoRotate = true
        globe.controls().autoRotateSpeed = 0.4
        globe.controls().enableDamping = true
        globe.controls().dampingFactor = 0.1
        globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 0)
    }, [])

    // Fly to selected entity
    useEffect(() => {
        if (selectedEntity) {
            let lat: number, lng: number;
            if (selectedEntity.type === 'dataCenter') { lat = selectedEntity.data.lat; lng = selectedEntity.data.lng; }
            else if (selectedEntity.type === 'regionalHub') { lat = selectedEntity.data.lat; lng = selectedEntity.data.lng; }
            else return;

            if (globeRef.current) {
                globeRef.current.controls().autoRotate = false
                globeRef.current.pointOfView(
                    { lat, lng, altitude: 1.8 },
                    1000
                )
            }
        }
    }, [selectedEntity])

    const handleGlobeClick = useCallback(() => {
        onEntityClick(null)
        if (globeRef.current) {
            globeRef.current.controls().autoRotate = true
        }
    }, [onEntityClick])

    const [countriesLineData, setCountriesLineData] = useState<object[]>([])

    useEffect(() => {
        let mounted = true
        const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
        fetchTextOrThrow(`${baseUrl}/data/countries.json`)
            .then(res => {
                if (mounted && res) {
                    const parsed = JSON.parse(res)
                    const features = parsed.features || []
                    setCountriesLineData(features.filter((d: any) => d.properties.ISO_A2 !== 'AQ'))
                }
            })
            .catch(err => console.error("Failed to load country polygons:", err))
        return () => { mounted = false }
    }, [])

    const isDimmedNode = useCallback((id: string) => {
        if (!hoveredEntityId) return false
        if (hoveredEntityId === id) return false
        return true
    }, [hoveredEntityId])

    const htmlNodesData = useMemo((): IntelNodeDatum[] => {
        const rawNodes: Omit<IntelNodeDatum, 'stackIndex' | 'stackTotal' | 'dimmed'>[] = []

        if (activeLayers.has('dataCenters')) {
            dataCenters.forEach((dc) => {
                rawNodes.push({
                    lat: dc.lat, lng: dc.lng,
                    layerType: 'dataCenter',
                    label: dc.name,
                    sublabel: `${dc.city || ''}, ${dc.country || ''}`,
                    detail: `${dc.ownershipType.toUpperCase()} | ${dc.itLoadMW ? dc.itLoadMW + ' MW' : 'Capacity Unknown'}`,
                    color: DATA_CENTER_OWNERSHIP_COLORS[dc.ownershipType] || '#1a1a1a',
                    id: dc.id,
                    entity: { type: 'dataCenter', data: dc }
                })
            })
        }

        if (viewMode === 'global') {
            if (activeLayers.has('regionalHubs') && regionalConcentration) {
                regionalConcentration.regions.forEach((hub, i) => {
                    rawNodes.push({
                        lat: hub.lat, lng: hub.lng,
                        layerType: 'regionalHub',
                        label: `${hub.region} Hub`,
                        sublabel: `${hub.dataCenterCount} Data Centers`,
                        detail: `Top: ${hub.topCompanies.map(c => c.ticker).join(', ')}`,
                        color: '#2563eb', // Blue for hubs
                        id: `hub-${i}`,
                        entity: { type: 'regionalHub', data: hub }
                    })
                })
            }
        }

        const stacked = assignStackPositions(rawNodes, 0.5)
        return stacked.map(node => ({
            ...node,
            dimmed: isDimmedNode(node.id),
        }))
    }, [activeLayers, dataCenters, regionalConcentration, viewMode, isDimmedNode])

    const handleHtmlElement = useCallback((d: object) => {
        const node = d as IntelNodeDatum
        const wrapper = document.createElement('div')
        wrapper.className = `intel-node-marker type-${node.layerType}${node.dimmed ? ' dimmed' : ''}${node.stackTotal > 1 ? ' stacked' : ''}`
        wrapper.setAttribute('data-id', node.id)

        const { dx, dy } = getStackOffset(node.stackIndex, node.stackTotal)
        wrapper.style.cssText = `--node-color: ${node.color}; --stack-dx: ${dx}px; --stack-dy: ${dy}px;`

        if (node.layerType === 'regionalHub') {
            const shield = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
            shield.setAttribute('viewBox', '0 0 24 24')
            shield.setAttribute('width', '22')
            shield.setAttribute('height', '22')
            shield.setAttribute('class', 'intel-node-shield')
            // Different icon for Hub? Use a simple circle with a smaller inner circle for now, or just reuse shield style with a different path.
            // Let's use a simple circle path
            shield.innerHTML = `<circle cx="12" cy="12" r="10" fill="${node.color}" stroke="rgba(253,252,240,0.9)" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="rgba(253,252,240,0.9)"/>`
            wrapper.appendChild(shield)
        } else {
            const dot = document.createElement('div')
            dot.className = `intel-node-dot type-${node.layerType}`
            wrapper.appendChild(dot)
        }

        if (node.stackTotal > 1 && node.stackIndex === 0) {
            const badge = document.createElement('div')
            badge.className = 'intel-node-count-badge'
            badge.textContent = `${node.stackTotal}`
            wrapper.appendChild(badge)
        }

        const tooltip = document.createElement('div')
        tooltip.className = 'intel-node-tooltip'
        tooltip.innerHTML = `
            <div class="intel-tt-label">${node.label}</div>
            <div class="intel-tt-sublabel">${node.sublabel}</div>
            <div class="intel-tt-detail">${node.detail}</div>
        `
        wrapper.appendChild(tooltip)

        wrapper.addEventListener('click', (e) => {
            e.stopPropagation()
            onEntityClick(node.entity)
            if (globeRef.current) {
                globeRef.current.controls().autoRotate = false
                globeRef.current.pointOfView({ lat: node.lat, lng: node.lng, altitude: 1.8 }, 1000)
            }
        })

        wrapper.addEventListener('mouseenter', () => {
            setHoveredEntityId(node.id)
        })

        wrapper.addEventListener('mouseleave', () => {
            setHoveredEntityId(null)
        })

        return wrapper
    }, [onEntityClick])

    return (
        <div ref={containerRef} className="w-full h-full">
            {dimensions.width > 0 && (
                <Globe
                    ref={globeRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    rendererConfig={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
            globeMaterial={new THREE.MeshStandardMaterial({
                color: '#eae7d4',
                emissive: '#fdfcf0',
                emissiveIntensity: 0.1,
                transparent: true,
                opacity: 0.95,
                roughness: 0.85,
                metalness: 0.05,
            })}
            showAtmosphere={false}
            backgroundColor="rgba(0,0,0,0)"

            hexPolygonsData={countriesLineData}
            hexPolygonResolution={4}
            hexPolygonMargin={0.5}
            hexPolygonColor={() => 'rgba(26, 26, 26, 0.35)'}
            hexPolygonAltitude={0.005}

            onGlobeClick={handleGlobeClick}

            htmlElementsData={htmlNodesData}
            htmlElement={handleHtmlElement}
            htmlAltitude={0.015}
            htmlTransitionDuration={0}

            animateIn={true}
            waitForGlobeReady={true}
                />
            )}
        </div>
    )
})

export default GlobeView
