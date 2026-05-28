import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  UserLocation,
  type PressEvent,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  FALLBACK_CENTER,
  PIN_COLORS,
  PIN_EMOJIS,
  type LngLat,
  type Pin,
  useMapState,
} from '@/lib/map-state';

type PinFeatureProperties = {
  id: string;
  color: string;
  title: string;
  hasPhoto: boolean;
};

type PinFeature = GeoJSON.Feature<GeoJSON.Point, PinFeatureProperties>;
type MapCameraState = Pick<ViewStateChangeEvent, 'center' | 'zoom' | 'bearing' | 'pitch'>;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cameraRef = useRef<CameraRef>(null);
  const { pins, setPins, selectedProvider, mapStyle, mapStyleKey } = useMapState();

  const [center, setCenter] = useState<LngLat>(FALLBACK_CENTER);
  const [locationReady, setLocationReady] = useState(false);
  const [status, setStatus] = useState('Requesting location...');
  const [tracking, setTracking] = useState(false);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [pendingCoords, setPendingCoords] = useState<LngLat | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState(PIN_COLORS[0]);
  const [newEmoji, setNewEmoji] = useState(PIN_EMOJIS[0]);
  const [newPhotoUri, setNewPhotoUri] = useState<string | undefined>();
  const [mapCameraState, setMapCameraState] = useState<MapCameraState | null>(null);

  const layerPinById = useMemo(
    () => new globalThis.Map(pins.map((pin) => [pin.id, pin] as const)),
    [pins],
  );
  const layerPinData = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point, PinFeatureProperties>>(
    () => ({
      type: 'FeatureCollection',
      features: pins.map<PinFeature>((pin) => ({
        type: 'Feature',
        id: pin.id,
        geometry: {
          type: 'Point',
          coordinates: pin.coordinates,
        },
        properties: {
          id: pin.id,
          color: pin.color,
          title: pin.title,
          hasPhoto: Boolean(pin.photoUri),
        },
      })),
    }),
    [pins],
  );

  useEffect(() => {
    let mounted = true;

    async function getLocation() {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();

      if (!mounted) return;

      if (permStatus !== Location.PermissionStatus.GRANTED) {
        setStatus('Location denied - showing Warsaw');
        setLocationReady(true);
        return;
      }

      setStatus('Getting location...');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

      if (!mounted) return;

      const coords: LngLat = [pos.coords.longitude, pos.coords.latitude];
      setCenter(coords);
      setStatus('');
      setLocationReady(true);
    }

    getLocation().catch(() => {
      if (mounted) {
        setStatus('Location unavailable - showing Warsaw');
        setLocationReady(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  function beginSpot(coords: LngLat) {
    setSelectedPin(null);
    setPendingCoords(coords);
    setNewTitle('');
    setNewDesc('');
    setNewColor(PIN_COLORS[0]);
    setNewEmoji(PIN_EMOJIS[0]);
    setNewPhotoUri(undefined);
  }

  function handleMapLongPress(event: NativeSyntheticEvent<PressEvent>) {
    const coords = event.nativeEvent.lngLat;

    if (Array.isArray(coords) && coords.length >= 2) {
      beginSpot([coords[0], coords[1]]);
    }
  }

  function handleCreatePin() {
    if (!pendingCoords || !newTitle.trim()) return;

    const newPin: Pin = {
      id: `pin-${Date.now()}`,
      coordinates: pendingCoords,
      title: newTitle.trim(),
      description: newDesc.trim() || 'No description provided.',
      color: newColor,
      emoji: newEmoji,
      photoUri: newPhotoUri,
    };

    setPins((prev) => [newPin, ...prev]);
    setSelectedPin(newPin);
    setPendingCoords(null);
  }

  function handleDeletePin(pinId: string) {
    setPins((prev) => prev.filter((pin) => pin.id !== pinId));
    setSelectedPin(null);
  }

  function handleRecenter() {
    setTracking((current) => !current);
    cameraRef.current?.flyTo({ center, zoom: 15, duration: 800 });
  }

  function handleSelectPin(pin: Pin) {
    setPendingCoords(null);
    setSelectedPin(pin);
  }

  async function handleChoosePhoto() {
    const { status: permissionStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionStatus !== ImagePicker.PermissionStatus.GRANTED) {
      setStatus('Photo access denied');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });

    if (!result.canceled) {
      setNewPhotoUri(result.assets[0]?.uri);
    }
  }

  if (!locationReady) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={selectedProvider.accent} />
        <Text style={styles.loadingText}>{status}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <StatusBar style="light" />

      <Map
        key={mapStyleKey}
        mapStyle={mapStyle}
        style={styles.map}
        logo={false}
        attribution={false}
        onLongPress={handleMapLongPress}
        onRegionDidChange={(event) => {
          const { center: nextCenter, zoom, bearing, pitch } = event.nativeEvent;
          setMapCameraState({ center: nextCenter, zoom, bearing, pitch });
        }}
        compassPosition={{ top: insets.top + 82, right: 12 }}
        scaleBarPosition={{ bottom: insets.bottom + 65, left: 12 }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={mapCameraState ?? { center, zoom: 15 }}
          trackUserLocation={tracking ? 'default' : undefined}
        />

        <UserLocation accuracy heading />

        {pins.length > 0 && (
          <GeoJSONSource
            id="photo-pin-source"
            data={layerPinData}
            buffer={0}
            tolerance={0}
            onPress={(event) => {
              event.stopPropagation();
              const feature = event.nativeEvent.features?.[0] as PinFeature | undefined;
              const pinId = feature?.properties?.id;
              const pin = pinId ? layerPinById.get(pinId) : undefined;

              if (pin) {
                handleSelectPin(pin);
              }
            }}
          >
            <Layer
              id="photo-pin-halo-layer"
              type="circle"
              style={{
                circleRadius: ['case', ['get', 'hasPhoto'], 18, 16],
                circleColor: '#ffffff',
                circleOpacity: 0.95,
                circlePitchScale: 'viewport',
                circlePitchAlignment: 'viewport',
              }}
            />
            <Layer
              id="photo-pin-layer"
              type="circle"
              style={{
                circleRadius: ['case', ['get', 'hasPhoto'], 14, 12],
                circleColor: ['get', 'color'],
                circleOpacity: 1,
                circleStrokeColor: '#0f172a',
                circleStrokeWidth: 2,
                circlePitchScale: 'viewport',
                circlePitchAlignment: 'viewport',
              }}
            />
          </GeoJSONSource>
        )}
      </Map>

      <View style={[styles.topBar, { top: insets.top + 10 }]}>
        <Pressable style={styles.topButton} onPress={() => router.push('/tile-providers' as Href)}>
          <Text style={styles.topButtonTitle}>Tiles</Text>
          <Text style={styles.topButtonValue} numberOfLines={1}>
            {selectedProvider.name}
          </Text>
        </Pressable>
        <Pressable style={styles.topButton} onPress={() => router.push('/style-editor' as Href)}>
          <Text style={styles.topButtonTitle}>Style</Text>
          <Text style={styles.topButtonValue} numberOfLines={1}>
            Elements
          </Text>
        </Pressable>
      </View>

      <View style={[styles.hintPill, { top: insets.top + 78 }]}>
        <Text style={styles.hintText}>Long press the map to add a spot</Text>
      </View>

      {pendingCoords && (
        <View style={[styles.overlayCard, { bottom: insets.bottom + 18 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>New Spot</Text>
            <Pressable onPress={() => setPendingCoords(null)} hitSlop={12}>
              <Text style={styles.closeText}>x</Text>
            </Pressable>
          </View>

          <TextInput
            placeholder="Name"
            placeholderTextColor="#64748b"
            value={newTitle}
            onChangeText={setNewTitle}
            style={styles.input}
          />
          <TextInput
            placeholder="Details"
            placeholderTextColor="#64748b"
            value={newDesc}
            onChangeText={setNewDesc}
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={2}
          />

          <Text style={styles.sectionLabel}>Color</Text>
          <View style={styles.swatchContainer}>
            {PIN_COLORS.map((color) => (
              <Pressable
                key={color}
                style={[
                  styles.swatch,
                  { backgroundColor: color },
                  newColor === color && styles.swatchSelected,
                ]}
                onPress={() => setNewColor(color)}
                accessibilityLabel={`Use ${color}`}
              />
            ))}
          </View>

          <Text style={styles.sectionLabel}>Icon</Text>
          {newPhotoUri ? (
            <View style={styles.photoPreviewRow}>
              <Image source={{ uri: newPhotoUri }} style={styles.photoPreview} />
              <View style={styles.photoPreviewTextWrap}>
                <Text style={styles.photoPreviewTitle}>Photo marker selected</Text>
                <Text style={styles.photoPreviewSub}>This spot will use the photo instead of an icon.</Text>
              </View>
              <Pressable style={styles.removePhotoButton} onPress={() => setNewPhotoUri(undefined)}>
                <Text style={styles.removePhotoText}>Remove</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.photoButton} onPress={handleChoosePhoto}>
              <Text style={styles.photoButtonText}>Choose photo instead</Text>
            </Pressable>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiList}>
            {PIN_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                style={[styles.emojiItem, newEmoji === emoji && styles.emojiItemSelected]}
                onPress={() => setNewEmoji(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.actionContainer}>
            <Pressable style={[styles.actionButton, styles.cancelBtn]} onPress={() => setPendingCoords(null)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.saveBtn, !newTitle.trim() && styles.disabledBtn]}
              onPress={handleCreatePin}
              disabled={!newTitle.trim()}
            >
              <Text style={styles.saveBtnText}>Save Spot</Text>
            </Pressable>
          </View>
        </View>
      )}

      {selectedPin && !pendingCoords && (
        <View style={[styles.overlayCard, { bottom: insets.bottom + 18 }]}>
          <View style={styles.cardHeader}>
            <View style={styles.titleWithEmoji}>
              <View style={[styles.iconBadge, { backgroundColor: selectedPin.color }]}>
                {selectedPin.photoUri ? (
                  <Image source={{ uri: selectedPin.photoUri }} style={styles.badgePhoto} />
                ) : (
                  <Text style={styles.badgeEmoji}>{selectedPin.emoji}</Text>
                )}
              </View>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {selectedPin.title}
              </Text>
            </View>
            <Pressable onPress={() => setSelectedPin(null)} hitSlop={12}>
              <Text style={styles.closeText}>x</Text>
            </Pressable>
          </View>

          {selectedPin.photoUri && (
            <Image source={{ uri: selectedPin.photoUri }} style={styles.selectedPhoto} />
          )}

          <Text style={styles.pinDesc}>{selectedPin.description}</Text>

          <View style={styles.actionContainer}>
            <Pressable
              style={[styles.actionButton, styles.deleteBtn]}
              onPress={() => handleDeletePin(selectedPin.id)}
            >
              <Text style={styles.deleteBtnText}>Delete</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, styles.closeBtn]} onPress={() => setSelectedPin(null)}>
              <Text style={styles.closeBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 20, right: 16 }, tracking && styles.fabActive]}
        onPress={handleRecenter}
      >
        <Text style={[styles.fabIcon, tracking && styles.fabIconActive]}>◎</Text>
      </Pressable>

      {!selectedPin && !pendingCoords && (
        <View style={[styles.attribution, { bottom: insets.bottom + 4, left: 4 }]}>
          <Text style={styles.attributionText}>{selectedProvider.attribution}</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080d12',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#080d12',
  },
  loadingText: {
    color: '#a8b6c4',
    fontSize: 15,
    fontWeight: '600',
  },
  topBar: {
    position: 'absolute',
    left: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
  },
  topButton: {
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 14,
  },
  topButtonTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  topButtonValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  hintPill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(8, 13, 18, 0.78)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  hintText: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '700',
  },
  overlayCard: {
    position: 'absolute',
    left: 10,
    right: 10,
    maxHeight: '58%',
    backgroundColor: 'rgba(15, 23, 42, 0.97)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 18,
    elevation: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleWithEmoji: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
  },
  closeText: {
    color: '#94a3b8',
    fontSize: 20,
    fontWeight: '800',
    paddingHorizontal: 4,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    color: '#f8fafc',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  textArea: {
    height: 64,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  swatchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: '#f8fafc',
  },
  emojiList: {
    marginBottom: 18,
  },
  photoButton: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#273449',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121c2b',
    marginBottom: 12,
  },
  photoButtonText: {
    color: '#bae6fd',
    fontSize: 13,
    fontWeight: '900',
  },
  photoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#273449',
    backgroundColor: '#121c2b',
    padding: 10,
    marginBottom: 12,
  },
  photoPreview: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#f8fafc',
  },
  photoPreviewTextWrap: {
    flex: 1,
  },
  photoPreviewTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '900',
  },
  photoPreviewSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  removePhotoButton: {
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  removePhotoText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '900',
  },
  emojiItem: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  emojiItemSelected: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  emojiText: {
    fontSize: 20,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelBtnText: {
    color: '#cbd5e1',
    fontWeight: '800',
  },
  saveBtn: {
    backgroundColor: '#38bdf8',
  },
  saveBtnText: {
    color: '#071018',
    fontWeight: '900',
  },
  disabledBtn: {
    opacity: 0.45,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badgePhoto: {
    width: 34,
    height: 34,
  },
  selectedPhoto: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#111827',
    marginBottom: 14,
  },
  badgeEmoji: {
    fontSize: 16,
  },
  pinDesc: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.36)',
  },
  deleteBtnText: {
    color: '#fca5a5',
    fontWeight: '800',
  },
  closeBtn: {
    backgroundColor: '#38bdf8',
  },
  closeBtnText: {
    color: '#071018',
    fontWeight: '900',
  },
  fab: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(16, 24, 32, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#243241',
    elevation: 6,
  },
  fabActive: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
  },
  fabIcon: {
    fontSize: 26,
    color: '#67e8f9',
  },
  fabIconActive: {
    color: '#080d12',
  },
  attribution: {
    position: 'absolute',
    backgroundColor: 'rgba(8, 13, 18, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  attributionText: {
    color: '#d1d5db',
    fontSize: 9,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerBubble: {
    minWidth: 34,
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  markerEmoji: {
    fontSize: 16,
  },
  markerPhoto: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#111827',
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
    marginTop: -1,
  },
});
