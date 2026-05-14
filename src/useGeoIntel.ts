import { create } from 'zustand';
import { GlobalCapacityMatrix, RegionalConcentration, EnergyTransitionIndex, Company, GeoIntelligence } from './types';
import { fetchTextOrThrow, FetchError } from './utils/fetchTextOrThrow';

interface GeoIntelState {
  selectedCompany: Company | null;
  selectedOfficeId: string | null;
  activeMarkdownSection: string | null;
  geoIntelligence: GeoIntelligence | null;

  // Global Analysis State
  globalCapacity: GlobalCapacityMatrix | null;
  regionalConcentration: RegionalConcentration | null;
  energyTransition: EnergyTransitionIndex | null;
  globalLoading: boolean;
  globalError: string | null;

  // Intel Panel State
  isIntelPanelOpen: boolean;
  isIntelMinimized: boolean;
  intelMarkdownContent: string | null;
  intelLoading: boolean;
  intelError: string | null;

  // Actions
  setSelectedCompany: (company: Company | null) => void;
  setSelectedOfficeId: (officeId: string | null) => void;
  setActiveMarkdownSection: (sectionId: string | null) => void;
  setGeoIntelligence: (intel: GeoIntelligence | null) => void;
  setIsIntelPanelOpen: (isOpen: boolean) => void;
  setIsIntelMinimized: (isMinimized: boolean) => void;
  flyToLocation: (lat: number, lng: number, altitude?: number) => void;
  
  // Fetch Actions
  fetchGeoIntelData: (companyTicker: string) => Promise<void>;
  fetchGlobalAnalysis: () => Promise<void>;

  // Callback registry for Globe animation
  registerFlyToCallback: (callback: (lat: number, lng: number, altitude: number) => void) => void;
  _flyToCallback: ((lat: number, lng: number, altitude: number) => void) | null;
}

export const useGeoIntel = create<GeoIntelState>((set, get) => ({
  selectedCompany: null,
  selectedOfficeId: null,
  activeMarkdownSection: null,
  geoIntelligence: null,

  globalCapacity: null,
  regionalConcentration: null,
  energyTransition: null,
  globalLoading: true,
  globalError: null,

  isIntelPanelOpen: false,
  isIntelMinimized: false,
  intelMarkdownContent: null,
  intelLoading: false,
  intelError: null,

  setSelectedCompany: (company) => set({ selectedCompany: company }),
  setSelectedOfficeId: (officeId) => set({ selectedOfficeId: officeId }),
  setActiveMarkdownSection: (sectionId) => set({ activeMarkdownSection: sectionId }),
  setGeoIntelligence: (intel) => set({ geoIntelligence: intel }),
  setIsIntelPanelOpen: (isOpen) => set({ isIntelPanelOpen: isOpen, isIntelMinimized: false }),
  setIsIntelMinimized: (isMinimized) => set({ isIntelMinimized: isMinimized }),

  fetchGeoIntelData: async (companyTicker: string) => {
    set({ intelLoading: true, intelError: null, intelMarkdownContent: null, geoIntelligence: null });
    
    // Use BASE_URL to correctly resolve paths when deployed to a subpath (e.g. GitHub Pages)
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
    const jsonUrl = `${baseUrl}/data/intel/${companyTicker}.json`;
    const mdUrl = `${baseUrl}/data/research/${companyTicker}.md`;

    try {
      // 1. Fetch JSON Data
      const jsonText = await fetchTextOrThrow(jsonUrl, 'application/json');
      const intelData = JSON.parse(jsonText) as GeoIntelligence;
      
      // 2. Fetch Markdown Research (Optional)
      let mdText = null;
      try {
        mdText = await fetchTextOrThrow(mdUrl, 'text/markdown');
      } catch (e) {
        console.warn(`No markdown research found for ${companyTicker}`);
      }

      set({ 
        geoIntelligence: intelData, 
        intelMarkdownContent: mdText,
        intelLoading: false 
      });
    } catch (err) {
      const e = err as FetchError | Error;
      console.error("Failed to load geo-intelligence:", e.message);
      set({ 
        intelError: e.message, 
        intelLoading: false 
      });
    }
  },

  fetchGlobalAnalysis: async () => {
    set({ globalLoading: true, globalError: null });
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
    
    const fetchJson = async <T>(path: string): Promise<T | null> => {
        try {
            const text = await fetchTextOrThrow(`${baseUrl}${path}`, 'application/json');
            return JSON.parse(text) as T;
        } catch (e) {
            console.warn(`Failed to fetch global analysis file: ${path}`, e);
            throw e;
        }
    };

    try {
        const [capacity, regional, energy] = await Promise.all([
            fetchJson<GlobalCapacityMatrix>('/data/research/global_capacity.json'),
            fetchJson<RegionalConcentration>('/data/research/regional_concentration.json'),
            fetchJson<EnergyTransitionIndex>('/data/research/energy_transition.json')
        ]);

        set({
            globalCapacity: capacity,
            regionalConcentration: regional,
            energyTransition: energy,
            globalLoading: false
        });
    } catch (err) {
        const e = err as Error;
        console.error("Failed to load global analysis:", e);
        set({ globalLoading: false, globalError: e.message });
    }
  },

  _flyToCallback: null,
  registerFlyToCallback: (callback) => set({ _flyToCallback: callback }),
  flyToLocation: (lat, lng, altitude = 1.5) => {
    const callback = get()._flyToCallback;
    if (callback) {
      callback(lat, lng, altitude);
    }
  }
}));
