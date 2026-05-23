/**
 * Google Sign-In is disabled until EXPO_PUBLIC_GOOGLE_* client IDs are configured.
 * Re-enable in login/register screens when ready.
 */
export const GOOGLE_AUTH_ENABLED = false;

export function isGoogleAuthConfigured(): boolean {
  return false;
}

export function useGoogleAuth() {
  return {
    signIn: async (): Promise<string | null> => null,
    configured: false,
    ready: false,
  };
}
