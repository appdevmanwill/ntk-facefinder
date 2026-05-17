import { useState, useEffect, useCallback } from 'react';
import {
  Image, Grid3X3, LayoutGrid, Check, ChevronLeft, ChevronRight, X, ScanFace, Download, Plus, Info
} from 'lucide-react';
import { GALLERY_PHOTOS } from '@/data/mockData';
import { useToast } from '@/hooks/useToast';
import { useUndo } from '@/hooks/useUndo';
import { useKeyboardShortcuts, useRangeSelection } from '@/hooks/useKeyboardShortcuts';
import { SkeletonGrid } from '@/components/Skeletons';
import { EmptyGallery } from '@/components/EmptyState';
import { ExifPanel } from '@/components/ExifViewer';

type AlbumFilter = 'all' | 'Family' | 'Vacations' | 'Work Events' | 'Unorganized';

export default function GalleryPage() {
  const [album, setAlbum] = useState<AlbumFilter>('all');
  const [gridSize, setGridSize] = useState<'small' | 'large'>('small');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [showFaceOverlay, setShowFaceOverlay] = useState(false);
  const [showExifPanel, setShowExifPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { pushAction } = useUndo();

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const filtered = GALLERY_PHOTOS.filter(p => album === 'all' || p.album === album);

  const toggleSelect = useCallback((id: string, shiftKey: boolean = false) => {
    const wasSelected = selectedIds.has(id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    
    pushAction({
      description: wasSelected ? 'Deselected photo' : 'Selected photo',
      undo: () => setSelectedIds(prev => {
        const next = new Set(prev);
        if (wasSelected) next.add(id);
        else next.delete(id);
        return next;
      }),
      redo: () => setSelectedIds(prev => {
        const next = new Set(prev);
        if (wasSelected) next.delete(id);
        else next.add(id);
        return next;
      }),
    });
  }, [selectedIds, pushAction]);

  const selectAll = () => {
    const prevSelected = new Set(selectedIds);
    setSelectedIds(new Set(filtered.map(p => p.id)));
    pushAction({
      description: `Selected all ${filtered.length} photos`,
      undo: () => setSelectedIds(prevSelected),
      redo: () => setSelectedIds(new Set(filtered.map(p => p.id))),
    });
  };

  const clearSelection = () => {
    const prevSelected = new Set(selectedIds);
    setSelectedIds(new Set());
    pushAction({
      description: 'Cleared selection',
      undo: () => setSelectedIds(prevSelected),
      redo: () => setSelectedIds(new Set()),
    });
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSelectAll: selectAll,
    onDeselectAll: clearSelection,
    onEscape: () => { 
      if (lightboxIdx !== null) setLightboxIdx(null);
      else clearSelection();
    },
  }, lightboxIdx === null);

  const openLightbox = (idx: number) => setLightboxIdx(idx);
  const closeLightbox = () => setLightboxIdx(null);
  const nextPhoto = useCallback(() => {
    setLightboxIdx(prev => prev !== null ? (prev + 1) % filtered.length : null);
  }, [filtered.length]);
  const prevPhoto = useCallback(() => {
    setLightboxIdx(prev => prev !== null ? (prev - 1 + filtered.length) % filtered.length : null);
  }, [filtered.length]);

  // Lightbox keyboard navigation
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'Escape') closeLightbox();
      if (e.key === ' ') {
        e.preventDefault();
        toggleSelect(filtered[lightboxIdx].id);
      }
      if (e.key === 'i') setShowExifPanel(prev => !prev);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIdx, nextPhoto, prevPhoto, filtered, toggleSelect]);

  const currentPhoto = lightboxIdx !== null ? filtered[lightboxIdx] : null;

  if (loading) {
    return (
      <div className="page-enter">
        <div className="flex items-center justify-between mb-6">
          <div className="skeleton h-8 w-32 rounded" />
          <div className="skeleton h-8 w-20 rounded" />
        </div>
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton h-8 w-24 rounded-full" />
          ))}
        </div>
        <SkeletonGrid count={12} columns={6} />
      </div>
    );
  }

  if (GALLERY_PHOTOS.length === 0) {
    return (
      <div className="page-enter">
        <EmptyGallery onImport={() => addToast('info', 'Import', 'Opening import dialog...')} />
      </div>
    );
  }

  return (
    <div className="page-enter">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Gallery</h1>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{GALLERY_PHOTOS.length} photos</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`p-2 rounded-lg transition-all`}
            style={{ background: gridSize === 'small' ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: gridSize === 'small' ? 'white' : 'var(--text-muted)' }}
            onClick={() => setGridSize('small')}
            title="Small grid"
          >
            <Grid3X3 size={16} />
          </button>
          <button
            className={`p-2 rounded-lg transition-all`}
            style={{ background: gridSize === 'large' ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: gridSize === 'large' ? 'white' : 'var(--text-muted)' }}
            onClick={() => setGridSize('large')}
            title="Large grid"
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* Album tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(['all', 'Family', 'Vacations', 'Work Events', 'Unorganized'] as AlbumFilter[]).map(a => (
          <button
            key={a}
            className="px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
            style={{
              background: album === a ? 'var(--accent-primary)' : 'var(--bg-card)',
              color: album === a ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${album === a ? 'var(--accent-primary)' : 'var(--border)'}`,
            }}
            onClick={() => setAlbum(a)}
          >
            {a === 'all' ? 'All Photos' : a}
            <span className="ml-1 opacity-70">
              ({a === 'all' ? GALLERY_PHOTOS.length : GALLERY_PHOTOS.filter(p => p.album === a).length})
            </span>
          </button>
        ))}
      </div>

      {/* Photo grid */}
      <div className={`grid gap-3 ${gridSize === 'small' ? 'grid-cols-6' : 'grid-cols-4'}`}>
        {filtered.map((photo, idx) => (
          <div
            key={photo.id}
            className="relative rounded-xl overflow-hidden group cursor-pointer card-hover"
            style={{
              background: 'var(--bg-card)',
              border: selectedIds.has(photo.id) ? '2px solid var(--accent-primary)' : '2px solid transparent',
              boxShadow: selectedIds.has(photo.id) ? '0 0 12px rgba(99,102,241,0.3)' : 'none',
            }}
            onClick={() => openLightbox(idx)}
          >
            <div className="aspect-[4/3] relative">
              <img src={photo.thumbnail} alt={photo.filename} className="w-full h-full object-cover" loading="lazy" />

              {/* Scanned badge */}
              {photo.scanned && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.8)' }}>
                  <Check size={10} color="white" />
                </div>
              )}

              {/* Face count badge */}
              {photo.faceCount > 0 && (
                <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5" style={{ background: 'rgba(99,102,241,0.85)', color: 'white' }}>
                  <ScanFace size={9} /> {photo.faceCount}
                </div>
              )}

              {/* Checkbox */}
              <div
                className={`absolute top-1.5 left-1.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedIds.has(photo.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                style={{
                  borderColor: selectedIds.has(photo.id) ? 'var(--accent-primary)' : 'white',
                  background: selectedIds.has(photo.id) ? 'var(--accent-primary)' : 'rgba(0,0,0,0.3)',
                }}
                onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id, e.shiftKey); }}
              >
                {selectedIds.has(photo.id) && <Check size={10} color="white" />}
              </div>

              {/* Hover filename */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-[10px] text-white truncate">{photo.filename}</div>
              </div>
            </div>

            {/* Person tags */}
            {photo.people.length > 0 && (
              <div className="px-2 py-1.5 flex gap-1 flex-wrap">
                {photo.people.map(p => (
                  <span key={p} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--accent-primary)' }}>
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Multi-select floating bar */}
      {selectedIds.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-6 py-3 rounded-2xl shadow-2xl modal-enter"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', marginLeft: 130 }}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedIds.size} photos selected</span>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--accent-primary)' }} onClick={() => addToast('info', 'Scan', 'Scanning selected photos...')}>
            <ScanFace size={12} className="inline mr-1" /> Scan Selected
          </button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }} onClick={() => addToast('info', 'Album', 'Add to album...')}>
            <Plus size={12} className="inline mr-1" /> Add to Album
          </button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }} onClick={() => addToast('info', 'Export', 'Exporting...')}>
            <Download size={12} className="inline mr-1" /> Export
          </button>
          <button className="text-xs" style={{ color: 'var(--text-muted)' }} onClick={clearSelection}>Cancel</button>
        </div>
      )}

      {/* Lightbox */}
      {currentPhoto && lightboxIdx !== null && (
        <div className="fixed inset-0 z-50 flex" style={{ background: 'rgba(0,0,0,0.95)' }}>
          {/* Main area */}
          <div className="flex-1 flex flex-col">
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{currentPhoto.filename}</span>
              <div className="flex items-center gap-3">
                <button
                  className="px-3 py-1 rounded-md text-xs flex items-center gap-1"
                  style={{
                    background: showFaceOverlay ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    color: showFaceOverlay ? 'white' : 'var(--text-secondary)'
                  }}
                  onClick={() => setShowFaceOverlay(!showFaceOverlay)}
                >
                  <ScanFace size={12} /> Faces
                </button>
                <button
                  className="px-3 py-1 rounded-md text-xs flex items-center gap-1"
                  style={{
                    background: showExifPanel ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    color: showExifPanel ? 'white' : 'var(--text-secondary)'
                  }}
                  onClick={() => setShowExifPanel(!showExifPanel)}
                >
                  <Info size={12} /> Info
                </button>
                <button onClick={closeLightbox}>
                  <X size={20} style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>
            </div>

            {/* Image area */}
            <div className="flex-1 flex items-center justify-center relative">
              <button
                className="absolute left-4 z-10 p-3 rounded-full transition-all hover:bg-white/20"
                style={{ background: 'rgba(255,255,255,0.1)' }}
                onClick={prevPhoto}
              >
                <ChevronLeft size={24} color="white" />
              </button>

              <div className="relative max-w-4xl max-h-[80vh]">
                <img src={currentPhoto.thumbnail.replace('400/300', '800/600')} alt="" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
                {showFaceOverlay && currentPhoto.faceCount > 0 && (
                  <div className="absolute inset-0">
                    {currentPhoto.people.map((name, i) => (
                      <div
                        key={i}
                        className="absolute border-2 rounded-sm"
                        style={{
                          left: `${25 + i * 20}%`,
                          top: '20%',
                          width: '15%',
                          height: '25%',
                          borderColor: 'var(--accent-primary)',
                        }}
                      >
                        <span className="absolute -bottom-6 left-0 text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--accent-primary)', color: 'white' }}>
                          {name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="absolute right-4 z-10 p-3 rounded-full transition-all hover:bg-white/20"
                style={{ background: 'rgba(255,255,255,0.1)' }}
                onClick={nextPhoto}
              >
                <ChevronRight size={24} color="white" />
              </button>
            </div>

            {/* Bottom info */}
            <div className="flex items-center justify-center gap-6 px-6 py-3 text-xs" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
              <span>Date: {currentPhoto.date}</span>
              <span>Size: {currentPhoto.size}</span>
              <span>Dimensions: {currentPhoto.dimensions}</span>
              <span>{lightboxIdx + 1} of {filtered.length}</span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-secondary)' }}>←→</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-secondary)' }}>Space</kbd>
                Select
              </span>
            </div>
          </div>

          {/* EXIF Panel */}
          {showExifPanel && (
            <div className="w-72 overflow-y-auto" style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border)' }}>
              <ExifPanel 
                data={{
                  camera: 'Canon EOS R5',
                  iso: '400',
                  shutter: '1/250',
                  aperture: 'f/2.8',
                  date: currentPhoto.date,
                  dimensions: currentPhoto.dimensions,
                  size: currentPhoto.size,
                }}
                people={currentPhoto.people}
                albums={[currentPhoto.album]}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
