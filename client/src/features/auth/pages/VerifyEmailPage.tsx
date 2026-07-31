import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { AuthCard } from '../components/AuthCard';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<'idle' | 'verifying' | 'ok' | 'error'>(token ? 'verifying' : 'idle');

  useEffect(() => {
    if (!token) return;
    authApi.verifyEmail(token).then(() => setState('ok')).catch(() => setState('error'));
  }, [token]);

  return (
    <AuthCard title="Verify your email" subtitle={token ? undefined : 'Check your inbox for a verification link.'}>
      {state === 'verifying' && <p className="text-sm text-text-secondary">Verifying…</p>}
      {state === 'ok' && <p className="text-sm text-gh-green">Email verified. <Link to="/login" className="text-gh-teal">Sign in</Link></p>}
      {state === 'error' && <p className="text-sm text-gh-red">Verification link is invalid or expired.</p>}
      {state === 'idle' && <Link to="/login" className="text-sm text-gh-teal">Back to sign in</Link>}
    </AuthCard>
  );
}
