import { useState, useEffect } from 'react';
import {
  Cloud, Check, FolderOpen, ChevronRight, ArrowLeft, Download, Search, X, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

type CloudTab = 'gdrive' | 'dropbox' | 'onedrive';

interface CloudFile {
  id: string;
  name: string;
  type: 'folder' | 'image';
  items?: number;
  thumbnail?: string;
}

const gdriveFolders: CloudFile[] = [
  { id: 'f1', name: 'Family 2023', type: 'folder', items: 234 },
  { id: 'f2', name: 'Vacation', type: 'folder', items: 156 },
  { id: 'f3', name: 'Work', type: 'folder', items: 89 },
];
const gdriveFiles: CloudFile[] = Array.from({ length: 8 }, (_, i) => ({
  id: `img${i}`,
  name: `cloud_photo_${i + 1}.jpg`,
  type: 'image' as const,
  thumbnail: `https://picsum.photos/seed/cloud${i}/200/150`,
}));

export default function CloudPage() {
  const [tab, setTab] = useState<CloudTab>('gdrive');
  const [dropboxConnected, setDropboxConnected] = useState(false);
  const [onedriveConnected, setOnedriveConnected] = useState(false);
  const [connectingService, setConnectingService] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [breadcrumb, setBreadcrumb] = useState(['My Drive', 'Photos', '2023']);
  const [files, setFiles] = useState<CloudFile[]>([...gdriveFolders, ...gdriveFiles]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importComplete, setImportComplete] = useState(false);
  const { addToast } = useToast();

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openFolder = (folder: CloudFile) => {
    setBreadcrumb(prev => [...prev, folder.name]);
    setFiles(Array.from({ length: 6 }, (_, i) => ({
      id: `sub${i}`,
      name: `${folder.name.toLowerCase()}_${i + 1}.jpg`,
      type: 'image' as const,
      thumbnail: `https://picsum.photos/seed/${folder.name}${i}/200/150`,
    })));
    setSelectedItems(new Set());
  };

  const goBack = () => {
    if (breadcrumb.length > 1) {
      setBreadcrumb(prev => prev.slice(0, -1));
      setFiles([...gdriveFolders, ...gdriveFiles]);
      setSelectedItems(new Set());
    }
  };

  const navigateBreadcrumb = (idx: number) => {
    setBreadcrumb(prev => prev.slice(0, idx + 1));
    if (idx < 2) setFiles([...gdriveFolders, ...gdriveFiles]);
  };

  const startImport = () => {
    setShowImportModal(true);
    setImportProgress(0);
    setImportComplete(false);
    const interval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setImportComplete(true);
          return 100;
        }
        return prev + (100 / 30);
      });
    }, 100);
  };

  const connectService = (service: string) => {
    setConnectingService(service);
    setTimeout(() => {
      setConnectingService(null);
      if (service === 'dropbox') setDropboxConnected(true);
      if (service === 'onedrive') setOnedriveConnected(true);
      addToast('success', 'Connected!', `Successfully connected to ${service}`);
    }, 2000);
  };

  return (
    <div className="page-enter">
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { key: 'gdrive' as CloudTab, label: 'Google Drive', color: '#4285F4' },
          { key: 'dropbox' as CloudTab, label: 'Dropbox', color: '#0061FF' },
          { key: 'onedrive' as CloudTab, label: 'OneDrive', color: '#0078D4' },
        ].map(t => (
          <button
            key={t.key}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.key ? 'var(--accent-primary)' : 'var(--bg-card)',
              color: tab === t.key ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${tab === t.key ? 'var(--accent-primary)' : 'var(--border)'}`,
            }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Google Drive */}
      {tab === 'gdrive' && (
        <>
          {/* Connection card */}
          <div className="p-5 rounded-xl mb-6 flex items-center justify-between" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold" style={{ background: '#4285F420', color: '#4285F4' }}>
                G
              </div>
              <div>
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Google Drive</div>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--success)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
                  Connected as john.smith@gmail.com
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Storage: 8.4 GB of 15 GB</span>
                  <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="h-full rounded-full" style={{ width: '56%', background: '#4285F4' }} />
                  </div>
                </div>
              </div>
            </div>
            <button className="text-xs px-3 py-1.5 rounded-lg" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              Disconnect
            </button>
          </div>

          {/* Breadcrumb & toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <button onClick={goBack} className="p-1.5 rounded-md mr-2" style={{ background: 'var(--bg-secondary)' }}>
                <ArrowLeft size={14} style={{ color: 'var(--text-secondary)' }} />
              </button>
              {breadcrumb.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  <button
                    className="text-sm hover:underline"
                    style={{ color: i === breadcrumb.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)' }}
                    onClick={() => navigateBreadcrumb(i)}
                  >
                    {crumb}
                  </button>
                  {i < breadcrumb.length - 1 && <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40"
                style={{ background: 'var(--accent-primary)' }}
                disabled={selectedItems.size === 0}
                onClick={startImport}
              >
                <Download size={12} className="inline mr-1" /> Import {selectedItems.size > 0 ? `${selectedItems.size} items` : 'Selected'}
              </button>
            </div>
          </div>

          {/* File grid */}
          <div className="grid grid-cols-4 gap-3">
            {files.map(file => (
              <div
                key={file.id}
                className="rounded-xl overflow-hidden cursor-pointer card-hover group"
                style={{
                  background: 'var(--bg-card)',
                  border: selectedItems.has(file.id) ? '2px solid var(--accent-primary)' : '2px solid var(--border)',
                }}
                onClick={() => file.type === 'folder' ? openFolder(file) : toggleSelect(file.id)}
              >
                {file.type === 'folder' ? (
                  <div className="p-4 flex flex-col items-center gap-2">
                    <FolderOpen size={40} style={{ color: '#4285F4' }} />
                    <div className="text-sm font-medium text-center" style={{ color: 'var(--text-primary)' }}>{file.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{file.items} items</div>
                  </div>
                ) : (
                  <div className="relative aspect-[4/3]">
                    <img src={file.thumbnail} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                    <div
                      className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedItems.has(file.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      style={{
                        borderColor: selectedItems.has(file.id) ? 'var(--accent-primary)' : 'white',
                        background: selectedItems.has(file.id) ? 'var(--accent-primary)' : 'rgba(0,0,0,0.3)',
                      }}
                    >
                      {selectedItems.has(file.id) && <Check size={10} color="white" />}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-white">{file.name}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Dropbox */}
      {tab === 'dropbox' && (
        <div className="flex flex-col items-center justify-center py-20">
          {connectingService === 'dropbox' ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={48} className="animate-spin" style={{ color: '#0061FF' }} />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Redirecting to Dropbox...</h3>
            </div>
          ) : dropboxConnected ? (
            <div className="p-6 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center text-3xl font-bold" style={{ background: '#0061FF20', color: '#0061FF' }}>D</div>
              <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Dropbox Connected!</h3>
              <div className="flex items-center justify-center gap-2 text-xs mb-4" style={{ color: 'var(--success)' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
                Connected successfully
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Browse your Dropbox files to import photos</p>
            </div>
          ) : (
            <div className="p-8 rounded-2xl text-center max-w-md" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center text-4xl font-bold" style={{ background: '#0061FF20', color: '#0061FF' }}>
                D
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Connect your Dropbox account</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Browse, import, and search photos stored in Dropbox</p>
              <button
                className="px-8 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: '#0061FF' }}
                onClick={() => connectService('dropbox')}
              >
                Connect with Dropbox
              </button>
            </div>
          )}
        </div>
      )}

      {/* OneDrive */}
      {tab === 'onedrive' && (
        <div className="flex flex-col items-center justify-center py-20">
          {connectingService === 'onedrive' ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={48} className="animate-spin" style={{ color: '#0078D4' }} />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Redirecting to Microsoft...</h3>
            </div>
          ) : onedriveConnected ? (
            <div className="p-6 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center text-3xl font-bold" style={{ background: '#0078D420', color: '#0078D4' }}>M</div>
              <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>OneDrive Connected!</h3>
              <div className="flex items-center justify-center gap-2 text-xs mb-4" style={{ color: 'var(--success)' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
                Connected successfully
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Browse your OneDrive files to import photos</p>
            </div>
          ) : (
            <div className="p-8 rounded-2xl text-center max-w-md" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center text-4xl font-bold" style={{ background: '#0078D420', color: '#0078D4' }}>
                M
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Connect your OneDrive account</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Browse, import, and search photos stored in OneDrive</p>
              <button
                className="px-8 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: '#0078D4' }}
                onClick={() => connectService('onedrive')}
              >
                Connect with OneDrive
              </button>
            </div>
          )}
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="modal-enter p-6 rounded-2xl w-full max-w-md" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {!importComplete ? (
              <>
                <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>Downloading from Google Drive...</h3>
                <div className="w-full h-3 rounded-full overflow-hidden mb-3" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="h-full rounded-full progress-bar" style={{ width: `${importProgress}%`, background: 'var(--accent-primary)' }} />
                </div>
                <div className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                  {Math.round(importProgress * selectedItems.size / 100)} of {selectedItems.size} files • {Math.round(importProgress * 2.3)} MB downloaded
                </div>
                <button className="text-xs" style={{ color: 'var(--error)' }} onClick={() => setShowImportModal(false)}>Cancel</button>
              </>
            ) : (
              <div className="text-center">
                <Check size={48} className="mx-auto mb-4" style={{ color: 'var(--success)' }} />
                <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Import Complete!</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{selectedItems.size} photos added to Gallery</p>
                <div className="flex gap-3 justify-center">
                  <button
                    className="px-6 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ background: 'var(--accent-primary)' }}
                    onClick={() => { setShowImportModal(false); addToast('info', 'Scanning', 'Scanning imported photos for faces...'); }}
                  >
                    Scan for Faces
                  </button>
                  <button className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }} onClick={() => setShowImportModal(false)}>Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
