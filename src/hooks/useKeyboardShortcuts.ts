import { useEffect, useCallback } from 'react';

interface ShortcutHandlers {
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onDelete?: () => void;
  onEscape?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSearch?: () => void;
  onToggleSelect?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled: boolean = true) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    // Ignore if user is typing in an input
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Only allow Escape in inputs
      if (e.key === 'Escape' && handlers.onEscape) {
        handlers.onEscape();
      }
      return;
    }

    // Cmd/Ctrl + A: Select All
    if ((e.metaKey || e.ctrlKey) && e.key === 'a' && handlers.onSelectAll) {
      e.preventDefault();
      handlers.onSelectAll();
      return;
    }

    // Cmd/Ctrl + Shift + A: Deselect All
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A' && handlers.onDeselectAll) {
      e.preventDefault();
      handlers.onDeselectAll();
      return;
    }

    // Cmd/Ctrl + Z: Undo
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey && handlers.onUndo) {
      e.preventDefault();
      handlers.onUndo();
      return;
    }

    // Cmd/Ctrl + Shift + Z: Redo
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z' && handlers.onRedo) {
      e.preventDefault();
      handlers.onRedo();
      return;
    }

    // Cmd/Ctrl + Y: Redo (Windows style)
    if ((e.metaKey || e.ctrlKey) && e.key === 'y' && handlers.onRedo) {
      e.preventDefault();
      handlers.onRedo();
      return;
    }

    // Delete / Backspace
    if ((e.key === 'Delete' || e.key === 'Backspace') && handlers.onDelete) {
      e.preventDefault();
      handlers.onDelete();
      return;
    }

    // Escape
    if (e.key === 'Escape' && handlers.onEscape) {
      handlers.onEscape();
      return;
    }

    // Space: Toggle select
    if (e.key === ' ' && handlers.onToggleSelect) {
      e.preventDefault();
      handlers.onToggleSelect();
      return;
    }

    // /: Focus search (common in many apps)
    if (e.key === '/' && handlers.onSearch) {
      e.preventDefault();
      handlers.onSearch();
      return;
    }
  }, [enabled, handlers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Hook for range selection with Shift+Click
export function useRangeSelection<T extends { id: string }>(
  items: T[],
  selectedIds: Set<string>,
  setSelectedIds: (ids: Set<string>) => void
) {
  const lastSelectedId = { current: null as string | null };

  const handleSelect = useCallback((id: string, shiftKey: boolean) => {
    const newSelected = new Set(selectedIds);

    if (shiftKey && lastSelectedId.current) {
      // Range selection
      const lastIdx = items.findIndex(item => item.id === lastSelectedId.current);
      const currentIdx = items.findIndex(item => item.id === id);
      
      if (lastIdx !== -1 && currentIdx !== -1) {
        const start = Math.min(lastIdx, currentIdx);
        const end = Math.max(lastIdx, currentIdx);
        
        for (let i = start; i <= end; i++) {
          newSelected.add(items[i].id);
        }
      }
    } else {
      // Toggle single selection
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
    }

    lastSelectedId.current = id;
    setSelectedIds(newSelected);
  }, [items, selectedIds, setSelectedIds]);

  return handleSelect;
}
