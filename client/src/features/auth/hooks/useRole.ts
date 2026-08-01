import { useAuth } from './useAuth';
import { useUiStore } from '@/stores/ui.store';
import type { RoleName } from '@/types/domain';

/**
 * Returns the effective role for the current user.
 * When role simulation is active, returns the simulated role.
 * Otherwise returns the authenticated user's role, or null if not authenticated.
 *
 * **Validates: Requirements 3.1, 3.2**
 */
export function useRole(): RoleName | null {
  const { role: authRole } = useAuth();
  const { isSimulating, simulatedRole } = useUiStore((s) => s.roleSimulator);

  if (isSimulating && simulatedRole) {
    return simulatedRole;
  }

  return authRole;
}
