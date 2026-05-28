import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from 'react';
import { Color } from 'expo-router';
import { useColorScheme, type ColorSchemeName } from 'react-native';

export type LngLat = [number, number];

export type Pin = {
  id: string;
  coordinates: LngLat;
  title: string;
  description: string;
  color: string;
  emoji: string;
  photoUri?: string;
};

export type StyleElementKey =
  | 'background'
  | 'land'
  | 'water'
  | 'park'
  | 'road'
  | 'building'
  | 'label';

export type StyleElement = {
  color: string;
  visible: boolean;
  opacity: number;
  width?: number;
};

export type MapStyleOptions = Record<StyleElementKey, StyleElement>;
type MapStyleOverrides = Partial<Record<StyleElementKey, Partial<StyleElement>>>;

type EditableTileProvider = {
  id: string;
  name: string;
  kind: 'editable-vector';
  sourceId: string;
  sourceUrl?: string;
      sourceTiles?: readonly string[];
  sourceMaxZoom?: number;
  glyphs: string;
  fontFamily: string;
  preset: MapStyleOptions;
  useDevicePreset?: boolean;
  description: string;
  accent: string;
  attribution: string;
};

type TileProvider =
  | EditableTileProvider
  | {
      id: string;
      name: string;
      kind: 'style-url';
      url: string;
      description: string;
      accent: string;
      attribution: string;
    }
  | {
      id: string;
      name: string;
      kind: 'raster';
      tiles: string[];
      description: string;
      accent: string;
      attribution: string;
      tileSize?: number;
    };

const MATERIAL_LIGHT_STYLE: MapStyleOptions = {
  background: { color: '#fffbfe', visible: true, opacity: 1 },
  land: { color: '#f6f1ea', visible: true, opacity: 1 },
  water: { color: '#b8ddea', visible: true, opacity: 0.95 },
  park: { color: '#c8e6c9', visible: true, opacity: 0.72 },
  road: { color: '#ffffff', visible: true, opacity: 0.62, width: 0.9 },
  building: { color: '#ded8d0', visible: true, opacity: 0.62 },
  label: { color: '#2f3437', visible: true, opacity: 0.95 },
};

const MATERIAL_DARK_STYLE: MapStyleOptions = {
  background: { color: '#131314', visible: true, opacity: 1 },
  land: { color: '#1b1b1f', visible: true, opacity: 1 },
  water: { color: '#16343d', visible: true, opacity: 0.95 },
  park: { color: '#284732', visible: true, opacity: 0.72 },
  road: { color: '#d7dce1', visible: true, opacity: 0.5, width: 0.9 },
  building: { color: '#47464f', visible: true, opacity: 0.58 },
  label: { color: '#e5e1e6', visible: true, opacity: 0.95 },
};

export const DEFAULT_STYLE_OPTIONS = MATERIAL_DARK_STYLE;

const CATPPUCCIN_LATTE_STYLE: MapStyleOptions = {
  background: { color: '#eff1f5', visible: true, opacity: 1 },
  land: { color: '#e6e9ef', visible: true, opacity: 1 },
  water: { color: '#04a5e5', visible: true, opacity: 0.34 },
  park: { color: '#40a02b', visible: true, opacity: 0.22 },
  road: { color: '#ccd0da', visible: true, opacity: 0.62, width: 0.95 },
  building: { color: '#bcc0cc', visible: true, opacity: 0.5 },
  label: { color: '#4c4f69', visible: true, opacity: 0.95 },
};

const CATPPUCCIN_FRAPPE_STYLE: MapStyleOptions = {
  background: { color: '#303446', visible: true, opacity: 1 },
  land: { color: '#292c3c', visible: true, opacity: 1 },
  water: { color: '#85c1dc', visible: true, opacity: 0.28 },
  park: { color: '#a6d189', visible: true, opacity: 0.22 },
  road: { color: '#626880', visible: true, opacity: 0.55, width: 0.95 },
  building: { color: '#51576d', visible: true, opacity: 0.54 },
  label: { color: '#c6d0f5', visible: true, opacity: 0.94 },
};

