export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://localhost:3000'
).replace(/\/$/, '');

export const AUTH_TOKEN_KEY = 'supfile_auth_token';
