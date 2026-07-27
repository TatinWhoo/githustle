import { apiClient } from '@/lib/api/client';
import type { User } from '@/types/user';
import type {
  LoginPayload,
  RegisterPayload,
  ResetRequestPayload,
  ResetConfirmPayload,
} from '@/types/auth';

interface UserEnvelope {
  data: { user: User };
}

export const authApi = {
  me: () => apiClient.get<UserEnvelope>('/auth/me').then((r) => r.data.data.user),
  login: (p: LoginPayload) =>
    apiClient.post<UserEnvelope>('/auth/login', p).then((r) => r.data.data.user),
  register: (p: RegisterPayload) => apiClient.post('/auth/register', p).then((r) => r.data),
  logout: () => apiClient.post('/auth/logout').then((r) => r.data),
  verifyEmail: (token: string) =>
    apiClient.get('/auth/verify-email', { params: { token } }).then((r) => r.data),
  resendVerification: (email: string) =>
    apiClient.post('/auth/resend-verification', { email }).then((r) => r.data),
  requestReset: (p: ResetRequestPayload) => apiClient.post('/auth/password-reset', p).then((r) => r.data),
  confirmReset: (p: ResetConfirmPayload) =>
    apiClient.post('/auth/password-reset/confirm', p).then((r) => r.data),
};