const CATPPUCCIN_MACCHIATO_STYLE: MapStyleOptions = {
  background: { color: '#24273a', visible: true, opacity: 1 },
  land: { color: '#1e2030', visible: true, opacity: 1 },
  water: { color: '#7dc4e4', visible: true, opacity: 0.28 },
  park: { color: '#a6da95', visible: true, opacity: 0.22 },
  road: { color: '#5b6078', visible: true, opacity: 0.55, width: 0.95 },
  building: { color: '#494d64', visible: true, opacity: 0.54 },
  label: { color: '#cad3f5', visible: true, opacity: 0.94 },
};

const CATPPUCCIN_MOCHA_STYLE: MapStyleOptions = {
  background: { color: '#1e1e2e', visible: true, opacity: 1 },
  land: { color: '#181825', visible: true, opacity: 1 },
  water: { color: '#89dceb', visible: true, opacity: 0.25 },
  park: { color: '#a6e3a1', visible: true, opacity: 0.2 },
  road: { color: '#585b70', visible: true, opacity: 0.55, width: 0.95 },
  building: { color: '#45475a', visible: true, opacity: 0.54 },
  label: { color: '#cdd6f4', visible: true, opacity: 0.94 },
};

const CARTO_EDITABLE_SOURCE = {
  sourceId: 'carto',
  sourceUrl: 'https://tiles.basemaps.cartocdn.com/vector/carto.streets/v1/tiles.json',
  glyphs: 'https://basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf',
  fontFamily: 'Open Sans Regular',
  attribution: 'OpenStreetMap contributors, CARTO',
} as const;

const OPENFREEMAP_EDITABLE_SOURCE = {
  sourceId: 'openmaptiles',
  sourceTiles: ['https://tiles.openfreemap.org/planet/20260513_001001_pt/{z}/{x}/{y}.pbf'],
  sourceMaxZoom: 14,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  fontFamily: 'Noto Sans Regular',
  attribution: 'OpenStreetMap contributors, OpenFreeMap',
} as const;

type AndroidDynamicColorRole = keyof typeof Color.android.dynamic;

function clampColorChannel(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)));
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
    .map((channel) => clampColorChannel(channel).toString(16).padStart(2, '0'))
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

