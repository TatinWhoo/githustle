import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { useAuth } from '../hooks/useAuth';
import type { LoginPayload } from '@/types/auth';
import type { ApiError } from '@/types/api';
import { AuthCard } from '../components/AuthCard';
import { PasswordField } from '../components/PasswordField';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setFocus, formState: { errors, isSubmitting } } = useForm<LoginPayload>();

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    try {
      await login(data);
      const to = (location.state as { from?: string } | null)?.from ?? '/hub';
      navigate(to, { replace: true });
    } catch (e) {
      const err = e as AxiosError<ApiError>;
      setFormError(err.response?.data?.message ?? 'Login failed. Check your credentials and try again.');
      setFocus('email');
    }
  });

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your GitHustle account">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-xs font-semibold text-text-secondary">Email</label>
          <input id="email" type="email" autoComplete="email" className="w-full text-sm px-3 py-2 border border-border rounded-md focus:outline-none focus:border-gh-teal focus:ring-1 focus:ring-gh-teal" {...register('email', { required: 'Email is required' })} />
          {errors.email && <p className="text-xs text-gh-red">{errors.email.message}</p>}
        </div>
        <PasswordField id="password" label="Password" autoComplete="current-password" error={errors.password?.message} {...register('password', { required: 'Password is required' })} />
        {formError && <p role="alert" className="text-xs text-gh-red">{formError}</p>}
        <button type="submit" disabled={isSubmitting} className="w-full bg-gh-teal hover:bg-gh-teal-hover text-white text-sm font-semibold py-2.5 rounded-md transition active:scale-[0.98] disabled:opacity-50">
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </button>
        <div className="flex justify-between text-xs text-text-muted">
          <Link to="/forgot-password" className="hover:text-gh-teal">Forgot password?</Link>
          <Link to="/register" className="hover:text-gh-teal">Create account</Link>
        </div>
      </form>
    </AuthCard>
  );
}
