import React from 'react';
import { Stack } from 'expo-router';
import { AuthBranded } from '@/constants/authBranded';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: AuthBranded.pageBackground },
        animation: 'fade',
      }}
    />
  );
}
