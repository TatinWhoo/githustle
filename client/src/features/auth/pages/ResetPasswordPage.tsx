import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { AuthCard } from '../components/AuthCard';
import { PasswordField } from '../components/PasswordField';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ password: string }>();

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      await authApi.confirmReset({ token, password });
      navigate('/login', { replace: true });
    } catch {
      setFormError('Reset link is invalid or expired.');
    }
  });

  return (
    <AuthCard title="Set a new password">
      {!token ? (
        <p className="text-sm text-gh-red">Missing reset token. <Link to="/forgot-password" className="text-gh-teal">Request a new link</Link></p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <PasswordField id="password" label="New password" autoComplete="new-password" error={errors.password?.message} {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })} />
          {formError && <p role="alert" className="text-xs text-gh-red">{formError}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full bg-gh-teal hover:bg-gh-teal-hover text-white text-sm font-semibold py-2.5 rounded-md transition active:scale-[0.98] disabled:opacity-50">
            {isSubmitting ? 'Saving…' : 'Update password'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
