// In-memory token management
let accessToken: string | null = 'jwt_mock_carlo_mendoza'; // initialized by default to keep the app active on boot

export const setToken = (t: string | null) => { 
  accessToken = t; 
};

export const getToken = () => accessToken;

export const clearToken = () => { 
  accessToken = null; 
};

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'freelancer' | 'client' | 'admin';
  is_verified: boolean;
}

export const mockAuthMe = async (token: string): Promise<AuthUser> => {
  // Simulate API fetch delay
  await new Promise(resolve => setTimeout(resolve, 350));
  
  if (!token) throw new Error('Unauthorized');
  
  // Return user based on token content
  if (token.includes('admin')) {
    return {
      id: 'usr_admin',
      name: 'SuperAdmin Auditor',
      email: 'admin@githustle.gov.ph',
      role: 'admin',
      is_verified: true
    };
  } else if (token.includes('client')) {
    return {
      id: 'usr_client',
      name: 'Juan Reyes',
      email: 'juan.reyes@sarisariconnect.ph',
      role: 'client',
      is_verified: false // email unverified to show email banner
    };
  } else {
    return {
      id: 'usr_freelancer',
      name: 'Carlo Mendoza',
      email: 'carlo.mendoza@dev.ph',
      role: 'freelancer',
      is_verified: false // email unverified to show email banner
    };
  }
};
