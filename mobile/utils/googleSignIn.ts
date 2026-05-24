import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

function isValidClientId(id: string | undefined): boolean {
  if (!id) return false;
  // Reject placeholder values shipped in the template .env
  if (id.startsWith('your-')) return false;
  if (id.includes('placeholder')) return false;
  return true;
}

export function isGoogleSignInConfigured(): boolean {
  if (Platform.OS === 'ios') return isValidClientId(iosClientId) || isValidClientId(webClientId);
  if (Platform.OS === 'android') return isValidClientId(androidClientId) || isValidClientId(webClientId);
  return isValidClientId(webClientId);
}

export function useGoogleSignIn() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId,
    iosClientId: iosClientId || webClientId,
    androidClientId: androidClientId || webClientId,
  });

  return {
    request,
    response,
    promptAsync,
    configured: isGoogleSignInConfigured(),
  };
}
