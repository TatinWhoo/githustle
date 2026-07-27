import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from './ui.store';

describe('ui.store', () => {
  beforeEach(() => {
    useUiStore.setState({ sidebarCollapsed: false, mobileDrawerOpen: false, toasts: [] });
  });

  it('toggles the sidebar', () => {
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it('pushes and dismisses toasts', () => {
    const id = useUiStore.getState().pushToast('Saved');
    expect(useUiStore.getState().toasts).toHaveLength(1);
    useUiStore.getState().dismissToast(id);
    expect(useUiStore.getState().toasts).toHaveLength(0);
  });
});
