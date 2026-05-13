'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export interface RecentFile {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  folder_id: string | null;
  updated_at: string;
}

export interface QuotaData {
  quota_used: number;
  quota_total: number;
}

export function useDashboard() {
  const [quota, setQuota]   = useState<QuotaData | null>(null);
  const [recent, setRecent] = useState<RecentFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/quota').then((r) => setQuota(r.data)),
      api.get('/dashboard/recent').then((r) => setRecent(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  return { quota, recent, loading };
}
