import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  variant: 'info' | 'success' | 'error';
}

interface UiState {
  sidebarCollapsed: boolean;
  mobileDrawerOpen: boolean;
  toasts: Toast[];
  toggleSidebar: () => void;
  setMobileDrawer: (open: boolean) => void;
  pushToast: (message: string, variant?: Toast['variant']) => string;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  mobileDrawerOpen: false,
  toasts: [],
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileDrawer: (open) => set({ mobileDrawerOpen: open }),
  pushToast: (message, variant = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    return id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
