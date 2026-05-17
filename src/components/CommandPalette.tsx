import { useState, useEffect, useCallback } from 'react';
import { Search, ScanFace, FolderOpen, Users, Image, Cloud, Download, BarChart3, Settings, X } from 'lucide-react';
import { useLocation } from 'wouter';

const commands = [
  { id: '1', label: 'Search by Face', description: 'Upload a reference photo to find matches', icon: ScanFace, path: '/' },
  { id: '2', label: 'Folder Manager', description: 'Manage and scan photo folders', icon: FolderOpen, path: '/folders' },
  { id: '3', label: 'People & Results', description: 'View identified people and search results', icon: Users, path: '/people' },
  { id: '4', label: 'Gallery', description: 'Browse all photos', icon: Image, path: '/gallery' },
  { id: '5', label: 'Cloud Storage', description: 'Connect and browse cloud storage', icon: Cloud, path: '/cloud' },
  { id: '6', label: 'Export Center', description: 'Download and export photos', icon: Download, path: '/export' },
  { id: '7', label: 'Dashboard', description: 'View stats and activity', icon: BarChart3, path: '/dashboard' },
  { id: '8', label: 'Settings', description: 'Configure face recognition and app preferences', icon: Settings, path: '/settings' },
  { id: '9', label: 'Mom', description: 'Person — 247 photos', icon: Users, path: '/people' },
  { id: '10', label: 'Dad', description: 'Person — 198 photos', icon: Users, path: '/people' },
  { id: '11', label: 'Sarah', description: 'Person — 156 photos', icon: Users, path: '/people' },
  { id: '12', label: 'C:/Photos/Family/', description: 'Folder — 2,341 images', icon: FolderOpen, path: '/folders' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [, setLocation] = useLocation();

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const handleSelect = useCallback((cmd: typeof commands[0]) => {
    setLocation(cmd.path);
    onClose();
    setQuery('');
  }, [setLocation, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(prev => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIdx]) {
        handleSelect(filtered[selectedIdx]);
      } else if (e.key === 'Escape') {
        onClose();
        setQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, selectedIdx, handleSelect, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh]" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => { onClose(); setQuery(''); }}>
      <div
        className="modal-enter w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
            placeholder="Search pages, people, folders..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>ESC</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all"
              style={{
                background: i === selectedIdx ? 'var(--bg-secondary)' : 'transparent',
              }}
              onClick={() => handleSelect(cmd)}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <cmd.icon size={16} style={{ color: 'var(--accent-primary)' }} />
              <div className="flex-1">
                <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{cmd.label}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{cmd.description}</div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No results found</div>
          )}
        </div>
      </div>
    </div>
  );
}