function dynamicColor(role: AndroidDynamicColorRole, fallback: string) {
  const value = Color.android.dynamic[role];
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function buildMaterialAccentPreset(colorScheme: ColorSchemeName) {
  const isDark = colorScheme === 'dark';
  const base = isDark ? MATERIAL_DARK_STYLE : MATERIAL_LIGHT_STYLE;
  const primary = dynamicColor('primary', isDark ? '#d0bcff' : '#6750a4');
  const primaryContainer = dynamicColor('primaryContainer', isDark ? '#4f378b' : '#eaddff');
  const secondaryContainer = dynamicColor('secondaryContainer', isDark ? '#4a4458' : '#e8def8');
  const tertiaryContainer = dynamicColor('tertiaryContainer', isDark ? '#633b48' : '#ffd8e4');
  const surface = dynamicColor('surface', base.background.color);
  const surfaceVariant = dynamicColor('surfaceVariant', base.land.color);
  const onSurface = dynamicColor('onSurface', base.label.color);

  return {
    background: {
      ...base.background,
      color: mixColors(surface, primary, isDark ? 0.05 : 0.025),
    },
    land: {
      ...base.land,
      color: mixColors(surfaceVariant, primaryContainer, isDark ? 0.18 : 0.16),
    },
    water: {
      ...base.water,
      color: mixColors(base.water.color, primary, isDark ? 0.24 : 0.18),
    },
    park: {
      ...base.park,
      color: mixColors(base.park.color, secondaryContainer, isDark ? 0.32 : 0.2),
    },
    road: {
      ...base.road,
      color: mixColors(base.road.color, primaryContainer, isDark ? 0.22 : 0.14),
    },
    building: {
      ...base.building,
      color: mixColors(base.building.color, tertiaryContainer, isDark ? 0.24 : 0.18),
    },
    label: {
      ...base.label,
      color: mixColors(onSurface, primary, isDark ? 0.08 : 0.04),
    },
  };
}

function buildFixedAccentPreset(
  base: MapStyleOptions,
  accent: string,
  strength: {
    background: number;
    land: number;
    water: number;
    park: number;
  road: number;
    building: number;
    label: number;
  },
) {
  return {
    background: { ...base.background, color: mixColors(base.background.color, accent, strength.background) },
    land: { ...base.land, color: mixColors(base.land.color, accent, strength.land) },
    water: { ...base.water, color: mixColors(base.water.color, accent, strength.water) },
    park: { ...base.park, color: mixColors(base.park.color, accent, strength.park) },
    road: { ...base.road, color: mixColors(base.road.color, accent, strength.road) },
    building: { ...base.building, color: mixColors(base.building.color, accent, strength.building) },
    label: { ...base.label, color: mixColors(base.label.color, accent, strength.label) },
  };
}

const MATERIAL_ACCENT_LIGHT_STRENGTH = {
  background: 0.025,
  land: 0.06,
  water: 0.16,
  park: 0.08,
  road: 0.04,
  building: 0.1,
  label: 0.04,
};

const MATERIAL_ACCENT_DARK_STRENGTH = {
  background: 0.06,
  land: 0.12,
  water: 0.24,
  park: 0.16,
  road: 0.08,
  building: 0.18,
  label: 0.08,
};

const MATERIAL_PURPLE_STYLE = buildFixedAccentPreset(
  MATERIAL_DARK_STYLE,
  '#cba6f7',
  MATERIAL_ACCENT_DARK_STRENGTH,
);

const MATERIAL_BLUE_STYLE = buildFixedAccentPreset(
  MATERIAL_LIGHT_STYLE,
  '#0b57d0',
  MATERIAL_ACCENT_LIGHT_STRENGTH,
);

const MATERIAL_GREEN_STYLE = buildFixedAccentPreset(
  MATERIAL_LIGHT_STYLE,
  '#146c2e',
  MATERIAL_ACCENT_LIGHT_STRENGTH,
);

const MATERIAL_ROSE_STYLE = buildFixedAccentPreset(
  MATERIAL_DARK_STYLE,
  '#ffb1c8',
  MATERIAL_ACCENT_DARK_STRENGTH,
);

export const TILE_PROVIDERS: TileProvider[] = [
  {
    id: 'material-device',
    name: 'Device Material',
    kind: 'editable-vector',
    ...CARTO_EDITABLE_SOURCE,
    preset: MATERIAL_LIGHT_STYLE,
    useDevicePreset: true,
    description: 'Editable Material-style map seeded from the device light or dark setting',
    accent: '#6750a4',
  },
  {
    id: 'material-light',
    name: 'Material Light',
    kind: 'editable-vector',
    ...CARTO_EDITABLE_SOURCE,
    preset: MATERIAL_LIGHT_STYLE,
    description: 'Warm light Material-inspired streets with soft terrain contrast',
    accent: '#6750a4',
  },
  {
    id: 'material-dark',
    name: 'Material Dark',
    kind: 'editable-vector',
    ...CARTO_EDITABLE_SOURCE,
    preset: MATERIAL_DARK_STYLE,
    description: 'Low-glare Material-inspired dark basemap for testing night UI',
    accent: '#d0bcff',
  },
  {
    id: 'material-purple',
    name: 'Material Purple',
    kind: 'editable-vector',
    ...CARTO_EDITABLE_SOURCE,
    preset: MATERIAL_PURPLE_STYLE,
    description: 'Purple-tinted Material dark map for accent-heavy UI tests',
    accent: '#cba6f7',
  },
  {
    id: 'material-blue',
    name: 'Material Blue',
    kind: 'editable-vector',
    ...CARTO_EDITABLE_SOURCE,
    preset: MATERIAL_BLUE_STYLE,
    description: 'Blue-tinted Material light map for classic Android accent testing',
    accent: '#0b57d0',
  },
  {
    id: 'material-green',
    name: 'Material Green',
    kind: 'editable-vector',
    ...CARTO_EDITABLE_SOURCE,
    preset: MATERIAL_GREEN_STYLE,
    description: 'Green-tinted Material light map with soft parks and roads',
    accent: '#146c2e',
  },
  {
    id: 'material-rose',
    name: 'Material Rose',
    kind: 'editable-vector',
    ...CARTO_EDITABLE_SOURCE,
    preset: MATERIAL_ROSE_STYLE,
    description: 'Rose-tinted Material dark map for warmer accent experiments',
    accent: '#ffb1c8',
  },
  {
    id: 'catppuccin-latte',
    name: 'Catppuccin Latte',
    kind: 'editable-vector',
    ...CARTO_EDITABLE_SOURCE,
    preset: CATPPUCCIN_LATTE_STYLE,
    description: 'Catppuccin light flavor adapted into editable map layers',
    accent: '#8839ef',
  },
  {
    id: 'catppuccin-frappe',
    name: 'Catppuccin Frappé',
    kind: 'editable-vector',
    ...CARTO_EDITABLE_SOURCE,
    preset: CATPPUCCIN_FRAPPE_STYLE,
    description: 'Soft muted Catppuccin dark map with gentle contrast',
    accent: '#ca9ee6',
  },
  {
    id: 'catppuccin-macchiato',
    name: 'Catppuccin Macchiato',
    kind: 'editable-vector',
    ...CARTO_EDITABLE_SOURCE,
    preset: CATPPUCCIN_MACCHIATO_STYLE,
    description: 'Medium-contrast Catppuccin dark map for UI experiments',
    accent: '#c6a0f6',
  },
  {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    kind: 'editable-vector',
    ...CARTO_EDITABLE_SOURCE,
    preset: CATPPUCCIN_MOCHA_STYLE,
    description: 'Deep Catppuccin Mocha basemap with pastel water and parks',
    accent: '#cba6f7',
  },
  {
    id: 'openfreemap-material',
    name: 'OpenFreeMap Material',
    kind: 'editable-vector',
    ...OPENFREEMAP_EDITABLE_SOURCE,
    preset: MATERIAL_LIGHT_STYLE,
    description: 'OpenFreeMap vector tiles with the new Material light preset',
    accent: '#6750a4',
  },
  {
    id: 'carto-dark',
    name: 'CARTO Dark Matter',
    kind: 'style-url',
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    description: 'Dark vector basemap',
    accent: '#7dd3fc',
    attribution: 'OpenStreetMap contributors, CARTO',
  },
  {
    id: 'carto-light',
    name: 'CARTO Positron',
    kind: 'style-url',
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    description: 'Light vector basemap',
    accent: '#334155',
    attribution: 'OpenStreetMap contributors, CARTO',
  },
  {
    id: 'carto-voyager',
    name: 'CARTO Voyager',
    kind: 'style-url',
    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    description: 'Detailed street basemap',
    accent: '#22c55e',
    attribution: 'OpenStreetMap contributors, CARTO',
  },
  {
    id: 'osm-standard',
    name: 'OpenStreetMap',
    kind: 'raster',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    description: 'Standard community raster tiles',
    accent: '#f97316',
    attribution: 'OpenStreetMap contributors',
    tileSize: 256,
  },
  {
    id: 'esri-imagery',
    name: 'Esri World Imagery',
    kind: 'raster',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ],
    description: 'Satellite imagery raster tiles',
    accent: '#a3e635',
    attribution: 'Esri, Maxar, Earthstar Geographics',
    tileSize: 256,
  },
];

