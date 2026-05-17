import { useLocation, Link } from 'wouter';
import {
  ScanFace, Search, FolderOpen, Users, Image, Cloud, Download, BarChart3, Settings, Loader2, CheckCircle2, AlertCircle, HardDrive, LogOut, Menu, X
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { useEffect, useState } from 'react';

const isFileSystemSupported = () => 'showDirectoryPicker' in window;

const navItems = [
  { path: '/', label: 'Search by Face', icon: Search },
  { path: '/folders', label: 'Folder Manager', icon: FolderOpen },
  { path: '/people', label: 'People & Results', icon: Users },
  { path: '/gallery', label: 'Gallery', icon: Image },
  { path: '/cloud', label: 'Cloud Storage', icon: Cloud },
  { path: '/export', label: 'Export Center', icon: Download },
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { scanProgress, setModelsLoaded, setModelsLoading } = useAppContext();
  const { modelsLoaded, modelsLoading, modelsError, loadModels } = useFaceDetection();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sync face detection state with app context
  useEffect(() => {
    setModelsLoaded(modelsLoaded);
    setModelsLoading(modelsLoading);
  }, [modelsLoaded, modelsLoading, setModelsLoaded, setModelsLoading]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const displayName = user?.displayName || (user?.isAnonymous ? 'Guest' : 'User');
  const email = user?.email || (user?.isAnonymous ? 'Anonymous session' : '');
  const photoURL = user?.photoURL;

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-primary)' }}>
          <ScanFace size={22} color="white" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>FaceFinder</div>
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>NTK Photo Intelligence</div>
        </div>
        {/* Close button - mobile only */}
        <button
          className="sidebar-close-btn p-2 rounded-lg"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map(item => {
          const isExact = item.path === '/' ? location === '/' : location.startsWith(item.path);
          return (
            <Link key={item.path} href={item.path}>
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150"
                style={{
                  background: isExact ? 'var(--accent-primary)' : 'transparent',
                  color: isExact ? 'white' : 'var(--text-secondary)',
                }}
                onMouseEnter={e => {
                  if (!isExact) (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)';
                }}
                onMouseLeave={e => {
                  if (!isExact) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <item.icon size={18} />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom status */}
      <div className="px-4 pb-3 flex flex-col gap-2">
        {/* File System API status */}
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs" style={{ background: 'var(--bg-secondary)' }}>
          {isFileSystemSupported() ? (
            <>
              <HardDrive size={14} style={{ color: 'var(--success)' }} />
              <span style={{ color: 'var(--success)' }}>Local Files ✓</span>
            </>
          ) : (
            <>
              <AlertCircle size={14} style={{ color: 'var(--warning)' }} />
              <span style={{ color: 'var(--warning)' }}>File input mode</span>
            </>
          )}
        </div>
        
        {/* Model status */}
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs" style={{ background: 'var(--bg-secondary)' }}>
          {modelsError ? (
            <>
              <AlertCircle size={14} style={{ color: 'var(--error)' }} />
              <span style={{ color: 'var(--error)' }} className="truncate flex-1">Model Error</span>
              <button
                className="text-[10px] underline"
                style={{ color: 'var(--accent-primary)' }}
                onClick={loadModels}
              >
                Retry
              </button>
            </>
          ) : modelsLoaded ? (
            <>
              <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
              <span style={{ color: 'var(--success)' }}>AI Models ✓</span>
            </>
          ) : (
            <>
              <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Loading AI...</span>
            </>
          )}
        </div>

        {/* Scan progress */}
        {scanProgress !== null && (
          <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
            <div
              className="h-full rounded-full progress-bar"
              style={{ width: `${scanProgress}%`, background: 'var(--accent-primary)' }}
            />
          </div>
        )}

        {/* User profile & sign out */}
        <div
          className="flex items-center gap-2.5 px-2 py-2 rounded-lg mt-1"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          {photoURL ? (
            <img
              src={photoURL}
              alt=""
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                color: 'white',
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{displayName}</div>
            <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{email}</div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-md transition-all flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>

        {/* Keyboard shortcut hint — desktop only */}
        <div className="sidebar-kbd-hint flex items-center justify-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-secondary)' }}>⌘K</kbd>
          <span>Quick search</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="mobile-topbar" style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 40,
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        display: 'none', alignItems: 'center', padding: '0 16px', gap: 12,
      }}>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg"
          style={{ color: 'var(--text-primary)', background: 'var(--bg-secondary)' }}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-primary)' }}>
          <ScanFace size={16} color="white" />
        </div>
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>FaceFinder</span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="mobile-overlay"
          style={{
            position: 'fixed', inset: 0, zIndex: 49,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar + Mobile drawer */}
      <div
        className={`sidebar-container ${mobileOpen ? 'sidebar-open' : ''}`}
        style={{
          position: 'fixed', left: 0, top: 0, height: '100vh',
          width: 260, zIndex: 50,
          background: 'var(--bg-card)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {sidebarContent}
      </div>
    </>
  );
}
