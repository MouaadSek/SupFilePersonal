import axios from 'axios';
import { getApiBase } from './apiBase';

const api = axios.create({
  baseURL: getApiBase(),
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('supfile_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to /login on 401 only when a token exists (expired session).
// Skips redirect when there is no token so login-page failures propagate normally.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const hasToken = !!localStorage.getItem('supfile_token');
      if (hasToken) {
        localStorage.removeItem('supfile_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth helpers ────────────────────────────────────────────
export async function apiRegister(email: string, password: string, display_name?: string) {
  const res = await api.post('/auth/register', { email, password, display_name });
  return res.data as { token: string; user: User };
}

export async function apiLogin(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password });
  return res.data as { token: string; user: User };
}

export async function apiMe() {
  const res = await api.get('/auth/me');
  return res.data as User;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  quota_used: number;
  quota_total: number;
}

export default api;
