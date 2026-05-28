import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DEFAULT_STYLE_OPTIONS,
  type StyleElementKey,
  TILE_PROVIDERS,
  useMapState,
} from '@/lib/map-state';

const ELEMENTS: { key: StyleElementKey; label: string; detail: string }[] = [
  { key: 'background', label: 'Background', detail: 'Canvas behind every layer' },
  { key: 'land', label: 'Land', detail: 'Base landcover polygons' },
  { key: 'water', label: 'Water', detail: 'Rivers, lakes, and sea' },
  { key: 'park', label: 'Parks', detail: 'Green space and forest landuse' },
  { key: 'road', label: 'Roads', detail: 'Street and path linework' },
  { key: 'building', label: 'Buildings', detail: 'Building footprints' },
  { key: 'label', label: 'Labels', detail: 'Place names and text color' },
];

const COLOR_PRESETS = [
  '#fffbfe',
  '#f6f1ea',
  '#b8ddea',
  '#c8e6c9',
  '#6750a4',
  '#131314',
  '#1b1b1f',
  '#16343d',
  '#284732',
  '#d0bcff',
  '#eff1f5',
  '#4c4f69',
  '#8839ef',
  '#303446',
  '#c6d0f5',
  '#ca9ee6',
  '#24273a',
  '#cad3f5',
  '#c6a0f6',
  '#1e1e2e',
  '#cdd6f4',
  '#cba6f7',
  '#a6e3a1',
  '#89dceb',
];

