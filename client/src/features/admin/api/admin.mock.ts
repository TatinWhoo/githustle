import { fixtureStore } from '@/lib/fixtures/fixtureLoader';
import type { AdminUser } from '@/types/domain';

export async function getDisputes() {
  await Promise.resolve();
  return fixtureStore.getDisputes();
}

export async function getAdminUsers() {
  await Promise.resolve();
  return fixtureStore.getAdminUsers();
}

export async function getAuditLogs() {
  await Promise.resolve();
  return fixtureStore.getAuditLogs();
}

export async function getAnalytics() {
  await Promise.resolve();
  return fixtureStore.getAnalytics();
}

export async function resolveDispute(
  id: string,
  kind: 'release' | 'revision' | 'refund',
  notes: string,
  actorId: string,
) {
  fixtureStore.resolveDispute(id, kind, notes, actorId);
}

export async function setUserStatus(id: string, status: AdminUser['status'], actorId: string) {
  fixtureStore.setAdminUserStatus(id, status, actorId);
}
