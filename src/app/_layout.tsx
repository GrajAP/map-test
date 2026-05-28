import { Stack } from 'expo-router';

import { MapStateProvider } from '@/lib/map-state';

export default function RootLayout() {
  return (
    <MapStateProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#080d12' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="tile-providers" />
        <Stack.Screen name="style-editor" />
      </Stack>
    </MapStateProvider>
  );
}
