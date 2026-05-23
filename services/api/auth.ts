import { apiRequest } from './client';
import type { ApiUser } from './types';

export type AuthResponse = {
  token: string;
  user: ApiUser;
};

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email: email.trim().toLowerCase(), password },
    auth: false,
  });
}

export async function apiRegister(
  email: string,
  password: string,
  display_name: string,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: {
      email: email.trim().toLowerCase(),
      password,
      display_name: display_name.trim(),
    },
    auth: false,
  });
}

export async function apiMe(): Promise<ApiUser> {
  return apiRequest<ApiUser>('/auth/me');
}

export async function apiGoogleAuth(id_token: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/google', {
    method: 'POST',
    body: { id_token },
    auth: false,
  });
}

export async function apiForgotPassword(email: string): Promise<{
  message: string;
  dev_reset_token?: string;
}> {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email: email.trim().toLowerCase() },
    auth: false,
  });
}
