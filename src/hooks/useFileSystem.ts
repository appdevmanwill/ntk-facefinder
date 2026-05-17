// File System Access API hook for reading local files and external drives
// This is the core of the zero-storage architecture - all files stay on user's device

import { useState, useCallback, useEffect } from 'react';
import { 
  saveFolder, 
  getFolders, 
  deleteFolder as dbDeleteFolder,
  saveFileMetadata,
  getFileMetadata,
  saveThumbnail,
  getThumbnail,
  type FolderRecord 
} from './useIndexedDB';

// Supported image extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.bmp', '.tiff', '.tif'];

export interface LocalFolder {
  id: string;
  path: string;
  handle: FileSystemDirectoryHandle;
  imageCount: number;
  indexedCount: number;
  facesFound: number;
  lastScanned: string | null;
  isAccessible: boolean; // False if drive is disconnected
}

export interface LocalFile {
  path: string;
  name: string;
  handle: FileSystemFileHandle;
  size: number;
  lastModified: number;
  folderId: string;
}

export interface UseFileSystemResult {
  folders: LocalFolder[];
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
  addFolder: () => Promise<LocalFolder | null>;
  removeFolder: (id: string) => Promise<void>;
  verifyFolderAccess: (folder: LocalFolder) => Promise<boolean>;
  requestPermission: (folder: LocalFolder) => Promise<boolean>;
  scanFolder: (folder: LocalFolder, onProgress?: (progress: number, file: string) => void) => Promise<LocalFile[]>;
  readFile: (file: LocalFile) => Promise<File | null>;
  readFileFromPath: (folderId: string, relativePath: string) => Promise<File | null>;
  generateThumbnail: (file: File, maxSize?: number) => Promise<string>;
  getCachedThumbnail: (filePath: string) => Promise<string | null>;
  refreshFolders: () => Promise<void>;
}

// Check if File System Access API is supported
const isFileSystemAccessSupported = () => {
  return 'showDirectoryPicker' in window;
};

