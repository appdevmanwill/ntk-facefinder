import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useLocalStorage, type AppSettings } from '@/hooks/useLocalStorage';
import { initDB } from '@/hooks/useIndexedDB';

interface AppState {
  modelsLoaded: boolean;
  setModelsLoaded: (v: boolean) => void;
  modelsLoading: boolean;
  setModelsLoading: (v: boolean) => void;
  accentColor: string;
  setAccentColor: (c: string) => void;
  scanProgress: number | null;
  setScanProgress: (v: number | null) => void;
  selectedResultIds: string[];
  setSelectedResultIds: (ids: string[]) => void;
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
}

const defaultSettings: AppSettings = {
  accentColor: '#6366f1',
  theme: 'dark',
  gridDensity: 'normal',
  matchThreshold: 55,
  minFaceSize: 40,
  showConfidence: true,
  highlightFace: true,
  autoCluster: true,
  useGPU: false,
  batchSize: 20,
};

const AppContext = createContext<AppState>({
  modelsLoaded: false,
  setModelsLoaded: () => {},
  modelsLoading: false,
  setModelsLoading: () => {},
  accentColor: '#6366f1',
  setAccentColor: () => {},
  scanProgress: null,
  setScanProgress: () => {},
  selectedResultIds: [],
  setSelectedResultIds: () => {},
  settings: defaultSettings,
  updateSettings: () => {},
});

export function useAppContext() {
  return useContext(AppContext);
}

const ACCENT_COLORS: Record<string, { primary: string; secondary: string }> = {
  '#6366f1': { primary: '#6366f1', secondary: '#8b5cf6' },
  '#8b5cf6': { primary: '#8b5cf6', secondary: '#a78bfa' },
  '#3b82f6': { primary: '#3b82f6', secondary: '#60a5fa' },
  '#10b981': { primary: '#10b981', secondary: '#34d399' },
  '#f59e0b': { primary: '#f59e0b', secondary: '#fbbf24' },
  '#ec4899': { primary: '#ec4899', secondary: '#f472b6' },
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [storedSettings, setStoredSettings] = useLocalStorage<AppSettings>('facefinder_settings', defaultSettings);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState<number | null>(null);
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);
  const [dbInitialized, setDbInitialized] = useState(false);

  const settings = storedSettings;

  // Initialize IndexedDB on mount
  useEffect(() => {
    initDB().then(() => {
      setDbInitialized(true);
      console.log('IndexedDB initialized');
    }).catch(err => {
      console.error('Failed to initialize IndexedDB:', err);
    });
  }, []);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setStoredSettings(prev => ({ ...prev, ...updates }));
  };

  const setAccentColor = (c: string) => {
    updateSettings({ accentColor: c });
    const pair = ACCENT_COLORS[c] || { primary: c, secondary: c };
    document.documentElement.style.setProperty('--accent-primary', pair.primary);
    document.documentElement.style.setProperty('--accent-secondary', pair.secondary);
  };

  // Apply accent color on mount and when it changes
  useEffect(() => {
    const pair = ACCENT_COLORS[settings.accentColor] || { primary: settings.accentColor, secondary: settings.accentColor };
    document.documentElement.style.setProperty('--accent-primary', pair.primary);
    document.documentElement.style.setProperty('--accent-secondary', pair.secondary);
  }, [settings.accentColor]);

  return (
    <AppContext.Provider value={{
      modelsLoaded, setModelsLoaded,
      modelsLoading, setModelsLoading,
      accentColor: settings.accentColor, setAccentColor,
      scanProgress, setScanProgress,
      selectedResultIds, setSelectedResultIds,
      settings, updateSettings,
    }}>
      {children}
    </AppContext.Provider>
  );
}
