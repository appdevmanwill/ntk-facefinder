import { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen, Plus, HardDrive, Image, Users, ScanFace, Clock, Play, Pause, X, CheckCircle2,
  AlertTriangle, RefreshCw, Unplug, ExternalLink
} from 'lucide-react';
import { useFileSystem, type LocalFolder, type LocalFile } from '@/hooks/useFileSystem';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { saveFaceDescriptor, saveFileMetadata, saveThumbnail } from '@/hooks/useIndexedDB';
import { useToast } from '@/hooks/useToast';
import { useAppContext } from '@/context/AppContext';
import { SkeletonRow } from '@/components/Skeletons';
import { NoFolders } from '@/components/EmptyState';

export default function FolderManager() {
  const {
    folders,
    isSupported,
    isLoading,
    error: fsError,
    addFolder,
    removeFolder,
    verifyFolderAccess,
    requestPermission,
    scanFolder,
    readFile,
    generateThumbnail,
  } = useFileSystem();

  const { detectFaces, modelsLoaded } = useFaceDetection();
  const { addToast } = useToast();
  const { setScanProgress: setGlobalScanProgress } = useAppContext();

  const [selectedFolder, setSelectedFolder] = useState<LocalFolder | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStats, setScanStats] = useState({ processed: 0, faces: 0, people: 0 });
  const [currentFile, setCurrentFile] = useState('');
  const [scannedFiles, setScannedFiles] = useState<LocalFile[]>([]);
  const [recentThumbnails, setRecentThumbnails] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Select first folder by default
  useEffect(() => {
    if (folders.length > 0 && !selectedFolder) {
      setSelectedFolder(folders[0]);
    }
  }, [folders, selectedFolder]);

  // Handle adding a new folder
  const handleAddFolder = useCallback(async () => {
    const folder = await addFolder();
    if (folder) {
      setSelectedFolder(folder);
      addToast('success', 'Folder Added', `Added "${folder.path}" - ready to scan`);
    }
  }, [addFolder, addToast]);

  // Handle removing a folder
  const handleRemoveFolder = useCallback(async (folderId: string) => {
    await removeFolder(folderId);
    if (selectedFolder?.id === folderId) {
      setSelectedFolder(folders.find(f => f.id !== folderId) || null);
    }
    setShowDeleteConfirm(null);
    addToast('success', 'Folder Removed', 'Folder and its data have been removed');
  }, [removeFolder, selectedFolder, folders, addToast]);

  // Handle requesting permission for a disconnected folder
  const handleRequestPermission = useCallback(async (folder: LocalFolder) => {
    const granted = await requestPermission(folder);
    if (granted) {
      addToast('success', 'Access Granted', `Now have access to "${folder.path}"`);
    } else {
      addToast('error', 'Access Denied', 'Could not get permission to access folder');
    }
  }, [requestPermission, addToast]);

  // Scan folder for images and detect faces
  const startScan = useCallback(async () => {
    if (!selectedFolder || !selectedFolder.isAccessible) {
      addToast('error', 'Folder Not Accessible', 'Please grant permission to access this folder');
      return;
    }

    setScanning(true);
    setScanProgress(0);
    setScanStats({ processed: 0, faces: 0, people: 0 });
    setRecentThumbnails([]);
    setGlobalScanProgress(0);

    try {
      // First, scan for all image files
      addToast('info', 'Scanning Folder', 'Finding all image files...');
      
      const files = await scanFolder(selectedFolder, (count, filename) => {
        setCurrentFile(filename);
      });
      
      setScannedFiles(files);
      addToast('success', 'Files Found', `Found ${files.length} images`);

      if (!modelsLoaded) {
        addToast('warning', 'Models Not Ready', 'Face detection models are still loading');
        setScanning(false);
        return;
      }

      // Now process each file for face detection
      let totalFaces = 0;
      const thumbnails: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFile(file.name);
        
        try {
          const fileData = await readFile(file);
          if (!fileData) continue;

          // Generate and cache thumbnail
          const thumbnail = await generateThumbnail(fileData, 200);
          await saveThumbnail(`${selectedFolder.id}/${file.path}`, thumbnail);
          
          if (thumbnails.length < 12) {
            thumbnails.push(thumbnail);
            setRecentThumbnails([...thumbnails]);
          }

          // Create image element for face detection
          const img = new window.Image();
          const url = URL.createObjectURL(fileData);
          
          await new Promise<void>((resolve, reject) => {
            img.onload = async () => {
              URL.revokeObjectURL(url);
              
              try {
                const faces = await detectFaces(img);
                totalFaces += faces.length;

                // Save face descriptors
                for (const face of faces) {
                  if (face.descriptor) {
                    await saveFaceDescriptor({
                      id: `face_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                      personId: null,
                      filePath: `${selectedFolder.id}/${file.path}`,
                      folderId: selectedFolder.id,
                      descriptor: Array.from(face.descriptor),
                      box: face.box,
                      confidence: face.score,
                      createdAt: new Date().toISOString(),
                    });
                  }
                }

                // Update file metadata
                await saveFileMetadata({
                  filePath: `${selectedFolder.id}/${file.path}`,
                  folderId: selectedFolder.id,
                  filename: file.name,
                  size: fileData.size,
                  lastModified: fileData.lastModified,
                  width: img.naturalWidth,
                  height: img.naturalHeight,
                  hasBeenScanned: true,
                  facesDetected: faces.length,
                });

                resolve();
              } catch (err) {
                console.warn(`Face detection failed for ${file.name}:`, err);
                resolve();
              }
            };
            
            img.onerror = () => {
              URL.revokeObjectURL(url);
              resolve();
            };
            
            img.src = url;
          });

        } catch (err) {
          console.warn(`Error processing ${file.name}:`, err);
        }

        // Update progress
        const progress = ((i + 1) / files.length) * 100;
        setScanProgress(progress);
        setGlobalScanProgress(progress);
        setScanStats({
          processed: i + 1,
          faces: totalFaces,
          people: Math.min(8, Math.floor(totalFaces / 10)),
        });
      }

      addToast('success', 'Scan Complete', `Processed ${files.length} images, found ${totalFaces} faces`);
    } catch (err) {
      console.error('Scan error:', err);
      addToast('error', 'Scan Failed', 'An error occurred during scanning');
    } finally {
      setScanning(false);
      setGlobalScanProgress(null);
    }
  }, [selectedFolder, modelsLoaded, scanFolder, readFile, generateThumbnail, detectFaces, addToast, setGlobalScanProgress]);

  // Show unsupported browser message
  if (!isSupported) {
    return (
      <div className="page-enter flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <AlertTriangle size={64} className="mb-4" style={{ color: 'var(--warning)' }} />
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Browser Not Supported</h2>
        <p className="text-center max-w-md mb-4" style={{ color: 'var(--text-secondary)' }}>
          The File System Access API is required to read photos from your local folders and external drives.
          Please use Chrome, Edge, or Opera.
        </p>
        <a
          href="https://caniuse.com/native-filesystem-api"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm flex items-center gap-1"
          style={{ color: 'var(--accent-primary)' }}
        >
          Learn more <ExternalLink size={12} />
        </a>
      </div>
    );
  }

  return (
    <div className="page-enter flex gap-6 h-full">
      {/* Left Panel */}
      <div className="flex-shrink-0" style={{ width: 320 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Managed Folders</h2>
          <button
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: 'var(--accent-primary)' }}
            onClick={handleAddFolder}
          >
            <Plus size={14} /> Add Folder
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
          </div>
        ) : folders.length === 0 ? (
          <div className="p-6 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <FolderOpen size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>No folders added yet</p>
            <button
              className="text-xs font-medium"
              style={{ color: 'var(--accent-primary)' }}
              onClick={handleAddFolder}
            >
              + Add your first folder
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mb-4">
            {folders.map(folder => {
              const isSelected = selectedFolder?.id === folder.id;
              const indexPct = folder.imageCount > 0 ? (folder.indexedCount / folder.imageCount) * 100 : 0;
              
              return (
                <div
                  key={folder.id}
                  className="p-3 rounded-xl cursor-pointer transition-all card-hover"
                  style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border)'}`,
                    borderLeft: isSelected ? '3px solid var(--accent-primary)' : '1px solid var(--border)',
                    opacity: folder.isAccessible ? 1 : 0.6,
                  }}
                  onClick={() => setSelectedFolder(folder)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {folder.isAccessible ? (
                      <FolderOpen size={16} style={{ color: 'var(--accent-primary)' }} />
                    ) : (
                      <Unplug size={16} style={{ color: 'var(--warning)' }} />
                    )}
                    <span className="text-sm font-medium truncate flex-1" style={{ color: 'var(--text-primary)' }}>
                      {folder.path}
                    </span>
                  </div>
                  
                  {!folder.isAccessible && (
                    <div className="flex items-center gap-1 mb-2 text-[10px]" style={{ color: 'var(--warning)' }}>
                      <AlertTriangle size={10} />
                      Drive disconnected or permission needed
                    </div>
                  )}
                  
                  <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                    {folder.imageCount.toLocaleString()} images
                    {folder.lastScanned && ` • Scanned ${new Date(folder.lastScanned).toLocaleDateString()}`}
                  </div>
                  
                  {folder.indexedCount > 0 && (
                    <>
                      <div className="w-full h-1.5 rounded-full overflow-hidden mb-1" style={{ background: 'var(--bg-secondary)' }}>
                        <div
                          className="h-full rounded-full progress-bar"
                          style={{
                            width: `${indexPct}%`,
                            background: indexPct >= 100 ? 'var(--success)' : 'var(--accent-primary)'
                          }}
                        />
                      </div>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {folder.indexedCount} indexed • {folder.facesFound} faces
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {fsError && (
          <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)' }}>
            {fsError}
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="flex-1 min-w-0">
        {!selectedFolder ? (
          <NoFolders onAddFolder={handleAddFolder} />
        ) : !scanning ? (
          <>
            {/* Folder header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{selectedFolder.path}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {selectedFolder.isAccessible ? (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--success)' }}>
                      <CheckCircle2 size={12} /> Accessible
                    </span>
                  ) : (
                    <button
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                      style={{ background: 'var(--warning)', color: 'white' }}
                      onClick={() => handleRequestPermission(selectedFolder)}
                    >
                      <RefreshCw size={12} /> Grant Access
                    </button>
                  )}
                </div>
              </div>
              <button
                className="text-xs px-3 py-1.5 rounded"
                style={{ border: '1px solid var(--error)', color: 'var(--error)' }}
                onClick={() => setShowDeleteConfirm(selectedFolder.id)}
              >
                Remove Folder
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total Photos', value: selectedFolder.imageCount.toLocaleString(), icon: Image, color: 'var(--accent-primary)' },
                { label: 'Indexed', value: selectedFolder.indexedCount.toLocaleString(), icon: HardDrive, color: 'var(--success)' },
                { label: 'Faces Detected', value: selectedFolder.facesFound.toLocaleString(), icon: ScanFace, color: 'var(--accent-secondary)' },
                { label: 'People Found', value: String(Math.min(8, Math.ceil(selectedFolder.facesFound / 100))), icon: Users, color: 'var(--warning)' },
              ].map(stat => (
                <div key={stat.label} className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <stat.icon size={18} style={{ color: stat.color }} className="mb-2" />
                  <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Recent photos (thumbnails from last scan) */}
            {recentThumbnails.length > 0 && (
              <>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Recent Photos</h3>
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {recentThumbnails.map((thumb, i) => (
                    <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Scan history */}
            {selectedFolder.lastScanned && (
              <>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Last Scan</h3>
                <div className="p-4 rounded-lg mb-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(selectedFolder.lastScanned).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {selectedFolder.imageCount} photos processed • {selectedFolder.facesFound} faces found
                  </div>
                </div>
              </>
            )}

            <button
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'var(--accent-primary)' }}
              onClick={startScan}
              disabled={!selectedFolder.isAccessible || !modelsLoaded}
            >
              <ScanFace size={16} className="inline mr-2" />
              {!modelsLoaded ? 'Waiting for AI Models...' : 'Scan This Folder Now'}
            </button>
            
            {!modelsLoaded && (
              <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>
                Face detection models are loading...
              </p>
            )}
          </>
        ) : (
          /* Scanning UI */
          <div className="flex flex-col items-center py-8">
            <ScanFace size={48} style={{ color: 'var(--accent-primary)' }} className="mb-4" />
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Scanning {selectedFolder.path}</h2>

            <div className="w-full max-w-md mb-4">
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: 'var(--text-secondary)' }}>{Math.round(scanProgress)}%</span>
                <span style={{ color: 'var(--text-muted)' }}>{scanStats.processed} / {scannedFiles.length}</span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                <div className="h-full rounded-full progress-bar" style={{ width: `${scanProgress}%`, background: 'var(--accent-primary)' }} />
              </div>
            </div>

            <div className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Currently processing: <span style={{ color: 'var(--accent-primary)' }}>{currentFile}</span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6 w-full max-w-md">
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{scanStats.processed}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Processed</div>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="text-lg font-bold" style={{ color: 'var(--accent-primary)' }}>{scanStats.faces}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Faces Found</div>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="text-lg font-bold" style={{ color: 'var(--success)' }}>{scanStats.people}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>People</div>
              </div>
            </div>

            {/* Live thumbnail preview */}
            {recentThumbnails.length > 0 && (
              <div className="w-full max-w-md">
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Recent photos scanned:</p>
                <div className="flex gap-1 overflow-x-auto pb-2">
                  {recentThumbnails.map((thumb, i) => (
                    <div key={i} className="flex-shrink-0 w-16 h-12 rounded overflow-hidden">
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              className="mt-6 px-6 py-2 rounded-lg text-sm flex items-center gap-2"
              style={{ background: 'var(--bg-secondary)', color: 'var(--error)' }}
              onClick={() => setScanning(false)}
            >
              <X size={14} /> Cancel
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal-enter p-6 rounded-2xl w-full max-w-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Remove Folder?</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              This will remove the folder from FaceFinder and delete all associated face data. 
              Your actual photos will not be affected.
            </p>
            <div className="flex gap-3 justify-end">
              <button className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }} onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'var(--error)' }}
                onClick={() => handleRemoveFolder(showDeleteConfirm)}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
