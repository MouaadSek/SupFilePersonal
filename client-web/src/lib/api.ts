import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
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