export const PIN_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
export const PIN_EMOJIS = ['📍', '🏠', '🍔', '☕', '★', '♥', '!', '🌲', '🚲'];

export const FALLBACK_CENTER: LngLat = [21.0122, 52.2297];

const PHOTO_SEEDS = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=96&h=96&fit=crop&crop=entropy&auto=format',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=96&h=96&fit=crop&crop=entropy&auto=format',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=96&h=96&fit=crop&crop=entropy&auto=format',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=96&h=96&fit=crop&crop=entropy&auto=format',
  'https://images.unsplash.com/photo-1524230572899-a752b3835840?w=96&h=96&fit=crop&crop=entropy&auto=format',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=96&h=96&fit=crop&crop=entropy&auto=format',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=96&h=96&fit=crop&crop=entropy&auto=format',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=96&h=96&fit=crop&crop=entropy&auto=format',
];

const DEMO_TITLES = [
  'Coffee',
  'Bakery',
  'Gallery',
  'Lookout',
  'Garden',
  'Lunch',
  'Workspace',
  'Bookshop',
  'Market',
  'Museum',
  'Park Gate',
  'Courtyard',
];

function buildDemoPins() {
  const pins: Pin[] = [];
  const columns = 9;
  const rows = 8;
  const stepLng = 0.0042;
  const stepLat = 0.0028;
  const startLng = FALLBACK_CENTER[0] - ((columns - 1) * stepLng) / 2;
  const startLat = FALLBACK_CENTER[1] - ((rows - 1) * stepLat) / 2;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const title = DEMO_TITLES[index % DEMO_TITLES.length];
      const jitterLng = ((index % 3) - 1) * 0.00045;
      const jitterLat = (((index + 1) % 3) - 1) * 0.00035;

      pins.push({
        id: `demo-${index + 1}`,
        coordinates: [startLng + column * stepLng + jitterLng, startLat + row * stepLat + jitterLat],
        title: `${title} ${index + 1}`,
        description: 'Demo image-backed spot used to simulate a heavier marker load.',
        color: PIN_COLORS[index % PIN_COLORS.length],
        emoji: PIN_EMOJIS[index % PIN_EMOJIS.length],
        photoUri: PHOTO_SEEDS[index % PHOTO_SEEDS.length],
      });
    }
  }

  return pins;
}

