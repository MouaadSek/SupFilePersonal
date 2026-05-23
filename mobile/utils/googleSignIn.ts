import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

export function isGoogleSignInConfigured(): boolean {
  if (Platform.OS === 'ios') return Boolean(iosClientId || webClientId);
  if (Platform.OS === 'android') return Boolean(androidClientId || webClientId);
  return Boolean(webClientId);
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
