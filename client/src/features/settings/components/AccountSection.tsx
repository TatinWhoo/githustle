import { useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function AccountSection() {
  const { user } = useAuth();
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [twoFA, setTwoFA] = useState(false);
  const { push } = useToast();

  const valid = pwd.length >= 12 && pwd === pwd2;

  return (
    <section id="account">
      <h2 className="font-display text-lg mb-3">Account</h2>
      <div className="text-sm">Email: {user?.email}</div>
      <div className="mt-4 flex flex-col gap-2 max-w-sm">
        <input
          type="password"
          placeholder="New password (min 12 chars)"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          className="border border-border rounded-md px-3 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={pwd2}
          onChange={(e) => setPwd2(e.target.value)}
          className="border border-border rounded-md px-3 py-2 text-sm"
        />
        <button
          disabled={!valid}
          onClick={() => {
            push({ intent: 'success', message: 'Password updated' });
            setPwd('');
            setPwd2('');
          }}
          className={`self-start text-sm px-3 py-1.5 rounded-md font-semibold text-white ${valid ? 'bg-gh-teal' : 'bg-gh-teal/40'}`}
        >
          Update password
        </button>
      </div>
      <label className="flex items-center gap-2 mt-4 text-sm">
        <input
          type="checkbox"
          checked={twoFA}
          onChange={(e) => setTwoFA(e.target.checked)}
        />
        Enable 2FA
      </label>
    </section>
  );
}
