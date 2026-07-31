import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import type { ResetRequestPayload } from '@/types/auth';
import { AuthCard } from '../components/AuthCard';

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetRequestPayload>();
  const onSubmit = handleSubmit(async (data) => { await authApi.requestReset(data).catch(() => {}); setSent(true); });

  return (
    <AuthCard title="Reset password" subtitle="We'll email you a reset link">
      {sent ? (
        <p className="text-sm text-gh-green">If an account exists for that email, a reset link is on its way. <Link to="/login" className="text-gh-teal">Back to sign in</Link></p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-xs font-semibold text-text-secondary">Email</label>
            <input id="email" type="email" autoComplete="email" className="w-full text-sm px-3 py-2 border border-border rounded-md focus:outline-none focus:border-gh-teal focus:ring-1 focus:ring-gh-teal" {...register('email', { required: 'Email is required' })} />
            {errors.email && <p className="text-xs text-gh-red">{errors.email.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-gh-teal hover:bg-gh-teal-hover text-white text-sm font-semibold py-2.5 rounded-md transition active:scale-[0.98] disabled:opacity-50">
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
