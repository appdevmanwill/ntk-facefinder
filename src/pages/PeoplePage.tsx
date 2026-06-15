import { useState, useCallback, useEffect } from 'react';
import {
  Users, Search, Eye, Check, Pencil, FolderOpen, Download, X, CheckCircle2, GripVertical
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useUndo } from '@/hooks/useUndo';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { SkeletonGrid, SkeletonPerson } from '@/components/Skeletons';
import { NoPeople, NoSearchResults } from '@/components/EmptyState';
import ExifViewer from '@/components/ExifViewer';
import { getFaceDescriptors } from '@/hooks/useIndexedDB';
import { clusterFaces } from '@/utils/clustering';

type Tab = 'results' | 'people';

export interface Person {
  id: string;
  name: string;
  avatar: string;
  photoCount: number;
}

export interface SearchResult {
  id: string;
  faceId: string;
  photoUrl: string;
  photoId: string;
  confidence: number;
  folder: string;
  verified: boolean;
  ignored: boolean;
}

export default function PeoplePage() {
  const [tab, setTab] = useState<Tab>('results');
  const [people, setPeople] = useState<Person[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filterPerson, setFilterPerson] = useState<string | null>(null);
  const [sortPeople, setSortPeople] = useState('photos');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewResult, setPreviewResult] = useState<SearchResult | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [folderFilter, setFolderFilter] = useState('all');
  const [confFilter, setConfFilter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [draggedPerson, setDraggedPerson] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const { addToast } = useToast();
  const { pushAction } = useUndo();

  useEffect(() => {
    async function loadClusters() {
      try {
        const descriptors = await getFaceDescriptors();
        if (descriptors.length > 0) {
          const faceItems = descriptors.map(d => ({
            id: d.id,
            descriptor: new Float32Array(d.descriptor),
            photoId: d.filePath
          }));
          const clusters = clusterFaces(faceItems);
            const mappedPeople = clusters.map((c, i) => ({
              id: c.id,
              name: `Person ${i + 1}`,
              avatar: '', // Clear avatar out to avoid fake unsplash link
              photoCount: c.faces.length
            }));
          setPeople(mappedPeople);
        }
      } catch (err) {
        console.error('Failed to load clusters', err);
      }
    }
    loadClusters();
  }, []);

  const toggleSelect = (id: string) => {
    const result = results.find(r => r.id === id);
    const wasSelected = result?.selected;
    setResults(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
    pushAction({
      description: wasSelected ? 'Deselected photo' : 'Selected photo',
      undo: () => setResults(prev => prev.map(r => r.id === id ? { ...r, selected: wasSelected || false } : r)),
      redo: () => setResults(prev => prev.map(r => r.id === id ? { ...r, selected: !wasSelected } : r)),
    });
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSelectAll: () => setResults(prev => prev.map(r => ({ ...r, selected: true }))),
    onDeselectAll: () => setResults(prev => prev.map(r => ({ ...r, selected: false }))),
    onEscape: () => { setPreviewResult(null); setShowManageModal(false); },
  }, tab === 'results');

  const selectedCount = results.filter(r => r.selected).length;
  const filteredResults = results
    .filter(r => folderFilter === 'all' || r.folder === folderFilter)
    .filter(r => r.confidence >= confFilter)
    .sort((a, b) => b.confidence - a.confidence);
  const folders = [...new Set(results.map(r => r.folder))];

  const sortedPeople = [...people]
    .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortPeople === 'photos') return b.photoCount - a.photoCount;
      return a.name.localeCompare(b.name);
    });

  const startEdit = (person: DemoPerson) => {
    setEditingId(person.id);
    setEditName(person.name);
  };

  const saveEdit = () => {
    if (editingId) {
      const oldPerson = people.find(p => p.id === editingId);
      const oldName = oldPerson?.name || '';
      setPeople(prev => prev.map(p => p.id === editingId ? { ...p, name: editName } : p));
      setEditingId(null);
      addToast('success', 'Name Updated', `Renamed to ${editName}`);
      pushAction({
        description: `Renamed "${oldName}" to "${editName}"`,
        undo: () => setPeople(prev => prev.map(p => p.id === editingId ? { ...p, name: oldName } : p)),
        redo: () => setPeople(prev => prev.map(p => p.id === editingId ? { ...p, name: editName } : p)),
      });
    }
  };

  // Drag and drop for merging
  const handleDragStart = (personId: string) => {
    setDraggedPerson(personId);
  };

  const handleDragOver = (e: React.DragEvent, personId: string) => {
    e.preventDefault();
    if (personId !== draggedPerson) {
      setDropTarget(personId);
    }
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (targetId: string) => {
    if (draggedPerson && draggedPerson !== targetId) {
      const draggedP = people.find(p => p.id === draggedPerson);
      const targetP = people.find(p => p.id === targetId);
      
      if (draggedP && targetP) {
        const mergedPerson: DemoPerson = {
          ...targetP,
          photoCount: targetP.photoCount + draggedP.photoCount,
        };
        
        const oldPeople = [...people];
        setPeople(prev => prev
          .filter(p => p.id !== draggedPerson)
          .map(p => p.id === targetId ? mergedPerson : p)
        );
        
        addToast('success', 'People Merged', `Merged "${draggedP.name}" into "${targetP.name}"`);
        
        pushAction({
          description: `Merged "${draggedP.name}" into "${targetP.name}"`,
          undo: () => setPeople(oldPeople),
          redo: () => setPeople(prev => prev
            .filter(p => p.id !== draggedPerson)
            .map(p => p.id === targetId ? mergedPerson : p)
          ),
        });
      }
    }
    setDraggedPerson(null);
    setDropTarget(null);
  };

  return (
    <div className="page-enter">
      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6">
        {[
          { key: 'results' as Tab, label: 'Search Results' },
          { key: 'people' as Tab, label: 'All People' },
        ].map(t => (
          <button
            key={t.key}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.key ? 'var(--accent-primary)' : 'var(--bg-card)',
              color: tab === t.key ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${tab === t.key ? 'var(--accent-primary)' : 'var(--border)'}`,
            }}
            onClick={() => { setTab(t.key); setFilterPerson(null); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search Results Tab */}
      {tab === 'results' && (
        <>
          {results.length === 0 ? (
            <NoSearchResults onNewSearch={() => {}} />
          ) : (
            <>
              <div className="flex items-center gap-3 px-6 py-4 rounded-xl mb-6" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {filterPerson ? `Showing photos of ${filterPerson}` : `${results.length} photos found across ${folders.length} folders`}
                </span>
                {filterPerson && (
                  <button className="text-xs underline ml-2" style={{ color: 'var(--accent-primary)' }} onClick={() => setFilterPerson(null)}>Show all</button>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
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
                  value={confFilter}
                  onChange={e => setConfFilter(Number(e.target.value))}
                >
                  <option value={0}>All Confidence</option>
                  <option value={90}>90%+</option>
                  <option value={80}>80%+</option>
                  <option value={70}>70%+</option>
                </select>
                <div className="flex-1" />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{selectedCount} of {results.length} selected</span>
                <button
                  className="text-xs px-4 py-1.5 rounded-md font-semibold text-white"
                  style={{ background: 'var(--accent-primary)' }}
                  onClick={() => addToast('info', 'Export', 'Navigate to Export Center')}
                >
                  <Download size={12} className="inline mr-1" /> Export Selected
                </button>
              </div>

              {loading ? (
                <SkeletonGrid count={12} columns={4} />
              ) : (
                /* Results grid */
                folders.filter(f => folderFilter === 'all' || f === folderFilter).map(folder => {
                  const folderResults = filteredResults.filter(r => r.folder === folder);
                  if (folderResults.length === 0) return null;
                  return (
                    <div key={folder} className="mb-6">
                      <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                        <FolderOpen size={14} style={{ color: 'var(--accent-primary)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{folder}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({folderResults.length})</span>
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
                            onClick={() => setPreviewResult(r)}
                          >
                            <div className="relative aspect-[3/2]">
                              <img src={r.thumbnail} alt={r.filename} className="w-full h-full object-cover" loading="lazy" />
                              <span
                                className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded font-bold"
                                style={{
                                  background: r.confidence >= 90 ? 'var(--success)' : r.confidence >= 75 ? 'var(--warning)' : '#f97316',
                                  color: 'white'
                                }}
                              >
                                {r.confidence}%
                              </span>
                              <div
                                className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${r.selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                style={{
                                  borderColor: r.selected ? 'var(--accent-primary)' : 'white',
                                  background: r.selected ? 'var(--accent-primary)' : 'rgba(0,0,0,0.3)',
                                }}
                                onClick={(e) => { e.stopPropagation(); toggleSelect(r.id); }}
                              >
                                {r.selected && <Check size={12} color="white" />}
                              </div>
                              <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1.5 rounded-md" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={(e) => { e.stopPropagation(); setPreviewResult(r); }}>
                                  <Eye size={12} color="white" />
                                </button>
                              </div>
                              <div
                                className="absolute border-2 rounded-sm opacity-50"
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
                })
              )}
            </>
          )}
        </>
      )}

      {/* All People Tab */}
      {tab === 'people' && (
        <>
          {people.length === 0 ? (
            <NoPeople />
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>All Identified People</h2>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{people.length} people found</span>
                </div>
                <div className="flex gap-3">
                  <button
                    className="px-3 py-1.5 rounded-lg text-xs"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                    onClick={() => setShowManageModal(true)}
                  >
                    Manage
                  </button>
                  <button
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: 'var(--accent-primary)' }}
                  >
                    Start New Search
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    className="w-full pl-9 pr-4 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    placeholder="Search people..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  className="text-xs px-3 py-2 rounded-lg"
                  style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  value={sortPeople}
                  onChange={e => setSortPeople(e.target.value)}
                >
                  <option value="photos">Most Photos</option>
                  <option value="name">Name A-Z</option>
                </select>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {sortedPeople.map(person => (
                  <div
                    key={person.id}
                    className="p-5 rounded-xl text-center group card-hover"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden" style={{ border: '3px solid var(--border)' }}>
                      <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    {editingId === person.id ? (
                      <div className="flex items-center gap-1 justify-center mb-1">
                        <input
                          className="px-2 py-1 rounded text-sm text-center w-24"
                          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--accent-primary)' }}
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveEdit()}
                          autoFocus
                        />
                        <button onClick={saveEdit}><Check size={14} style={{ color: 'var(--success)' }} /></button>
                        <button onClick={() => setEditingId(null)}><X size={14} style={{ color: 'var(--error)' }} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{person.name}</span>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => startEdit(person)}
                        >
                          <Pencil size={12} style={{ color: 'var(--text-muted)' }} />
                        </button>
                      </div>
                    )}
                    <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Appears in {person.photoCount} photos</div>
                    <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>3 folders</div>
                    <button
                      className="text-xs px-4 py-1.5 rounded-lg font-medium opacity-0 group-hover:opacity-100 transition-all"
                      style={{ background: 'var(--accent-primary)', color: 'white' }}
                      onClick={() => { setTab('results'); setFilterPerson(person.name); }}
                    >
                      View All Photos
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Preview Modal */}
      {previewResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setPreviewResult(null)}>
          <div className="modal-enter flex rounded-2xl overflow-hidden max-w-4xl w-full mx-4" style={{ background: 'var(--bg-card)', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex-1 relative">
              <img src={previewResult.thumbnail.replace('/300/200', '/600/400')} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="w-72 p-5 flex flex-col gap-4" style={{ borderLeft: '1px solid var(--border)' }}>
              <button className="self-end" onClick={() => setPreviewResult(null)}><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{previewResult.filename}</div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: previewResult.confidence >= 90 ? 'var(--success)' : 'var(--warning)' }}>{previewResult.confidence}%</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="h-full rounded-full" style={{ width: `${previewResult.confidence}%`, background: previewResult.confidence >= 90 ? 'var(--success)' : 'var(--warning)' }} />
                </div>
              </div>

              <ExifViewer data={{
                camera: previewResult.camera,
                iso: previewResult.iso,
                shutter: previewResult.shutter,
                aperture: previewResult.aperture,
                date: previewResult.date,
                dimensions: previewResult.dimensions,
                size: previewResult.size,
              }} />

              <div className="flex gap-2 mt-auto">
                <button className="flex-1 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: 'var(--success)' }} onClick={() => { setPreviewResult(null); addToast('success', 'Confirmed', 'Match confirmed'); }}>Confirm ✓</button>
                <button className="flex-1 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: 'var(--error)' }} onClick={() => { setPreviewResult(null); addToast('info', 'Excluded', 'Photo excluded from results'); }}>Not Match ✗</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Modal with Drag & Drop */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowManageModal(false)}>
          <div className="modal-enter p-6 rounded-2xl w-full max-w-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Manage People</h3>
              <button onClick={() => setShowManageModal(false)}><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              <GripVertical size={14} className="inline mr-1" />
              Drag people onto each other to merge them into one person
            </p>
            <div className="grid grid-cols-4 gap-3">
              {people.map(p => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => handleDragStart(p.id)}
                  onDragOver={(e) => handleDragOver(e, p.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop(p.id)}
                  onDragEnd={() => { setDraggedPerson(null); setDropTarget(null); }}
                  className={`p-3 rounded-lg text-center cursor-grab active:cursor-grabbing card-hover transition-all ${draggedPerson === p.id ? 'opacity-50' : ''}`}
                  style={{ 
                    background: dropTarget === p.id ? 'var(--accent-primary)' : 'var(--bg-secondary)', 
                    border: `2px solid ${dropTarget === p.id ? 'var(--accent-primary)' : 'var(--border)'}`,
                    transform: dropTarget === p.id ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  <div className="w-12 h-12 rounded-full mx-auto mb-2 overflow-hidden">
                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" draggable={false} />
                  </div>
                  <div className="text-xs font-medium truncate" style={{ color: dropTarget === p.id ? 'white' : 'var(--text-primary)' }}>{p.name}</div>
                  <div className="text-[10px]" style={{ color: dropTarget === p.id ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{p.photoCount} photos</div>
                </div>
              ))}
            </div>
            <button
              className="w-full mt-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'var(--accent-primary)' }}
              onClick={() => { setShowManageModal(false); addToast('success', 'Saved', 'People management updated'); }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
