import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import * as api from '../api/admin.mock';
import { useToast } from '@/hooks/useToast';
import type { AdminUser } from '@/types/domain';

export function useResolveDispute() {
  const qc = useQueryClient();
  const { push } = useToast();
  return useMutation({
    mutationFn: ({
      id,
      kind,
      notes,
      actorId,
    }: {
      id: string;
      kind: 'release' | 'revision' | 'refund';
      notes: string;
      actorId: string;
    }) => api.resolveDispute(id, kind, notes, actorId),
    onSuccess: () => {
      push({ intent: 'success', message: 'Dispute resolved' });
      qc.invalidateQueries({ queryKey: queryKeys.disputes.list() });
      qc.invalidateQueries({ queryKey: queryKeys.invoices.list() });
      qc.invalidateQueries({ queryKey: queryKeys.auditLogs.list() });
    },
    onError: () => push({ intent: 'error', message: 'Failed to resolve' }),
  });
}

export function useSetUserStatus() {
  const qc = useQueryClient();
  const { push } = useToast();
  return useMutation({
    mutationFn: ({
      id,
      status,
      actorId,
    }: {
      id: string;
      status: AdminUser['status'];
      actorId: string;
    }) => api.setUserStatus(id, status, actorId),
    onSuccess: () => {
      push({ intent: 'success', message: 'User status updated' });
      qc.invalidateQueries({ queryKey: queryKeys.adminUsers.list() });
    },
    onError: () => push({ intent: 'error', message: 'Update failed' }),
  });
}
