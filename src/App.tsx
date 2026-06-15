import { useState, useEffect } from 'react';
import { Route, Switch } from 'wouter';
import { AnimatePresence } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import { ToastProvider } from '@/hooks/useToast';
import { UndoProvider } from '@/hooks/useUndo';
import Sidebar from '@/components/Sidebar';
import CommandPalette from '@/components/CommandPalette';
import SearchPage from '@/pages/SearchPage';
import FolderManager from '@/pages/FolderManager';
import PeoplePage from '@/pages/PeoplePage';
import GalleryPage from '@/pages/GalleryPage';
import CloudPage from '@/pages/CloudPage';
import ExportPage from '@/pages/ExportPage';
import MapPage from '@/pages/MapPage';
import SharePage from '@/pages/SharePage';
import ViewerPage from '@/pages/ViewerPage';
import MemoriesPage from '@/pages/MemoriesPage';
import DashboardPage from '@/pages/DashboardPage';
import SettingsPage from '@/pages/SettingsPage';
import LoginPage from '@/pages/LoginPage';
import { ScanFace, Loader2 } from 'lucide-react';

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
      }}>
        <ScanFace size={32} color="white" />
      </div>
      <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading FaceFinder...</span>
    </div>
  );
}

function AppContent() {
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setCmdOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar />
      <main className="app-main flex-1 overflow-y-auto relative">
        <AnimatePresence mode="wait">
          <Switch>
            <Route path="/" component={SearchPage} />
            <Route path="/folders" component={FolderManager} />
            <Route path="/people" component={PeoplePage} />
            <Route path="/gallery" component={GalleryPage} />
            <Route path="/cloud" component={CloudPage} />
            <Route path="/export" component={ExportPage} />
            <Route path="/map" component={MapPage} />
            <Route path="/share" component={SharePage} />
            <Route path="/viewer/:peerId" component={ViewerPage} />
            <Route path="/memories" component={MemoriesPage} />
            <Route path="/dashboard" component={DashboardPage} />
            <Route path="/settings" component={SettingsPage} />
          </Switch>
        </AnimatePresence>
      </main>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginPage />;

  return (
    <AppProvider>
      <ToastProvider>
        <UndoProvider>
          <AppContent />
        </UndoProvider>
      </ToastProvider>
    </AppProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </QueryClientProvider>
  );
}
