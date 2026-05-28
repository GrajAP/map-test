import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TILE_PROVIDERS, useMapState } from '@/lib/map-state';

export default function TileProvidersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedProvider, setSelectedProviderId } = useMapState();

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Tile Providers</Text>
          <Text style={styles.subtitle}>Choose the basemap source used by the map.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {TILE_PROVIDERS.map((provider) => {
          const active = provider.id === selectedProvider.id;

          return (
            <Pressable
              key={provider.id}
              style={[styles.providerRow, active && styles.providerRowActive]}
              onPress={() => {
                setSelectedProviderId(provider.id);
                router.back();
              }}
            >
              <View style={[styles.accentRail, { backgroundColor: provider.accent }]} />
              <View style={styles.providerBody}>
                <View style={styles.providerHeader}>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  {active && <Text style={styles.activeLabel}>Selected</Text>}
                </View>
                <Text style={styles.providerDescription}>{provider.description}</Text>
                <Text style={styles.providerMeta}>
                  {provider.kind === 'editable-vector'
                    ? 'Vector tiles, editable by element'
                    : provider.kind === 'style-url'
                      ? 'Provider style JSON'
                      : 'Raster tile source'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#080d12',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  backText: {
    color: '#e5e7eb',
    fontSize: 30,
    lineHeight: 32,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 3,
  },
  content: {
    padding: 12,
    gap: 10,
  },
  providerRow: {
    flexDirection: 'row',
    minHeight: 96,
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#101820',
  },
  providerRowActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#122232',
  },
  accentRail: {
    width: 6,
  },
  providerBody: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  providerName: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
  },
  activeLabel: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '800',
  },
  providerDescription: {
    color: '#cbd5e1',
    fontSize: 13,
    marginTop: 6,
  },
  providerMeta: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 6,
  },
});
