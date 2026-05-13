'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiMe, type User } from '@/lib/api';
import { getToken, removeToken } from '@/lib/auth';

export function useAuth() {
  const router = useRouter();
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    apiMe()
      .then(setUser)
      .catch(() => {
        removeToken();
        router.replace('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  function logout() {
    removeToken();
    router.replace('/login');
  }

  return { user, loading, logout };
}
