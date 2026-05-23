import { Colors } from '@/constants/theme';

type ThemeColors = (typeof Colors)['light'];

/** Options Stack alignées sur le bouton retour natif (tinte `primary`). */
export function stackScreenHeaderBase(colors: ThemeColors) {
  return {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.primary,
    headerTitleStyle: { color: colors.text, fontWeight: '600' as const },
    headerShadowVisible: false,
  };
}
