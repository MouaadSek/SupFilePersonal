import type { ApiFile, ApiStorageBreakdown } from './types';
import { apiRequest } from './client';

export type DashboardHomeResponse = {
  quota: { quota_used: number; quota_total: number };
  recent: ApiFile[];
  recent_images: ApiFile[];
  breakdown: ApiStorageBreakdown[];
};

/** Single round-trip for the home screen (`GET /dashboard/home`). */
export async function apiDashboardHome(): Promise<DashboardHomeResponse> {
  return apiRequest<DashboardHomeResponse>('/dashboard/home');
}

export async function apiQuota(): Promise<{ quota_used: number; quota_total: number }> {
  return apiRequest('/dashboard/quota');
}

export async function apiRecentFiles(): Promise<ApiFile[]> {
  return apiRequest<ApiFile[]>('/dashboard/recent');
}

export async function apiStorageBreakdown(): Promise<ApiStorageBreakdown[]> {
  return apiRequest<ApiStorageBreakdown[]>('/dashboard/breakdown');
}

export async function apiSearch(params: {
  q?: string;
  type?: string;
  date?: string;
}): Promise<ApiFile[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.type) qs.set('type', params.type);
  if (params.date) qs.set('date', params.date);
  const query = qs.toString();
  return apiRequest<ApiFile[]>(`/search${query ? `?${query}` : ''}`);
}
