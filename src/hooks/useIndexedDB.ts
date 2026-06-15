// IndexedDB persistence for folder handles and app data
// This allows us to persist FileSystemDirectoryHandle objects between sessions
import { getAppCryptoKey, encryptData, decryptData } from '@/utils/crypto';

const DB_NAME = 'FaceFinderDB';
const DB_VERSION = 1;

export interface FolderRecord {
  id: string;
  path: string;
  handle: FileSystemDirectoryHandle;
  addedAt: string;
  lastScanned: string | null;
  imageCount: number;
  indexedCount: number;
  facesFound: number;
}

interface FaceDescriptor {
  id: string;
  personId: string | null;
  filePath: string;
  folderId: string;
  descriptor: number[]; // 128-dimensional face descriptor
  encryptedDescriptor?: string;
  iv?: string;
  box: { x: number; y: number; width: number; height: number };
  confidence: number;
  createdAt: string;
}

interface Person {
  id: string;
  name: string;
  representativeDescriptor: number[];
  photoCount: number;
  createdAt: string;
}

interface SearchResult {
  id: string;
  searchId: string;
  filePath: string;
  folderId: string;
  confidence: number;
  faceBox: { x: number; y: number; width: number; height: number };
  createdAt: string;
}

let db: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Folders store - persists FileSystemDirectoryHandle
      if (!database.objectStoreNames.contains('folders')) {
        const foldersStore = database.createObjectStore('folders', { keyPath: 'id' });
        foldersStore.createIndex('path', 'path', { unique: true });
      }

      // Face descriptors store
      if (!database.objectStoreNames.contains('faceDescriptors')) {
        const descriptorsStore = database.createObjectStore('faceDescriptors', { keyPath: 'id' });
        descriptorsStore.createIndex('folderId', 'folderId', { unique: false });
        descriptorsStore.createIndex('personId', 'personId', { unique: false });
        descriptorsStore.createIndex('filePath', 'filePath', { unique: false });
      }

      // People store
      if (!database.objectStoreNames.contains('people')) {
        database.createObjectStore('people', { keyPath: 'id' });
      }

      // Search results store
      if (!database.objectStoreNames.contains('searchResults')) {
        const searchStore = database.createObjectStore('searchResults', { keyPath: 'id' });
        searchStore.createIndex('searchId', 'searchId', { unique: false });
      }

      // File metadata cache
      if (!database.objectStoreNames.contains('fileMetadata')) {
        const metadataStore = database.createObjectStore('fileMetadata', { keyPath: 'filePath' });
        metadataStore.createIndex('folderId', 'folderId', { unique: false });
      }

      // Thumbnails cache (base64 data URLs)
      if (!database.objectStoreNames.contains('thumbnails')) {
        database.createObjectStore('thumbnails', { keyPath: 'filePath' });
      }
    };
  });
}

// ============================================
// Folder Operations
// ============================================

export async function saveFolder(folder: FolderRecord): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['folders'], 'readwrite');
    const store = transaction.objectStore('folders');
    const request = store.put(folder);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getFolders(): Promise<FolderRecord[]> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['folders'], 'readonly');
    const store = transaction.objectStore('folders');
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function getFolder(id: string): Promise<FolderRecord | undefined> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['folders'], 'readonly');
    const store = transaction.objectStore('folders');
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function deleteFolder(id: string): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['folders', 'faceDescriptors', 'fileMetadata', 'thumbnails'], 'readwrite');
    
    // Delete folder
    transaction.objectStore('folders').delete(id);
    
    // Delete associated face descriptors
    const descriptorStore = transaction.objectStore('faceDescriptors');
    const descriptorIndex = descriptorStore.index('folderId');
    const descriptorRequest = descriptorIndex.openCursor(IDBKeyRange.only(id));
    descriptorRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    // Delete associated metadata
    const metadataStore = transaction.objectStore('fileMetadata');
    const metadataIndex = metadataStore.index('folderId');
    const metadataRequest = metadataIndex.openCursor(IDBKeyRange.only(id));
    metadataRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ============================================
// Face Descriptor Operations
// ============================================

