import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useToast } from './useToast';
import { Undo2 } from 'lucide-react';

interface UndoAction {
  id: string;
  description: string;
  undo: () => void;
  redo: () => void;
}

interface UndoContextValue {
  pushAction: (action: Omit<UndoAction, 'id'>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const UndoContext = createContext<UndoContextValue>({
  pushAction: () => {},
  undo: () => {},
  redo: () => {},
  canUndo: false,
  canRedo: false,
});

export function useUndo() {
  return useContext(UndoContext);
}

export function UndoProvider({ children }: { children: ReactNode }) {
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);
  const [showUndoToast, setShowUndoToast] = useState<UndoAction | null>(null);

  const pushAction = useCallback((action: Omit<UndoAction, 'id'>) => {
    const fullAction = { ...action, id: Date.now().toString() };
    setUndoStack(prev => [...prev.slice(-19), fullAction]); // Keep last 20 actions
    setRedoStack([]); // Clear redo stack on new action
    setShowUndoToast(fullAction);
    setTimeout(() => setShowUndoToast(null), 5000);
  }, []);

  const undo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const action = prev[prev.length - 1];
      action.undo();
      setRedoStack(r => [...r, action]);
      setShowUndoToast(null);
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const action = prev[prev.length - 1];
      action.redo();
      setUndoStack(u => [...u, action]);
      return prev.slice(0, -1);
    });
  }, []);

  return (
    <UndoContext.Provider value={{
      pushAction,
      undo,
      redo,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
    }}>
      {children}
      
      {/* Undo Toast */}
      {showUndoToast && (
        <div 
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl toast-enter"
          style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border)',
            marginLeft: 130,
          }}
        >
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {showUndoToast.description}
          </span>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'var(--accent-primary)', color: 'white' }}
            onClick={() => { undo(); setShowUndoToast(null); }}
          >
            <Undo2 size={12} /> Undo
          </button>
          <button
            className="text-xs"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => setShowUndoToast(null)}
          >
            Dismiss
          </button>
        </div>
      )}
    </UndoContext.Provider>
  );
}
