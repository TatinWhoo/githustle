import { useState } from 'react';
import { ConfirmDestructive } from '@/components/primitives/ConfirmDestructive';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

export function DangerZone() {
  const { user, logout } = useAuth();
  const { push } = useToast();
  const [deactivate, setDeactivate] = useState(false);
  const [del, setDel] = useState(false);

  if (!user) return null;

  return (
    <section id="danger">
      <h2 className="font-display text-lg mb-3 text-gh-red">Danger zone</h2>
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => setDeactivate(true)}
          className="text-sm border border-border rounded-md px-3 py-2"
        >
          Deactivate account
        </button>
        <button
          onClick={() => setDel(true)}
          className="text-sm border border-gh-red text-gh-red rounded-md px-3 py-2"
        >
          Delete account
        </button>
      </div>

      <ConfirmDestructive
        isOpen={deactivate && !del}
        title="Deactivate account"
        description="You can reactivate any time by logging back in."
        confirmLabel="Deactivate"
        onCancel={() => setDeactivate(false)}
        onConfirm={() => {
          push({ intent: 'warning', message: 'Account deactivated' });
          void logout();
          setDeactivate(false);
        }}
      />

      <ConfirmDestructive
        isOpen={del}
        title="Delete account permanently"
        description="This cannot be undone. Type your email to unlock."
        confirmLabel="Delete permanently"
        requireTypedConfirmation={{ prompt: `Type ${user.email} to confirm`, expected: user.email }}
        onCancel={() => setDel(false)}
        onConfirm={() => {
          push({ intent: 'error', message: 'Account deleted' });
          void logout();
          setDel(false);
        }}
      />
    </section>
  );
}
