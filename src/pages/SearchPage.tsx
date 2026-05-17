import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ScanFace, Upload, Check, ChevronRight, Pause, X, Eye, Ban,
  FolderOpen, Cloud, Download, CheckCircle2, ChevronLeft, ChevronDown, AlertTriangle
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/useToast';
import { useUndo } from '@/hooks/useUndo';
import { useFaceDetection, cropFaceFromImage, compareFaces, type DetectedFace } from '@/hooks/useFaceDetection';
import { useFileSystem, type LocalFile } from '@/hooks/useFileSystem';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { getFaceDescriptors } from '@/hooks/useIndexedDB';
import { SkeletonGrid } from '@/components/Skeletons';
import { NoSearchResults, NoFacesDetected } from '@/components/EmptyState';
import ExifViewer from '@/components/ExifViewer';

interface SearchResult {
  id: string;
  folder: string;
  folderId: string;
  filename: string;
  relativePath: string;
  thumbnail: string;
  confidence: number;
  selected: boolean;
  faceBox: { x: number; y: number; w: number; h: number };
  date: string;
  size: string;
  dimensions: string;
  camera?: string;
  iso?: string;
  shutter?: string;
  aperture?: string;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve(img);
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

type Step = 1 | 2 | 3;

const RESULTS_PER_PAGE = 24;

export default function SearchPage() {
  const [step, setStep] = useState<Step>(1);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [selectedFaceIdx, setSelectedFaceIdx] = useState<number | null>(null);
  const [faceThumbnail, setFaceThumbnail] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [referenceCount, setReferenceCount] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 state
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [sensitivity, setSensitivity] = useState<'strict' | 'balanced' | 'broad'>('balanced');
  const [showLowConf, setShowLowConf] = useState(false);
  const [searchSubfolders, setSearchSubfolders] = useState(true);

  // Step 3 state
  const [searching, setSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [searchComplete, setSearchComplete] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [folderFilter, setFolderFilter] = useState('all');
  const [confFilter, setConfFilter] = useState(0);
  const [sortBy, setSortBy] = useState('confidence');
  const [previewResult, setPreviewResult] = useState<SearchResult | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const { addToast } = useToast();
  const { pushAction } = useUndo();
  const { setScanProgress, modelsLoaded } = useAppContext();
  const { detectFaces, drawDetections } = useFaceDetection();
  const fileSystem = useFileSystem();
  const cancelRef = useRef(false);
  const [searchStats, setSearchStats] = useState({ processed: 0, total: 0, matches: 0, currentFile: '' });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSelectAll: () => setResults(prev => prev.map(r => ({ ...r, selected: true }))),
    onDeselectAll: () => setResults(prev => prev.map(r => ({ ...r, selected: false }))),
    onEscape: () => setPreviewResult(null),
  }, step === 3 && searchComplete);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      addToast('error', 'Invalid file', 'Please upload an image file');
      return;
    }
    
    setAnalyzing(true);
    setDetectedFaces([]);
    setSelectedFaceIdx(null);
    setFaceThumbnail(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setUploadedImage(dataUrl);

      // Create image element for face detection
      const img = new Image();
      img.onload = async () => {
        imageRef.current = img;

        if (modelsLoaded) {
          try {
            const faces = await detectFaces(img);
            setDetectedFaces(faces);
            
            if (faces.length > 0) {
              setSelectedFaceIdx(0);
              const thumbnail = cropFaceFromImage(img, faces[0].box);
              setFaceThumbnail(thumbnail);
              addToast('success', 'Face detected!', `${faces.length} face${faces.length > 1 ? 's' : ''} found in the reference photo`);
              
              // Draw on canvas
              if (canvasRef.current) {
                drawDetections(canvasRef.current, img, faces, 0);
              }
            } else {
              addToast('warning', 'No faces detected', 'Try uploading a clearer photo');
            }
          } catch (error) {
            console.error('Face detection error:', error);
            addToast('error', 'Detection failed', 'Could not analyze the image');
          }
        } else {
          // Simulate for demo if models aren't loaded
          setTimeout(() => {
            const simulatedFaces: DetectedFace[] = [
              { box: { x: img.width * 0.3, y: img.height * 0.2, width: img.width * 0.25, height: img.height * 0.35 }, score: 0.95 }
            ];
            setDetectedFaces(simulatedFaces);
            setSelectedFaceIdx(0);
            setFaceThumbnail(dataUrl);
            addToast('success', 'Face detected!', '1 face found (demo mode)');
          }, 1500);
        }
        
        setAnalyzing(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [addToast, modelsLoaded, detectFaces, drawDetections]);

  const handleFaceSelect = useCallback((idx: number) => {
    setSelectedFaceIdx(idx);
    if (imageRef.current && detectedFaces[idx]) {
      const thumbnail = cropFaceFromImage(imageRef.current, detectedFaces[idx].box);
      setFaceThumbnail(thumbnail);
      if (canvasRef.current) {
        drawDetections(canvasRef.current, imageRef.current, detectedFaces, idx);
      }
    }
  }, [detectedFaces, drawDetections]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const startSearch = useCallback(async () => {
    if (selectedFaceIdx === null || !detectedFaces[selectedFaceIdx]?.descriptor) {
      addToast('error', 'No face selected', 'Please select a face to search for');
      return;
    }

    const referenceDescriptor = detectedFaces[selectedFaceIdx].descriptor!;
    const threshold = sensitivity === 'strict' ? 65 : sensitivity === 'balanced' ? 50 : 35;

    cancelRef.current = false;
    setStep(3);
    setSearching(true);
    setSearchProgress(0);
    setSearchComplete(false);
    setResults([]);
    setLoading(true);
    setScanProgress(0);
    setCurrentPage(1);
    setSearchStats({ processed: 0, total: 0, matches: 0, currentFile: '' });

    const matchResults: SearchResult[] = [];

    try {
      // Get real folders that are selected and accessible
      const foldersToSearch = fileSystem.folders.filter(
        f => selectedFolders.includes(f.id) && f.isAccessible
      );

      if (foldersToSearch.length === 0) {
        addToast('error', 'No accessible folders', 'Please add and grant access to folders first');
        setSearching(false);
        setLoading(false);
        return;
      }

      // Phase 1: Scan all selected folders to discover image files
      let allFiles: { file: LocalFile; folderPath: string; folderId: string }[] = [];
      for (const folder of foldersToSearch) {
        if (cancelRef.current) break;
        setSearchStats(s => ({ ...s, currentFile: `Scanning ${folder.path}...` }));
        const files = await fileSystem.scanFolder(folder);
        allFiles.push(...files.map(f => ({ file: f, folderPath: folder.path, folderId: folder.id })));
      }

      const total = allFiles.length;
      setSearchStats(s => ({ ...s, total }));

      if (total === 0) {
        addToast('warning', 'No images found', 'The selected folders contain no supported image files');
        setSearching(false);
        setSearchComplete(true);
        setLoading(false);
        setScanProgress(null);
        return;
      }

      // Phase 2: Process each image — detect faces & compare
      for (let i = 0; i < allFiles.length; i++) {
        if (cancelRef.current) break;

        const { file, folderPath, folderId } = allFiles[i];
        setSearchStats(s => ({ ...s, processed: i + 1, currentFile: file.name }));

        try {
          const rawFile = await fileSystem.readFile(file);
          if (!rawFile) continue;

          const img = await loadImageFromFile(rawFile);

          const faces = await detectFaces(img);

          for (const face of faces) {
            if (face.descriptor) {
              const similarity = compareFaces(referenceDescriptor, face.descriptor);
              if (similarity >= threshold) {
                const thumbnail = await fileSystem.generateThumbnail(rawFile, 300);

                matchResults.push({
                  id: `${folderId}_${file.path}_${matchResults.length}`,
                  folder: folderPath,
                  folderId,
                  filename: file.name,
                  relativePath: file.path,
                  thumbnail,
                  confidence: Math.round(similarity),
                  selected: similarity >= 80,
                  faceBox: { x: face.box.x, y: face.box.y, w: face.box.width, h: face.box.height },
                  date: new Date(file.lastModified).toISOString().slice(0, 10),
                  size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                  dimensions: `${img.naturalWidth}x${img.naturalHeight}`,
                });

                setSearchStats(s => ({ ...s, matches: matchResults.length }));
              }
            }
          }

          // Clean up object URL
          if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
        } catch (err) {
          console.warn(`Error processing ${file.name}:`, err);
        }

        // Update progress
        const progress = ((i + 1) / total) * 100;
        setSearchProgress(progress);
        setScanProgress(progress);

        // Push live results every 5 files
        if ((i + 1) % 5 === 0 || i + 1 === total) {
          setResults([...matchResults]);
        }

        // Yield to UI thread
        await new Promise(r => setTimeout(r, 0));
      }
    } catch (err) {
      console.error('Search failed:', err);
      addToast('error', 'Search Error', 'An unexpected error occurred during the search');
    }

    // Final update
    setResults([...matchResults]);
    setSearching(false);
    setSearchComplete(true);
    setScanProgress(null);
    setLoading(false);

    if (!cancelRef.current) {
      setShowConfetti(true);
      addToast('success', 'Search Complete!', `Found ${matchResults.length} matches in ${searchStats.total} photos`);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [selectedFaceIdx, detectedFaces, sensitivity, selectedFolders, fileSystem, detectFaces, setScanProgress, addToast]);

  const toggleResultSelect = (id: string) => {
    const result = results.find(r => r.id === id);
    const wasSelected = result?.selected;
    
    setResults(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
    
    pushAction({
      description: wasSelected ? 'Deselected photo' : 'Selected photo',
      undo: () => setResults(prev => prev.map(r => r.id === id ? { ...r, selected: wasSelected || false } : r)),
      redo: () => setResults(prev => prev.map(r => r.id === id ? { ...r, selected: !wasSelected } : r)),
    });
  };

  const selectAll = () => {
    const prevSelected = results.map(r => ({ id: r.id, selected: r.selected }));
    setResults(prev => prev.map(r => ({ ...r, selected: true })));
    pushAction({
      description: `Selected all ${results.length} photos`,
      undo: () => setResults(prev => prev.map(r => ({ ...r, selected: prevSelected.find(p => p.id === r.id)?.selected || false }))),
      redo: () => setResults(prev => prev.map(r => ({ ...r, selected: true }))),
    });
  };

  const deselectAll = () => {
    const prevSelected = results.map(r => ({ id: r.id, selected: r.selected }));
    setResults(prev => prev.map(r => ({ ...r, selected: false })));
    pushAction({
      description: 'Deselected all photos',
      undo: () => setResults(prev => prev.map(r => ({ ...r, selected: prevSelected.find(p => p.id === r.id)?.selected || false }))),
      redo: () => setResults(prev => prev.map(r => ({ ...r, selected: false }))),
    });
  };

  const selectAbove90 = () => {
    const prevSelected = results.map(r => ({ id: r.id, selected: r.selected }));
    setResults(prev => prev.map(r => ({ ...r, selected: r.confidence >= 90 })));
    pushAction({
      description: 'Selected photos above 90% confidence',
      undo: () => setResults(prev => prev.map(r => ({ ...r, selected: prevSelected.find(p => p.id === r.id)?.selected || false }))),
      redo: () => setResults(prev => prev.map(r => ({ ...r, selected: r.confidence >= 90 }))),
    });
  };

  const filteredResults = results
    .filter(r => folderFilter === 'all' || r.folder === folderFilter)
    .filter(r => r.confidence >= confFilter)
    .sort((a, b) => sortBy === 'confidence' ? b.confidence - a.confidence : sortBy === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));

  const paginatedResults = filteredResults.slice(0, currentPage * RESULTS_PER_PAGE);
  const hasMore = paginatedResults.length < filteredResults.length;

  const selectedCount = results.filter(r => r.selected).length;
  const folders = [...new Set(results.map(r => r.folder))];

  const navigatePreview = useCallback((direction: 'prev' | 'next') => {
    const currentIdx = filteredResults.findIndex(r => r.id === previewResult?.id);
    if (currentIdx === -1) return;
    const newIdx = direction === 'prev' 
      ? (currentIdx - 1 + filteredResults.length) % filteredResults.length
      : (currentIdx + 1) % filteredResults.length;
    setPreviewResult(filteredResults[newIdx]);
    setPreviewIndex(newIdx);
  }, [filteredResults, previewResult]);

  // Preview keyboard navigation
  useEffect(() => {
    if (!previewResult) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') navigatePreview('prev');
      if (e.key === 'ArrowRight') navigatePreview('next');
      if (e.key === 'Escape') setPreviewResult(null);
      if (e.key === ' ') {
        e.preventDefault();
        toggleResultSelect(previewResult.id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [previewResult, navigatePreview]);

  return (
    <div className="page-enter">
      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-8">
        {[
          { num: 1, label: 'Upload Reference' },
          { num: 2, label: 'Configure Search' },
          { num: 3, label: 'Results' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => { if (s.num < step) setStep(s.num as Step); }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                style={{
                  background: step >= s.num ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: step >= s.num ? 'white' : 'var(--text-muted)'
                }}
              >
                {step > s.num ? <Check size={16} /> : s.num}
              </div>
              <span className="text-sm font-medium" style={{ color: step >= s.num ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {s.label}
              </span>
            </div>
            {i < 2 && <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {!uploadedImage ? (
            <>
              <div
                className="relative rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
                style={{
                  width: 600,
                  height: 280,
                  border: dragOver ? '2px solid var(--accent-primary)' : '2px dashed var(--border)',
                  background: dragOver ? 'rgba(99,102,241,0.05)' : 'var(--bg-card)',
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <ScanFace size={64} style={{ color: 'var(--accent-primary)' }} className="mb-4" />
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {dragOver ? 'Drop it!' : 'Drop a reference photo to find this person'}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Supports JPG, PNG, WEBP, HEIC • Works with group photos
                </p>
                <button
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
                  style={{ background: 'var(--accent-primary)' }}
                >
                  <Upload size={16} className="inline mr-2" />
                  Browse Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                />
              </div>
              <div className="flex gap-4 mt-6">
                {['✓ Group photos supported', '✓ Multiple references for better accuracy', '✓ All photo formats'].map(pill => (
                  <span key={pill} className="px-3 py-1.5 rounded-full text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    {pill}
                  </span>
                ))}
              </div>
            </>
          ) : analyzing ? (
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Analyzing photo...</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Running AI face detection</p>
            </div>
          ) : detectedFaces.length === 0 ? (
            <NoFacesDetected onRetry={() => { setUploadedImage(null); fileInputRef.current?.click(); }} />
          ) : (
            <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
              <div className="relative rounded-xl overflow-hidden" style={{ border: '2px solid var(--border)', maxWidth: 500 }}>
                <canvas ref={canvasRef} className="w-full" style={{ display: 'block', maxHeight: 400 }} />
                {/* Clickable face overlays */}
                {imageRef.current && detectedFaces.map((face, idx) => {
                  const scaleX = (canvasRef.current?.width || 500) / (imageRef.current?.naturalWidth || 500);
                  const scaleY = (canvasRef.current?.height || 400) / (imageRef.current?.naturalHeight || 400);
                  return (
                    <div
                      key={idx}
                      className="absolute cursor-pointer"
                      style={{
                        left: face.box.x * scaleX,
                        top: face.box.y * scaleY,
                        width: face.box.width * scaleX,
                        height: face.box.height * scaleY,
                      }}
                      onClick={() => handleFaceSelect(idx)}
                    />
                  );
                })}
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--success)' }}>
                  <CheckCircle2 size={18} />
                  <span className="font-semibold">
                    {detectedFaces.length === 1 ? 'Face detected!' : `${detectedFaces.length} faces found — click the person you want to find`}
                  </span>
                </div>

                <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="w-12 h-12 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                    {faceThumbnail && <img src={faceThumbnail} alt="face" className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Search Target</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {referenceCount === 1 ? '🟡 Good' : referenceCount === 2 ? '🟢 Better' : '🟢 Best'} Accuracy
                      {selectedFaceIdx !== null && detectedFaces[selectedFaceIdx] && (
                        <span className="ml-2">• {Math.round(detectedFaces[selectedFaceIdx].score * 100)}% confidence</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  className="px-8 py-3 rounded-lg text-sm font-semibold text-white transition-all"
                  style={{ background: 'var(--accent-primary)' }}
                  onClick={() => setStep(2)}
                >
                  Looks Good — Continue →
                </button>

                <button
                  className="text-xs underline"
                  style={{ color: 'var(--text-muted)' }}
                  onClick={() => {
                    setReferenceCount(prev => prev + 1);
                    addToast('info', 'Add Another Photo', 'Click to upload another reference photo');
                  }}
                >
                  + Add another photo of the same person (improves accuracy)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 2 && (
        <div className="max-w-3xl mx-auto pb-24">
          {/* Target card */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="w-10 h-10 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
              {faceThumbnail && <img src={faceThumbnail} alt="target" className="w-full h-full object-cover" />}
            </div>
            <div>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Searching for: Unknown Person</span>
              <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>
                • {referenceCount === 1 ? 'Good' : referenceCount === 2 ? 'Better' : 'Best'} Accuracy
              </span>
            </div>
          </div>

          {/* Local Folders */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <FolderOpen size={18} /> Local Folders
              </h3>
              <div className="flex gap-3 text-xs">
                <button style={{ color: 'var(--accent-primary)' }} onClick={() => setSelectedFolders(fileSystem.folders.filter(f => f.isAccessible).map(f => f.id))}>Select All</button>
                <button style={{ color: 'var(--text-muted)' }} onClick={() => setSelectedFolders([])}>Deselect All</button>
              </div>
            </div>
            {!fileSystem.isSupported ? (
              <div className="flex flex-col items-center py-8 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)' }}>
                <AlertTriangle size={32} style={{ color: 'var(--warning)', marginBottom: 8 }} />
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Folder scanning requires a desktop browser</p>
                <p className="text-xs text-center px-4 mb-3" style={{ color: 'var(--text-secondary)', maxWidth: 400 }}>
                  The File System Access API is needed to scan local folders. Please use <strong>Chrome</strong>, <strong>Edge</strong>, or <strong>Opera</strong> on a desktop computer for the full search experience.
                </p>
                <span className="text-[10px] px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  Reference photo upload still works on this device ✓
                </span>
              </div>
            ) : fileSystem.folders.length === 0 ? (
              <div className="flex flex-col items-center py-8 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)' }}>
                <FolderOpen size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>No folders added yet</p>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ background: 'var(--accent-primary)' }}
                  onClick={() => fileSystem.addFolder()}
                >
                  + Add Local Folder
                </button>
              </div>
            ) : (
            <div className="flex flex-col gap-2">
              {fileSystem.folders.map(folder => (
                <div
                  key={folder.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all card-hover"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: folder.isAccessible ? 1 : 0.5 }}
                  onClick={() => {
                    if (!folder.isAccessible) {
                      fileSystem.requestPermission(folder);
                      return;
                    }
                    setSelectedFolders(prev =>
                      prev.includes(folder.id) ? prev.filter(id => id !== folder.id) : [...prev, folder.id]
                    );
                  }}
                >
                  <div
                    className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                    style={{
                      borderColor: selectedFolders.includes(folder.id) ? 'var(--accent-primary)' : 'var(--border)',
                      background: selectedFolders.includes(folder.id) ? 'var(--accent-primary)' : 'transparent',
                    }}
                  >
                    {selectedFolders.includes(folder.id) && <Check size={12} color="white" />}
                  </div>
                  <FolderOpen size={16} style={{ color: 'var(--text-muted)' }} />
                  <div className="flex-1">
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{folder.path}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {folder.imageCount > 0 ? `${folder.imageCount.toLocaleString()} images` : 'Not scanned yet'}
                    </div>
                  </div>
                  {!folder.isAccessible ? (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--error)' }}>
                      Re-grant Access
                    </span>
                  ) : folder.lastScanned ? (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)' }}>
                      Ready
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(71,85,105,0.15)', color: 'var(--text-muted)' }}>
                      Will scan on search
                    </span>
                  )}
                </div>
              ))}
              <button
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm transition-all"
                style={{ border: '1px dashed var(--border)', color: 'var(--text-secondary)' }}
                onClick={() => fileSystem.addFolder()}
              >
                + Add Another Folder
              </button>
            </div>
            )}
          </div>

          {/* Cloud Storage */}
          <div className="mb-6">
            <h3 className="font-semibold flex items-center gap-2 mb-3" style={{ color: 'var(--text-primary)' }}>
              <Cloud size={18} /> Cloud Storage
            </h3>
            <div className="flex flex-col gap-2">
              {[
                { name: 'Google Drive', email: 'john@gmail.com', connected: true, color: '#4285F4' },
                { name: 'Dropbox', email: '', connected: false, color: '#0061FF' },
                { name: 'OneDrive', email: '', connected: false, color: '#0078D4' },
              ].map(cloud => (
                <div key={cloud.name} className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: cloud.connected ? 'var(--success)' : 'var(--text-muted)' }} />
                  <div className="flex-1">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{cloud.name}</span>
                    {cloud.connected && <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>({cloud.email})</span>}
                    {!cloud.connected && <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>Not Connected</span>}
                  </div>
                  <button
                    className="text-xs px-3 py-1 rounded-md"
                    style={{
                      background: cloud.connected ? 'transparent' : 'var(--bg-secondary)',
                      color: cloud.connected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      border: cloud.connected ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    {cloud.connected ? 'Browse Folders' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Search Settings */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Search Settings</h3>
            <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="mb-4">
                <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Match Sensitivity</div>
                <div className="flex gap-1 mb-1">
                  {(['strict', 'balanced', 'broad'] as const).map(s => (
                    <button
                      key={s}
                      className="px-4 py-1.5 rounded-md text-xs font-medium transition-all capitalize"
                      style={{
                        background: sensitivity === s ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: sensitivity === s ? 'white' : 'var(--text-secondary)',
                      }}
                      onClick={() => setSensitivity(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {sensitivity === 'strict' ? 'Only very close matches — fewer results, higher confidence' :
                    sensitivity === 'balanced' ? 'Recommended — good balance of accuracy and coverage' :
                      'More matches including distant similarities — may include false positives'}
                </p>
              </div>

              <div className="flex items-center justify-between py-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Show low confidence matches</span>
                <button
                  className="w-10 h-5 rounded-full transition-all relative"
                  style={{ background: showLowConf ? 'var(--accent-primary)' : 'var(--bg-secondary)' }}
                  onClick={() => setShowLowConf(!showLowConf)}
                >
                  <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: showLowConf ? 22 : 2 }} />
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Search sub-folders</span>
                <button
                  className="w-10 h-5 rounded-full transition-all relative"
                  style={{ background: searchSubfolders ? 'var(--accent-primary)' : 'var(--bg-secondary)' }}
                  onClick={() => setSearchSubfolders(!searchSubfolders)}
                >
                  <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: searchSubfolders ? 22 : 2 }} />
                </button>
              </div>
            </div>
          </div>

          {/* Sticky bottom */}
          <div className="fixed bottom-0 left-[260px] right-0 px-8 py-4 flex items-center justify-between z-40" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {selectedFolders.length === 0 ? 'Select at least one folder to search' : `Ready to search ${selectedFolders.length} folder${selectedFolders.length > 1 ? 's' : ''}`}
            </span>
            <button
              className="px-8 py-3 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: 'var(--accent-primary)' }}
              onClick={startSearch}
            >
              Start Search →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Progress & Results */}
      {step === 3 && (
        <div>
          {searching && (
            <div className="flex flex-col items-center py-12">
              {/* Circular progress */}
              <div className="relative w-32 h-32 mb-6">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="var(--bg-secondary)" strokeWidth="6" />
                  <circle
                    cx="50" cy="50" r="45" fill="none"
                    stroke="var(--accent-primary)" strokeWidth="6"
                    strokeDasharray={`${searchProgress * 2.83} 283`}
                    strokeLinecap="round"
                    className="transition-all duration-200"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{Math.round(searchProgress)}%</span>
                </div>
              </div>

              <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                {searchStats.total > 0 ? `Scanning ${searchStats.processed} of ${searchStats.total} photos...` : 'Discovering files...'}
              </h2>
              <div className="text-xs mb-1 truncate" style={{ color: 'var(--text-muted)', maxWidth: 400 }}>{searchStats.currentFile}</div>
              <div className="flex gap-6 text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                {searchStats.total > 0 && (
                  <span>Est. remaining: {Math.max(0, Math.ceil((searchStats.total - searchStats.processed) * 0.3))}s</span>
                )}
                <span>{searchStats.matches} matches found</span>
              </div>


              <div className="flex gap-3 mb-8">
                <button
                  className="px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--error)' }}
                  onClick={() => { cancelRef.current = true; }}
                >
                  <X size={14} /> Cancel
                </button>
              </div>

              {/* Folder progress */}
              <div className="w-full max-w-2xl rounded-lg overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                {fileSystem.folders.filter(f => selectedFolders.includes(f.id)).map(folder => {
                  return (
                    <div
                      key={folder.id}
                      className="flex items-center gap-4 px-4 py-3"
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <FolderOpen size={16} style={{ color: 'var(--text-muted)' }} />
                      <div className="flex-1">
                        <div className="text-xs mb-1 truncate" style={{ color: 'var(--text-secondary)', maxWidth: 200 }}>{folder.path}</div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                          <div className="h-full rounded-full progress-bar" style={{ width: `${searchProgress}%`, background: searchProgress >= 100 ? 'var(--success)' : 'var(--accent-primary)' }} />
                        </div>
                      </div>
                      <span className="text-xs w-20 text-right" style={{ color: searchProgress >= 100 ? 'var(--success)' : 'var(--text-muted)' }}>
                        {searchProgress >= 100 ? '✓ Done' : 'Scanning...'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Live preview */}
              {results.length > 0 && (
              <div className="w-full max-w-2xl mt-6">
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Matches found so far: <span style={{ color: 'var(--accent-primary)' }}>{results.length}</span>
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {results.slice(-10).map(r => (
                    <div key={r.id} className="flex-shrink-0 relative rounded-lg overflow-hidden" style={{ width: 80, height: 60 }}>
                      <img src={r.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <span className="absolute top-1 right-1 text-[9px] px-1 rounded font-bold" style={{ background: r.confidence >= 90 ? 'var(--success)' : r.confidence >= 75 ? 'var(--warning)' : '#f97316', color: 'white' }}>
                        {r.confidence}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              )}
            </div>
          )}

          {loading && !searching && <SkeletonGrid count={12} columns={4} />}

          {searchComplete && !loading && (
            <>
              {/* Confetti */}
              {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div
                      key={i}
                      className="confetti-dot"
                      style={{
                        left: `${Math.random() * 100}%`,
                        background: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'][i % 6],
                        animationDelay: `${Math.random() * 1}s`,
                        animationDuration: `${2 + Math.random() * 2}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Success banner */}
              <div className="flex items-center gap-3 px-6 py-4 rounded-xl mb-6" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />
                <div>
                  <span className="font-semibold" style={{ color: 'var(--success)' }}>Search Complete! </span>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Found {results.length} photos across {folders.length} folders in 4 minutes 23 seconds</span>
                </div>
              </div>

              {results.length === 0 ? (
                <NoSearchResults onNewSearch={() => { setStep(1); setUploadedImage(null); }} />
              ) : (
                <>
                  {/* Controls */}
                  <div className="flex items-center gap-4 mb-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                        {faceThumbnail && <img src={faceThumbnail} alt="target" className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Results for: Unknown Person</span>
                        <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>{filteredResults.length} photos found</span>
                      </div>
                    </div>
                    <div className="flex-1" />
                    <select
                      className="text-xs px-3 py-1.5 rounded-md"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                      value={folderFilter}
                      onChange={e => setFolderFilter(e.target.value)}
                    >
                      <option value="all">All Folders</option>
                      {folders.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select
                      className="text-xs px-3 py-1.5 rounded-md"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value)}
                    >
                      <option value="confidence">Best Match</option>
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                    </select>
                    <select
                      className="text-xs px-3 py-1.5 rounded-md"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                      value={confFilter}
                      onChange={e => setConfFilter(Number(e.target.value))}
                    >
                      <option value={0}>All Confidence</option>
                      <option value={90}>90%+</option>
                      <option value={80}>80%+</option>
                      <option value={70}>70%+</option>
                    </select>
                  </div>

                  {/* Selection bar */}
                  <div className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <button className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }} onClick={selectAll}>Select All {results.length}</button>
                    <button className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }} onClick={deselectAll}>Deselect All</button>
                    <button className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }} onClick={selectAbove90}>Select Above 90%</button>
                    <div className="flex-1" />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{selectedCount} of {results.length} selected</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>~{Math.round(selectedCount * 4.2)} MB</span>
                    <button
                      className="text-xs px-4 py-1.5 rounded-md font-semibold text-white"
                      style={{ background: 'var(--accent-primary)' }}
                      onClick={() => addToast('info', 'Export', 'Navigate to Export Center to download selected photos')}
                    >
                      <Download size={12} className="inline mr-1" /> Export Selected
                    </button>
                  </div>

                  {/* Results grouped by folder */}
                  {folders.filter(f => folderFilter === 'all' || f === folderFilter).map(folder => {
                    const folderResults = paginatedResults.filter(r => r.folder === folder);
                    if (folderResults.length === 0) return null;
                    return (
                      <div key={folder} className="mb-6">
                        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                          <FolderOpen size={14} style={{ color: 'var(--accent-primary)' }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{folder}</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({filteredResults.filter(r => r.folder === folder).length} results)</span>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          {folderResults.map(r => (
                            <div
                              key={r.id}
                              className="relative rounded-xl overflow-hidden group cursor-pointer card-hover"
                              style={{
                                background: 'var(--bg-card)',
                                border: r.selected ? '2px solid var(--accent-primary)' : '2px solid var(--border)',
                                boxShadow: r.selected ? '0 0 12px rgba(99,102,241,0.3)' : 'none',
                              }}
                              onClick={() => { setPreviewResult(r); setPreviewIndex(filteredResults.findIndex(fr => fr.id === r.id)); }}
                            >
                              <div className="relative aspect-[3/2]">
                                <img src={r.thumbnail} alt={r.filename} className="w-full h-full object-cover" loading="lazy" />
                                {/* Confidence badge */}
                                <span
                                  className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded font-bold"
                                  style={{
                                    background: r.confidence >= 90 ? 'var(--success)' : r.confidence >= 75 ? 'var(--warning)' : '#f97316',
                                    color: 'white'
                                  }}
                                >
                                  {r.confidence}%
                                </span>
                                {/* Checkbox */}
                                <div
                                  className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${r.selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                  style={{
                                    borderColor: r.selected ? 'var(--accent-primary)' : 'white',
                                    background: r.selected ? 'var(--accent-primary)' : 'rgba(0,0,0,0.3)',
                                  }}
                                  onClick={(e) => { e.stopPropagation(); toggleResultSelect(r.id); }}
                                >
                                  {r.selected && <Check size={12} color="white" />}
                                </div>
                                {/* Hover actions */}
                                <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    className="p-1.5 rounded-md"
                                    style={{ background: 'rgba(0,0,0,0.6)' }}
                                    onClick={(e) => { e.stopPropagation(); setPreviewResult(r); }}
                                  >
                                    <Eye size={12} color="white" />
                                  </button>
                                  <button className="p-1.5 rounded-md" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
                                    <Ban size={12} color="white" />
                                  </button>
                                </div>
                                {/* Face box overlay */}
                                <div
                                  className="absolute border-2 rounded-sm opacity-60"
                                  style={{
                                    left: `${(r.faceBox.x / 300) * 100}%`,
                                    top: `${(r.faceBox.y / 200) * 100}%`,
                                    width: `${(r.faceBox.w / 300) * 100}%`,
                                    height: `${(r.faceBox.h / 200) * 100}%`,
                                    borderColor: r.confidence >= 90 ? 'var(--success)' : 'var(--warning)',
                                  }}
                                />
                              </div>
                              <div className="px-3 py-2">
                                <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{r.filename}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Load More */}
                  {hasMore && (
                    <div className="flex justify-center mt-6">
                      <button
                        className="px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
                        style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                      >
                        <ChevronDown size={16} />
                        Load More ({filteredResults.length - paginatedResults.length} remaining)
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.9)' }} onClick={() => setPreviewResult(null)}>
          <div className="modal-enter flex rounded-2xl overflow-hidden max-w-5xl w-full mx-4" style={{ background: 'var(--bg-card)', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            {/* Image area */}
            <div className="flex-1 relative flex items-center justify-center bg-black">
              <button
                className="absolute left-4 z-10 p-2 rounded-full transition-all"
                style={{ background: 'rgba(255,255,255,0.1)' }}
                onClick={(e) => { e.stopPropagation(); navigatePreview('prev'); }}
              >
                <ChevronLeft size={20} color="white" />
              </button>
              
              <img src={previewResult.thumbnail} alt="" className="max-w-full max-h-[80vh] object-contain" />
              
              {/* Face box */}
              <div
                className="absolute border-2 rounded-sm"
                style={{
                  left: `calc(50% - 150px + ${(previewResult.faceBox.x / 300) * 300}px)`,
                  top: `calc(50% - 100px + ${(previewResult.faceBox.y / 200) * 200}px)`,
                  width: previewResult.faceBox.w,
                  height: previewResult.faceBox.h,
                  borderColor: 'var(--accent-primary)',
                }}
              />

              <button
                className="absolute right-4 z-10 p-2 rounded-full transition-all"
                style={{ background: 'rgba(255,255,255,0.1)' }}
                onClick={(e) => { e.stopPropagation(); navigatePreview('next'); }}
              >
                <ChevronRight size={20} color="white" />
              </button>

              {/* Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>
                {previewIndex + 1} of {filteredResults.length}
              </div>
            </div>

            {/* Info panel */}
            <div className="w-80 flex flex-col" style={{ borderLeft: '1px solid var(--border)' }}>
              <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{previewResult.filename}</span>
                <button onClick={() => setPreviewResult(null)}>
                  <X size={18} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>

              <div className="p-4 flex-1 overflow-y-auto">
                {/* Confidence */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Match Confidence</span>
                    <span className="text-lg font-bold" style={{ color: previewResult.confidence >= 90 ? 'var(--success)' : 'var(--warning)' }}>
                      {previewResult.confidence}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="h-full rounded-full" style={{ width: `${previewResult.confidence}%`, background: previewResult.confidence >= 90 ? 'var(--success)' : 'var(--warning)' }} />
                  </div>
                </div>

                {/* Path */}
                <div className="mb-4">
                  <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Location</div>
                  <div className="text-xs p-2 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>{previewResult.folder}</div>
                </div>

                {/* EXIF */}
                <ExifViewer data={{
                  camera: previewResult.camera,
                  iso: previewResult.iso,
                  shutter: previewResult.shutter,
                  aperture: previewResult.aperture,
                  date: previewResult.date,
                  dimensions: previewResult.dimensions,
                  size: previewResult.size,
                }} />
              </div>

              {/* Actions */}
              <div className="p-4 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex gap-2">
                  <button
                    className="flex-1 py-2 rounded-lg text-xs font-semibold text-white"
                    style={{ background: 'var(--success)' }}
                    onClick={() => { addToast('success', 'Confirmed', 'Match confirmed'); setPreviewResult(null); }}
                  >
                    Confirm Match ✓
                  </button>
                  <button
                    className="flex-1 py-2 rounded-lg text-xs font-semibold text-white"
                    style={{ background: 'var(--error)' }}
                    onClick={() => { 
                      setResults(prev => prev.filter(r => r.id !== previewResult.id));
                      addToast('info', 'Excluded', 'Photo excluded from results'); 
                      navigatePreview('next');
                    }}
                  >
                    Not This Person ✗
                  </button>
                </div>
                <button
                  className="w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2"
                  style={{ 
                    background: previewResult.selected ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    color: previewResult.selected ? 'white' : 'var(--text-secondary)',
                  }}
                  onClick={() => toggleResultSelect(previewResult.id)}
                >
                  {previewResult.selected ? <Check size={14} /> : null}
                  {previewResult.selected ? 'Selected for Export' : 'Select for Export'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