const HUE_SWATCHES = [
  '#ff0000',
  '#ff7f00',
  '#ffff00',
  '#80ff00',
  '#00ff00',
  '#00ff80',
  '#00ffff',
  '#0080ff',
  '#0000ff',
  '#8000ff',
  '#ff00ff',
  '#ff0080',
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');

  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

function mixColors(base: string, overlay: string, amount: number) {
  const baseRgb = hexToRgb(base);
  const overlayRgb = hexToRgb(overlay);

  if (!baseRgb || !overlayRgb) {
    return base;
  }

  return rgbToHex(
    baseRgb.r + (overlayRgb.r - baseRgb.r) * amount,
    baseRgb.g + (overlayRgb.g - baseRgb.g) * amount,
    baseRgb.b + (overlayRgb.b - baseRgb.b) * amount,
  );
}

function buildShadeGrid(hue: string) {
  return [
    mixColors(hue, '#ffffff', 0.75),
    mixColors(hue, '#ffffff', 0.5),
    mixColors(hue, '#ffffff', 0.25),
    hue,
    mixColors(hue, '#000000', 0.2),
    mixColors(hue, '#000000', 0.4),
    mixColors(hue, '#000000', 0.6),
    mixColors(hue, '#000000', 0.78),
  ];
}

function normalizeHexInput(value: string) {
  const clean = value.replace(/[^0-9a-f]/gi, '').slice(0, 6);
  return clean.length === 6 ? `#${clean}` : value;
}

export default function StyleEditorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activePicker, setActivePicker] = useState<StyleElementKey | null>(null);
  const [pickerHue, setPickerHue] = useState('#00ffff');
  const [hexDrafts, setHexDrafts] = useState<Partial<Record<StyleElementKey, string>>>({});
  const {
    selectedProvider,
    setSelectedProviderId,
    styleOptions,
    updateStyleElement,
    resetStyleOptions,
  } = useMapState();
  const editableProvider = TILE_PROVIDERS.find((provider) => provider.kind === 'editable-vector');

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Map Style Editor</Text>
          <Text style={styles.subtitle}>Tune each editable map element precisely.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
        {selectedProvider.kind !== 'editable-vector' && editableProvider && (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Element editing uses editable vector tiles.</Text>
            <Text style={styles.noticeBody}>
              Your current provider is {selectedProvider.name}. Switch to an editable vector
              provider to see every element control on the map.
            </Text>
            <Pressable
              style={styles.noticeButton}
              onPress={() => setSelectedProviderId(editableProvider.id)}
            >
              <Text style={styles.noticeButtonText}>Use {editableProvider.name}</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.resetRow}>
          <Text style={styles.currentProvider}>Provider: {selectedProvider.name}</Text>
          <Pressable style={styles.resetButton} onPress={resetStyleOptions}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>

        {ELEMENTS.map(({ key, label, detail }) => {
          const element = styleOptions[key];
          const defaultColor =
            selectedProvider.kind === 'editable-vector'
              ? selectedProvider.preset[key].color
              : DEFAULT_STYLE_OPTIONS[key].color;
          const shadeGrid = buildShadeGrid(pickerHue);
          const hexDraft = hexDrafts[key] ?? element.color;

          return (
            <View key={key} style={styles.elementPanel}>
              <View style={styles.elementHeader}>
                <View style={styles.elementTitleGroup}>
                  <Text style={styles.elementLabel}>{label}</Text>
                  <Text style={styles.elementDetail}>{detail}</Text>
                </View>
                <Pressable
                  style={[styles.visibilityButton, !element.visible && styles.visibilityButtonMuted]}
                  onPress={() => updateStyleElement(key, { visible: !element.visible })}
                >
                  <Text style={styles.visibilityText}>{element.visible ? 'On' : 'Off'}</Text>
                </Pressable>
              </View>

              <View style={styles.swatchGrid}>
                {[defaultColor, ...COLOR_PRESETS.filter((color) => color !== defaultColor)].map(
                  (color) => (
                    <Pressable
                      key={`${key}-${color}`}
                      style={[
                        styles.swatch,
                        { backgroundColor: color },
                        element.color === color && styles.swatchActive,
                      ]}
                      onPress={() => updateStyleElement(key, { color })}
                      accessibilityLabel={`${label} color ${color}`}
                    />
                  ),
                )}
              </View>

              <Pressable
                style={styles.colorWheelButton}
                onPress={() => {
                  setActivePicker((current) => (current === key ? null : key));
                  setHexDrafts((current) => ({ ...current, [key]: element.color }));
                }}
              >
                <View style={[styles.currentColorDot, { backgroundColor: element.color }]} />
                <Text style={styles.colorWheelButtonText}>Exact color</Text>
                <Text style={styles.colorWheelValue}>{element.color.toUpperCase()}</Text>
              </Pressable>

              {activePicker === key && (
                <View style={styles.colorWheelPanel}>
                  <Text style={styles.pickerLabel}>Hue wheel</Text>
                  <View style={styles.hueWheel}>
                    {HUE_SWATCHES.map((hue) => (
                      <Pressable
                        key={`${key}-hue-${hue}`}
                        style={[
                          styles.hueSwatch,
                          { backgroundColor: hue },
                          pickerHue === hue && styles.hueSwatchActive,
                        ]}
                        onPress={() => setPickerHue(hue)}
                      />
                    ))}
                  </View>

                  <Text style={styles.pickerLabel}>Shade</Text>
                  <View style={styles.shadeGrid}>
                    {shadeGrid.map((color) => (
                      <Pressable
                        key={`${key}-shade-${color}`}
                        style={[
                          styles.shadeSwatch,
                          { backgroundColor: color },
                          element.color === color && styles.shadeSwatchActive,
                        ]}
                        onPress={() => {
                          updateStyleElement(key, { color });
                          setHexDrafts((current) => ({ ...current, [key]: color }));
                        }}
                      />
                    ))}
                  </View>

                  <View style={styles.hexRow}>
                    <TextInput
                      value={hexDraft}
                      onChangeText={(value) => {
                        const nextValue = normalizeHexInput(value);
                        setHexDrafts((current) => ({ ...current, [key]: nextValue }));

                        if (/^#[0-9a-f]{6}$/i.test(nextValue)) {
                          updateStyleElement(key, { color: nextValue.toLowerCase() });
                        }
                      }}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={7}
                      placeholder="#38BDF8"
                      placeholderTextColor="#64748b"
                      style={styles.hexInput}
                    />
                    <Pressable
                      style={styles.applyHexButton}
                      onPress={() => {
                        if (/^#[0-9a-f]{6}$/i.test(hexDraft)) {
                          updateStyleElement(key, { color: hexDraft.toLowerCase() });
                        }
                      }}
                    >
                      <Text style={styles.applyHexText}>Apply</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <View style={styles.adjustRow}>
                <Text style={styles.adjustLabel}>Opacity</Text>
                <View style={styles.stepper}>
                  <Pressable
                    style={styles.stepButton}
                    onPress={() =>
                      updateStyleElement(key, { opacity: clamp(element.opacity - 0.1, 0, 1) })
                    }
                  >
                    <Text style={styles.stepText}>-</Text>
                  </Pressable>
                  <Text style={styles.stepValue}>{Math.round(element.opacity * 100)}%</Text>
                  <Pressable
                    style={styles.stepButton}
                    onPress={() =>
                      updateStyleElement(key, { opacity: clamp(element.opacity + 0.1, 0, 1) })
                    }
                  >
                    <Text style={styles.stepText}>+</Text>
                  </Pressable>
                </View>
              </View>

              {key === 'road' && (
                <View style={styles.adjustRow}>
                  <Text style={styles.adjustLabel}>Road width</Text>
                  <View style={styles.stepper}>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() =>
                        updateStyleElement(key, {
                          width: clamp((element.width ?? 1.4) - 0.2, 0.4, 4),
                        })
                      }
                    >
                      <Text style={styles.stepText}>-</Text>
                    </Pressable>
                    <Text style={styles.stepValue}>{(element.width ?? 1.4).toFixed(1)}</Text>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() =>
                        updateStyleElement(key, {
                          width: clamp((element.width ?? 1.4) + 0.2, 0.4, 4),
                        })
                      }
                    >
                      <Text style={styles.stepText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
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
    gap: 12,
  },
  notice: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    backgroundColor: '#102036',
    padding: 14,
  },
  noticeTitle: {
    color: '#bfdbfe',
    fontSize: 14,
    fontWeight: '900',
  },
  noticeBody: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  noticeButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#38bdf8',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  noticeButtonText: {
    color: '#071018',
    fontWeight: '900',
  },
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  currentProvider: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  resetButton: {
    borderRadius: 8,
    backgroundColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resetText: {
    color: '#e5e7eb',
    fontWeight: '800',
  },
  elementPanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#101820',
    padding: 14,
  },
  elementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  elementTitleGroup: {
    flex: 1,
  },
  elementLabel: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
  },
  elementDetail: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 3,
  },
  visibilityButton: {
    minWidth: 56,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#14532d',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  visibilityButtonMuted: {
    backgroundColor: '#374151',
  },
  visibilityText: {
    color: '#f8fafc',
    fontWeight: '900',
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  swatchActive: {
    borderColor: '#f8fafc',
  },
  colorWheelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#273449',
    backgroundColor: '#121c2b',
    marginTop: 14,
    paddingHorizontal: 12,
  },
  currentColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f8fafc',
  },
  colorWheelButtonText: {
    flex: 1,
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '900',
  },
  colorWheelValue: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
  colorWheelPanel: {
    borderRadius: 8,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#1f2937',
    marginTop: 10,
    padding: 12,
  },
  pickerLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  hueWheel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 14,
  },
  hueSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  hueSwatchActive: {
    borderColor: '#f8fafc',
  },
  shadeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 12,
  },
  shadeSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  shadeSwatchActive: {
    borderColor: '#38bdf8',
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hexInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#273449',
    backgroundColor: '#111827',
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 12,
  },
  applyHexButton: {
    minHeight: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38bdf8',
    paddingHorizontal: 14,
  },
  applyHexText: {
    color: '#071018',
    fontWeight: '900',
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
  },
  adjustLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '800',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#273449',
  },
  stepButton: {
    width: 38,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#172033',
  },
  stepText: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
  },
  stepValue: {
    minWidth: 58,
    textAlign: 'center',
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '800',
  },
});