const DEMO_PINS: Pin[] = buildDemoPins();

type MapState = {
  pins: Pin[];
  setPins: Dispatch<SetStateAction<Pin[]>>;
  selectedProvider: TileProvider;
  setSelectedProviderId: (id: string) => void;
  styleOptions: MapStyleOptions;
  updateStyleElement: (key: StyleElementKey, patch: Partial<StyleElement>) => void;
  resetStyleOptions: () => void;
  mapStyle: any;
  mapStyleKey: string;
};

const MapStateContext = createContext<MapState | null>(null);

function buildRasterStyle(provider: Extract<TileProvider, { kind: 'raster' }>) {
  return {
    version: 8,
    sources: {
      rasterTiles: {
        type: 'raster',
        tiles: provider.tiles,
        tileSize: provider.tileSize ?? 256,
        attribution: provider.attribution,
      },
    },
    layers: [{ id: 'rasterTiles', type: 'raster', source: 'rasterTiles' }],
  };
}

function visibility(element: StyleElement) {
  return element.visible ? 'visible' : 'none';
}

function buildEditableVectorStyle(
  provider: EditableTileProvider,
  options: MapStyleOptions,
) {
  const source = provider.sourceTiles
    ? {
        type: 'vector',
        tiles: provider.sourceTiles,
        maxzoom: provider.sourceMaxZoom ?? 14,
        attribution: provider.attribution,
      }
    : {
        type: 'vector',
        url: provider.sourceUrl,
        attribution: provider.attribution,
      };

  return {
    version: 8,
    glyphs: provider.glyphs,
    sources: {
      [provider.sourceId]: source,
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': options.background.color,
          'background-opacity': options.background.opacity,
        },
        layout: { visibility: visibility(options.background) },
      },
      {
        id: 'land',
        type: 'fill',
        source: provider.sourceId,
        'source-layer': 'landcover',
        paint: { 'fill-color': options.land.color, 'fill-opacity': options.land.opacity },
        layout: { visibility: visibility(options.land) },
      },
      {
        id: 'park',
        type: 'fill',
        source: provider.sourceId,
        'source-layer': 'landuse',
        filter: ['match', ['get', 'class'], ['park', 'forest', 'wood', 'grass'], true, false],
        paint: { 'fill-color': options.park.color, 'fill-opacity': options.park.opacity },
        layout: { visibility: visibility(options.park) },
      },
      {
        id: 'water',
        type: 'fill',
        source: provider.sourceId,
        'source-layer': 'water',
        paint: { 'fill-color': options.water.color, 'fill-opacity': options.water.opacity },
        layout: { visibility: visibility(options.water) },
      },
      {
        id: 'building',
        type: 'fill',
        source: provider.sourceId,
        'source-layer': 'building',
        minzoom: 13,
        paint: {
          'fill-color': options.building.color,
          'fill-opacity': options.building.opacity,
        },
        layout: { visibility: visibility(options.building) },
      },
      {
        id: 'road',
        type: 'line',
        source: provider.sourceId,
        'source-layer': 'transportation',
        paint: {
          'line-color': options.road.color,
          'line-opacity': options.road.opacity,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            0.4,
            12,
            options.road.width ?? 1.4,
            16,
            (options.road.width ?? 1.4) * 2.6,
          ],
        },
        layout: { visibility: visibility(options.road), 'line-cap': 'round', 'line-join': 'round' },
      },
      {
        id: 'place-label',
        type: 'symbol',
        source: provider.sourceId,
        'source-layer': 'place',
        minzoom: 3,
        paint: {
          'text-color': options.label.color,
          'text-opacity': options.label.opacity,
          'text-halo-color': options.background.color,
          'text-halo-width': 1,
        },
        layout: {
          visibility: visibility(options.label),
          'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
          'text-font': [provider.fontFamily],
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 12, 14],
        },
      },
    ],
  };
}