export async function saveFaceDescriptor(descriptor: FaceDescriptor): Promise<void> {
  const database = await initDB();
  const { key } = await getAppCryptoKey();
  const { ciphertext, iv } = await encryptData(key, descriptor.descriptor);
  const toSave = { ...descriptor, descriptor: [], encryptedDescriptor: ciphertext, iv };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['faceDescriptors'], 'readwrite');
    const store = transaction.objectStore('faceDescriptors');
    const request = store.put(toSave);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function decryptDescriptorList(records: FaceDescriptor[]): Promise<FaceDescriptor[]> {
  const { key } = await getAppCryptoKey();
  return Promise.all(records.map(async (row) => {
    if (row.encryptedDescriptor && row.iv) {
      try {
        const desc = await decryptData(key, row.encryptedDescriptor, row.iv);
        return { ...row, descriptor: desc };
      } catch (e) {
        console.error('Failed to decrypt descriptor', e);
        return row;
      }
    }
    return row;
  }));
}

export async function getFaceDescriptors(folderId?: string): Promise<FaceDescriptor[]> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['faceDescriptors'], 'readonly');
    const store = transaction.objectStore('faceDescriptors');
    
    if (folderId) {
      const index = store.index('folderId');
      const request = index.getAll(IDBKeyRange.only(folderId));
      request.onerror = () => reject(request.error);
      request.onsuccess = async () => resolve(await decryptDescriptorList(request.result));
    } else {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = async () => resolve(await decryptDescriptorList(request.result));
    }
  });
}

export async function getFaceDescriptorsByPerson(personId: string): Promise<FaceDescriptor[]> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['faceDescriptors'], 'readonly');
    const store = transaction.objectStore('faceDescriptors');
    const index = store.index('personId');
    const request = index.getAll(IDBKeyRange.only(personId));
    request.onerror = () => reject(request.error);
    request.onsuccess = async () => resolve(await decryptDescriptorList(request.result));
  });
}

// ============================================
// People Operations
// ============================================

export async function savePerson(person: Person): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['people'], 'readwrite');
    const store = transaction.objectStore('people');
    const request = store.put(person);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getPeople(): Promise<Person[]> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['people'], 'readonly');
    const store = transaction.objectStore('people');
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function deletePerson(id: string): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['people', 'faceDescriptors'], 'readwrite');
    transaction.objectStore('people').delete(id);
    
    // Update face descriptors to remove person association
    const descriptorStore = transaction.objectStore('faceDescriptors');
    const index = descriptorStore.index('personId');
    const request = index.openCursor(IDBKeyRange.only(id));
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const record = cursor.value;
        record.personId = null;
        cursor.update(record);
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ============================================
// Thumbnail Cache Operations
// ============================================

export async function saveThumbnail(filePath: string, dataUrl: string): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['thumbnails'], 'readwrite');
    const store = transaction.objectStore('thumbnails');
    const request = store.put({ filePath, dataUrl, cachedAt: new Date().toISOString() });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getThumbnail(filePath: string): Promise<string | null> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['thumbnails'], 'readonly');
    const store = transaction.objectStore('thumbnails');
    const request = store.get(filePath);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result?.dataUrl || null);
  });
}

// ============================================
// File Metadata Operations
// ============================================

export interface FileMetadata {
  filePath: string;
  folderId: string;
  filename: string;
  size: number;
  lastModified: number;
  width?: number;
  height?: number;
  hasBeenScanned: boolean;
  facesDetected: number;
  tags?: string[];
  latitude?: number | null;
  longitude?: number | null;
  embedding?: number[]; // For Cosine Similarity / Find Similar
  videoTimestamps?: { time: number; tags: string[] }[]; // For NLP Video Search
}

export async function saveFileMetadata(metadata: FileMetadata): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['fileMetadata'], 'readwrite');
    const store = transaction.objectStore('fileMetadata');
    const request = store.put(metadata);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getFileMetadata(folderId: string): Promise<FileMetadata[]> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['fileMetadata'], 'readonly');
    const store = transaction.objectStore('fileMetadata');
    const index = store.index('folderId');
    const request = index.getAll(IDBKeyRange.only(folderId));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function getAllFileMetadata(): Promise<FileMetadata[]> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['fileMetadata'], 'readonly');
    const store = transaction.objectStore('fileMetadata');
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// ============================================
// Clear All Data
// ============================================

export async function clearAllData(): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      ['folders', 'faceDescriptors', 'people', 'searchResults', 'fileMetadata', 'thumbnails'],
      'readwrite'
    );
    
    transaction.objectStore('folders').clear();
    transaction.objectStore('faceDescriptors').clear();
    transaction.objectStore('people').clear();
    transaction.objectStore('searchResults').clear();
    transaction.objectStore('fileMetadata').clear();
    transaction.objectStore('thumbnails').clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
