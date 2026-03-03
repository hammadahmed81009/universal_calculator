export interface ApiError {
  status: number;
  code?: string;
  message: string;
  details?: Array<{ field?: string; message: string; code?: string }>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
}

export type UserRole = 'ADMIN' | 'USER';
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company?: string;
  phone?: string;
  theme?: string;
  image_url?: string;
  onboarding?: boolean;
}
