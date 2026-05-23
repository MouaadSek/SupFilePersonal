import { apiRequest } from './client';
import type { ApiUser } from './types';

export async function apiUpdateProfile(patch: {
  email?: string;
  display_name?: string;
  theme?: 'light' | 'dark' | 'system';
}): Promise<ApiUser> {
  return apiRequest<ApiUser>('/users/me', {
    method: 'PUT',
    body: patch,
  });
}

export async function apiChangePassword(
  current_password: string,
  new_password: string,
): Promise<{ message: string }> {
  return apiRequest('/users/me/password', {
    method: 'PUT',
    body: { current_password, new_password },
  });
}

export async function apiUploadAvatar(localUri: string): Promise<ApiUser> {
  const name = localUri.split('/').pop() || 'avatar.jpg';
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '.jpg';
  const mime =
    ext.toLowerCase() === '.png'
      ? 'image/png'
      : ext.toLowerCase() === '.webp'
        ? 'image/webp'
        : 'image/jpeg';

  const form = new FormData();
  form.append('avatar', {
    uri: localUri,
    name: `avatar${ext}`,
    type: mime,
  } as unknown as Blob);

  return apiRequest<ApiUser>('/users/me/avatar', {
    method: 'POST',
    body: form,
  });
}
