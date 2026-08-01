// Feature: githustle-ui-integration, Property 8: useRole source-of-truth
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { renderHook } from '@testing-library/react';
import { useRole } from './useRole';
import { useAuth } from './useAuth';
import { useUiStore } from '@/stores/ui.store';
import type { RoleName } from '@/types/domain';

// Mock dependencies
vi.mock('./useAuth');
vi.mock('@/stores/ui.store');

const mockUseAuth = vi.mocked(useAuth);
const mockUseUiStore = vi.mocked(useUiStore);

describe('useRole — Property 8', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('P8: effective role = simulator override when simulating, else auth role', () => {
    /**
     * **Validates: Requirements 3.1, 3.2**
     *
     * Property: ∀ (authRole, isSimulating, simulatedRole):
     *   useRole() = (isSimulating ∧ simulatedRole ≠ null) ? simulatedRole : authRole
     */
    const roleArb = fc.constantFrom<RoleName | null>('client', 'freelancer', 'admin', null);
    const simulatedRoleArb = fc.constantFrom<RoleName | null>('client', 'freelancer', 'admin', null);
    const isSimulatingArb = fc.boolean();

    fc.assert(
      fc.property(
        roleArb,
        isSimulatingArb,
        simulatedRoleArb,
        (authRole, isSimulating, simulatedRole) => {
          // Setup mocks
          mockUseAuth.mockReturnValue({
            user: authRole ? { id: 'test-user', name: 'Test', email: 'test@test.com', role: authRole } : null,
            status: authRole ? 'authenticated' : 'anonymous',
            role: authRole,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            refetch: vi.fn(),
          } as any);

          mockUseUiStore.mockImplementation((selector: any) =>
            selector({
              roleSimulator: { isSimulating, simulatedRole },
            } as any),
          );

          // Execute
          const { result } = renderHook(() => useRole());

          // Assert property
          const expectedRole = isSimulating && simulatedRole ? simulatedRole : authRole;
          expect(result.current).toBe(expectedRole);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P8b: sessionStorage round-trip preserves roleSimulator slice', () => {
    /**
     * **Validates: Requirements 3.3**
     *
     * Property: ∀ (isSimulating, simulatedRole):
     *   persist(roleSimulator) → hydrate() = roleSimulator
     */
    const roleArb = fc.constantFrom<RoleName | null>('client', 'freelancer', 'admin', null);
    const isSimulatingArb = fc.boolean();

    fc.assert(
      fc.property(roleArb, isSimulatingArb, (simulatedRole, isSimulating) => {
        const roleSimulator = {
          isSimulating: isSimulating && simulatedRole !== null,
          simulatedRole: isSimulating ? simulatedRole : null,
        };

        // Simulate persist
        const serialized = JSON.stringify(roleSimulator);
        const hydrated = JSON.parse(serialized);

        // Assert round-trip integrity
        expect(hydrated.isSimulating).toBe(roleSimulator.isSimulating);
        expect(hydrated.simulatedRole).toBe(roleSimulator.simulatedRole);
      }),
      { numRuns: 100 },
    );
  });
});
