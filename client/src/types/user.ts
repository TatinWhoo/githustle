export type UserRole = 'client' | 'freelancer' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  emailVerified: boolean;
  avatarUrl?: string;
}
