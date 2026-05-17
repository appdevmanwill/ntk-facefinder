import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // Get initial value from localStorage or use default
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch {
          // Ignore parse errors
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}

// Specific hooks for app data
export interface AppSettings {
  accentColor: string;
  theme: 'dark' | 'light' | 'system';
  gridDensity: 'compact' | 'normal' | 'comfortable';
  matchThreshold: number;
  minFaceSize: number;
  showConfidence: boolean;
  highlightFace: boolean;
  autoCluster: boolean;
  useGPU: boolean;
  batchSize: number;
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

export function useAppSettings() {
  return useLocalStorage<AppSettings>('facefinder_settings', defaultSettings);
}

export interface RecentSearch {
  id: string;
  personName: string;
  thumbnail: string;
  date: string;
  resultCount: number;
}

export function useRecentSearches() {
  return useLocalStorage<RecentSearch[]>('facefinder_recent_searches', []);
}

export interface FavoritePhoto {
  id: string;
  thumbnail: string;
  filename: string;
}

export function useFavorites() {
  return useLocalStorage<FavoritePhoto[]>('facefinder_favorites', []);
}
