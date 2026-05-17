import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  exiting?: boolean;
}

interface ToastContextValue {
  addToast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const borderColors: Record<ToastType, string> = {
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6'
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2" style={{ maxWidth: 380 }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={toast.exiting ? 'toast-exit' : 'toast-enter'}
            style={{
              background: 'var(--bg-card)',
              borderLeft: `4px solid ${borderColors[toast.type]}`,
              borderRadius: 8,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              minWidth: 300
            }}
          >
            <div className="flex-1">
              <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{toast.title}</div>
              {toast.message && <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{toast.message}</div>}
            </div>
            <button onClick={() => removeToast(toast.id)} className="p-0.5 hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
