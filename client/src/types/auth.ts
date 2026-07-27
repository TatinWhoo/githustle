import type { UserRole } from './user';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  role: Exclude<UserRole, 'admin'>;
}

export interface ResetRequestPayload {
  email: string;
}

export interface ResetConfirmPayload {
  token: string;
  password: string;
}

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';
