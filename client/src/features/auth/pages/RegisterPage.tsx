import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { useAuth } from '../hooks/useAuth';
import type { RegisterPayload } from '@/types/auth';
import type { ApiError } from '@/types/api';
import { AuthCard } from '../components/AuthCard';
import { PasswordField } from '../components/PasswordField';
import { RoleSelect } from '../components/RoleSelect';

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<RegisterPayload['role']>('freelancer');
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Omit<RegisterPayload, 'role'>>();

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    try {
      await registerUser({ ...data, role });
      navigate('/verify-email', { replace: true });
    } catch (e) {
      const err = e as AxiosError<ApiError>;
      setFormError(err.response?.data?.message ?? 'Registration failed. Try again.');
    }
  });

  return (
    <AuthCard title="Create your account" subtitle="Join GitHustle">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <RoleSelect value={role} onChange={setRole} />
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-xs font-semibold text-text-secondary">Full name</label>
          <input id="name" autoComplete="name" className="w-full text-sm px-3 py-2 border border-border rounded-md focus:outline-none focus:border-gh-teal focus:ring-1 focus:ring-gh-teal" {...register('name', { required: 'Name is required' })} />
          {errors.name && <p className="text-xs text-gh-red">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-xs font-semibold text-text-secondary">Email</label>
          <input id="email" type="email" autoComplete="email" className="w-full text-sm px-3 py-2 border border-border rounded-md focus:outline-none focus:border-gh-teal focus:ring-1 focus:ring-gh-teal" {...register('email', { required: 'Email is required' })} />
          {errors.email && <p className="text-xs text-gh-red">{errors.email.message}</p>}
        </div>
        <PasswordField id="password" label="Password" autoComplete="new-password" error={errors.password?.message} {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })} />
        {formError && <p role="alert" className="text-xs text-gh-red">{formError}</p>}
        <button type="submit" disabled={isSubmitting} className="w-full bg-gh-teal hover:bg-gh-teal-hover text-white text-sm font-semibold py-2.5 rounded-md transition active:scale-[0.98] disabled:opacity-50">
          {isSubmitting ? 'Creating…' : 'Create Account'}
        </button>
        <p className="text-xs text-text-muted text-center">Already have an account? <Link to="/login" className="text-gh-teal">Sign in</Link></p>
      </form>
    </AuthCard>
  );
}
