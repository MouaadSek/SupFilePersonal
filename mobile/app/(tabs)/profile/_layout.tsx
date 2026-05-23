import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { stackScreenHeaderBase } from '@/constants/navigationHeader';

export default function ProfileLayout() {
  const { colors } = useTheme();

  return (
    <Stack screenOptions={stackScreenHeaderBase(colors)}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="edit-profile"
        options={{
          title: 'Informations personnelles',
          headerBackTitle: 'Profil',
        }}
      />
      <Stack.Screen
        name="change-password"
        options={{
          title: 'Mot de passe',
          headerBackTitle: 'Profil',
        }}
      />
    </Stack>
  );
}
