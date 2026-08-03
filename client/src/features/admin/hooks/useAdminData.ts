import { useQuery } from '@tanstack/react-query';
import { queryKeys, type AuditLogFilters } from '@/lib/query/keys';
import * as api from '../api/admin.mock';

export function useDisputes() {
  return useQuery({ queryKey: queryKeys.disputes.list(), queryFn: api.getDisputes, staleTime: 30_000 });
}

export function useAdminUsers() {
  return useQuery({ queryKey: queryKeys.adminUsers.list(), queryFn: api.getAdminUsers });
}

export function useAnalytics() {
  return useQuery({ queryKey: queryKeys.analytics.summary(), queryFn: api.getAnalytics, staleTime: 120_000 });
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({ queryKey: queryKeys.auditLogs.list(filters), queryFn: api.getAuditLogs });
}