function deviceMaterialPreset(colorScheme: ColorSchemeName) {
  return buildMaterialAccentPreset(colorScheme);
}

function presetForProvider(
  provider: TileProvider,
  colorScheme: ColorSchemeName,
) {
  if (provider.kind !== 'editable-vector') {
    return DEFAULT_STYLE_OPTIONS;
  }

  return provider.useDevicePreset ? deviceMaterialPreset(colorScheme) : provider.preset;
}

function mergeStyleOverrides(base: MapStyleOptions, overrides: MapStyleOverrides) {
  return (Object.keys(base) as StyleElementKey[]).reduce<MapStyleOptions>((nextOptions, key) => {
    nextOptions[key] = { ...base[key], ...overrides[key] };
    return nextOptions;
  }, {} as MapStyleOptions);
}

export function MapStateProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme();
  const [pins, setPins] = useState(DEMO_PINS);
  const [selectedProviderId, setSelectedProviderIdState] = useState(TILE_PROVIDERS[0].id);
  const [styleOverrides, setStyleOverrides] = useState<MapStyleOverrides>({});

  const selectedProvider =
    TILE_PROVIDERS.find((provider) => provider.id === selectedProviderId) ?? TILE_PROVIDERS[0];

  const baseStyleOptions = useMemo(
    () => presetForProvider(selectedProvider, colorScheme),
    [colorScheme, selectedProvider],
  );

  const styleOptions = useMemo(
    () => mergeStyleOverrides(baseStyleOptions, styleOverrides),
    [baseStyleOptions, styleOverrides],
  );

  const mapStyle = useMemo(() => {
    if (selectedProvider.kind === 'style-url') {
      return selectedProvider.url;
    }

    if (selectedProvider.kind === 'raster') {
      return buildRasterStyle(selectedProvider);
    }

    return buildEditableVectorStyle(selectedProvider, styleOptions);
  }, [selectedProvider, styleOptions]);

  const mapStyleKey = useMemo(() => {
    if (selectedProvider.kind === 'style-url') {
      return `${selectedProvider.id}:${selectedProvider.url}`;
    }

    if (selectedProvider.kind === 'raster') {
      return `${selectedProvider.id}:${selectedProvider.tiles.join('|')}`;
    }

    return `${selectedProvider.id}:${JSON.stringify(styleOptions)}`;
  }, [selectedProvider, styleOptions]);

  const value = useMemo(
    () => ({
      pins,
      setPins,
      selectedProvider,
      styleOptions,
      setSelectedProviderId: (id: string) => {
        const nextProvider = TILE_PROVIDERS.find((provider) => provider.id === id);
        setSelectedProviderIdState(id);

        if (nextProvider) {
          setStyleOverrides({});
        }
      },
      updateStyleElement: (key: StyleElementKey, patch: Partial<StyleElement>) => {
        setStyleOverrides((current) => ({
          ...current,
          [key]: { ...current[key], ...patch },
        }));
      },
      resetStyleOptions: () => {
        setStyleOverrides({});
      },
      mapStyle,
      mapStyleKey,
    }),
    [mapStyle, mapStyleKey, pins, selectedProvider, styleOptions],
  );

  return <MapStateContext.Provider value={value}>{children}</MapStateContext.Provider>;
}

export function useMapState() {
  const value = useContext(MapStateContext);

  if (!value) {
    throw new Error('useMapState must be used within MapStateProvider');
  }

  return value;
}
