import { useState } from 'react';
import type { AdminUser } from '@/types/domain';
import { StatusPill } from '@/components/primitives/StatusPill';
import { ConfirmDestructive } from '@/components/primitives/ConfirmDestructive';
import { useSetUserStatus } from '../hooks/useAdminMutations';
import { useAuth } from '@/features/auth/hooks/useAuth';

export interface UsersTableProps {
  users: AdminUser[];
}

export function UsersTable({ users }: UsersTableProps) {
  const { user } = useAuth();
  const setStatus = useSetUserStatus();
  const [confirm, setConfirm] = useState<{ user: AdminUser; next: AdminUser['status'] } | null>(null);

  const change = (u: AdminUser, next: AdminUser['status']) => {
    if (!user) return;
    if (next === 'suspended') {
      setConfirm({ user: u, next });
      return;
    }
    setStatus.mutate({ id: u.id, status: next, actorId: user.id });
  };

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface-0 text-xs uppercase tracking-wider text-text-muted">
          <tr>
            <th className="text-left p-3">Name</th>
            <th className="text-left p-3">Email</th>
            <th className="text-left p-3">Role</th>
            <th className="text-left p-3">Status</th>
            <th />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((u) => (
            <tr key={u.id}>
              <td className="p-3">{u.name}</td>
              <td className="p-3">{u.email}</td>
              <td className="p-3 capitalize">{u.role}</td>
              <td className="p-3">
                <StatusPill status={u.status} />
              </td>
              <td className="p-3 text-right">
                <select
                  defaultValue={u.status}
                  onChange={(e) => change(u, e.target.value as AdminUser['status'])}
                  className="border border-border rounded-md px-2 py-1 text-xs"
                >
                  <option value="active">active</option>
                  <option value="warned">warned</option>
                  <option value="suspended">suspended</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ConfirmDestructive
        isOpen={!!confirm}
        title="Suspend user"
        description={`Suspending will block ${confirm?.user.name ?? ''} from the platform.`}
        confirmLabel="Suspend"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm && user) {
            setStatus.mutate({ id: confirm.user.id, status: 'suspended', actorId: user.id });
            setConfirm(null);
          }
        }}
      />
    </div>
  );
}