export function useFileSystem(): UseFileSystemResult {
  const [folders, setFolders] = useState<LocalFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSupported = isFileSystemAccessSupported();

  // Load persisted folders from IndexedDB on mount
  const loadFolders = useCallback(async () => {
    if (!isSupported) {
      // On mobile / unsupported browsers — just finish loading without error
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const storedFolders = await getFolders();
      
      // Check accessibility of each folder
      const foldersWithAccess = await Promise.all(
        storedFolders.map(async (folder) => {
          let isAccessible = false;
          try {
            // Try to query permission status
            const permission = await folder.handle.queryPermission({ mode: 'read' });
            isAccessible = permission === 'granted';
          } catch {
            isAccessible = false;
          }
          
          return {
            id: folder.id,
            path: folder.path,
            handle: folder.handle,
            imageCount: folder.imageCount,
            indexedCount: folder.indexedCount,
            facesFound: folder.facesFound,
            lastScanned: folder.lastScanned,
            isAccessible,
          };
        })
      );

      setFolders(foldersWithAccess);
      setError(null);
    } catch (err) {
      console.error('Error loading folders:', err);
      setError('Failed to load saved folders');
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Add a new folder using the directory picker
  const addFolder = useCallback(async (): Promise<LocalFolder | null> => {
    if (!isSupported) {
      setError('File System Access API is not supported');
      return null;
    }

    try {
      // Show directory picker
      const handle = await window.showDirectoryPicker({
        mode: 'read',
      });

      // Generate a unique ID
      const id = `folder_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      // Get the full path (this is just the folder name in the API, but we'll use it)
      const path = handle.name;

      const newFolder: LocalFolder = {
        id,
        path,
        handle,
        imageCount: 0,
        indexedCount: 0,
        facesFound: 0,
        lastScanned: null,
        isAccessible: true,
      };

      // Save to IndexedDB
      await saveFolder({
        id,
        path,
        handle,
        addedAt: new Date().toISOString(),
        lastScanned: null,
        imageCount: 0,
        indexedCount: 0,
        facesFound: 0,
      });

      setFolders(prev => [...prev, newFolder]);
      setError(null);
      
      return newFolder;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled the picker
        return null;
      }
      console.error('Error adding folder:', err);
      setError('Failed to add folder');
      return null;
    }
  }, [isSupported]);

  // Remove a folder
  const removeFolder = useCallback(async (id: string): Promise<void> => {
    try {
      await dbDeleteFolder(id);
      setFolders(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error('Error removing folder:', err);
      setError('Failed to remove folder');
    }
  }, []);

  // Verify if we still have access to a folder
  const verifyFolderAccess = useCallback(async (folder: LocalFolder): Promise<boolean> => {
    try {
      const permission = await folder.handle.queryPermission({ mode: 'read' });
      const isAccessible = permission === 'granted';
      
      setFolders(prev => prev.map(f => 
        f.id === folder.id ? { ...f, isAccessible } : f
      ));
      
      return isAccessible;
    } catch {
      setFolders(prev => prev.map(f => 
        f.id === folder.id ? { ...f, isAccessible: false } : f
      ));
      return false;
    }
  }, []);

  // Request permission for a folder (needed if permission was revoked or drive reconnected)
  const requestPermission = useCallback(async (folder: LocalFolder): Promise<boolean> => {
    try {
      const permission = await folder.handle.requestPermission({ mode: 'read' });
      const isAccessible = permission === 'granted';
      
      setFolders(prev => prev.map(f => 
        f.id === folder.id ? { ...f, isAccessible } : f
      ));
      
      return isAccessible;
    } catch {
      return false;
    }
  }, []);

  // Recursively scan a folder for image files
  const scanFolder = useCallback(async (
    folder: LocalFolder, 
    onProgress?: (progress: number, file: string) => void
  ): Promise<LocalFile[]> => {
    const files: LocalFile[] = [];
    
    async function scanDirectory(
      dirHandle: FileSystemDirectoryHandle, 
      basePath: string = ''
    ): Promise<void> {
      for await (const entry of dirHandle.values()) {
        const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name;
        
        if (entry.kind === 'file') {
          const ext = entry.name.toLowerCase().slice(entry.name.lastIndexOf('.'));
          if (IMAGE_EXTENSIONS.includes(ext)) {
            try {
              const fileHandle = entry as FileSystemFileHandle;
              const file = await fileHandle.getFile();
              files.push({
                path: entryPath,
                name: entry.name,
                handle: fileHandle,
                size: file.size,
                lastModified: file.lastModified,
                folderId: folder.id,
              });
              
              // Report progress
              if (onProgress) {
                onProgress(files.length, entry.name);
              }
            } catch (err) {
              console.warn(`Could not read file ${entryPath}:`, err);
            }
          }
        } else if (entry.kind === 'directory') {
          // Recursively scan subdirectories
          try {
            await scanDirectory(entry as FileSystemDirectoryHandle, entryPath);
          } catch (err) {
            console.warn(`Could not access directory ${entryPath}:`, err);
          }
        }
      }
    }

    try {
      await scanDirectory(folder.handle);
      
      // Update folder stats
      const updatedFolder = {
        ...folder,
        imageCount: files.length,
        lastScanned: new Date().toISOString(),
      };
      
      setFolders(prev => prev.map(f => 
        f.id === folder.id ? updatedFolder : f
      ));

      // Save metadata to IndexedDB
      await saveFolder({
        id: folder.id,
        path: folder.path,
        handle: folder.handle,
        addedAt: new Date().toISOString(),
        lastScanned: updatedFolder.lastScanned,
        imageCount: files.length,
        indexedCount: folder.indexedCount,
        facesFound: folder.facesFound,
      });

      // Save file metadata
      for (const file of files) {
        await saveFileMetadata({
          filePath: `${folder.id}/${file.path}`,
          folderId: folder.id,
          filename: file.name,
          size: file.size,
          lastModified: file.lastModified,
          hasBeenScanned: false,
          facesDetected: 0,
        });
      }

      return files;
    } catch (err) {
      console.error('Error scanning folder:', err);
      throw err;
    }
  }, []);

  // Read a file from a LocalFile object
  const readFile = useCallback(async (file: LocalFile): Promise<File | null> => {
    try {
      return await file.handle.getFile();
    } catch (err) {
      console.error('Error reading file:', err);
      return null;
    }
  }, []);

  // Read a file by folder ID and relative path
  const readFileFromPath = useCallback(async (
    folderId: string, 
    relativePath: string
  ): Promise<File | null> => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder || !folder.isAccessible) {
      return null;
    }

    try {
      // Navigate through the path to get the file handle
      const pathParts = relativePath.split('/');
      let currentHandle: FileSystemDirectoryHandle = folder.handle;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
      }
      
      const fileHandle = await currentHandle.getFileHandle(pathParts[pathParts.length - 1]);
      return await fileHandle.getFile();
    } catch (err) {
      console.error('Error reading file from path:', err);
      return null;
    }
  }, [folders]);

  // Generate a thumbnail from a File object using Canvas
  const generateThumbnail = useCallback(async (
    file: File, 
    maxSize: number = 300
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        
        // Calculate thumbnail dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        // Create canvas and draw thumbnail
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }, []);

  // Get a cached thumbnail from IndexedDB
  const getCachedThumbnail = useCallback(async (filePath: string): Promise<string | null> => {
    return await getThumbnail(filePath);
  }, []);

  // Refresh folder list
  const refreshFolders = useCallback(async (): Promise<void> => {
    await loadFolders();
  }, [loadFolders]);

  return {
    folders,
    isSupported,
    isLoading,
    error,
    addFolder,
    removeFolder,
    verifyFolderAccess,
    requestPermission,
    scanFolder,
    readFile,
    readFileFromPath,
    generateThumbnail,
    getCachedThumbnail,
    refreshFolders,
  };
}

// ============================================
// Type declarations for File System Access API
// ============================================

declare global {
  interface Window {
    showDirectoryPicker(options?: {
      mode?: 'read' | 'readwrite';
      startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
    }): Promise<FileSystemDirectoryHandle>;
  }

  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemHandle>;
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
    queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
    requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  }

  interface FileSystemFileHandle {
    getFile(): Promise<File>;
    queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
    requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  }

  interface FileSystemHandle {
    readonly kind: 'file' | 'directory';
    readonly name: string;
  }
}

export {};
