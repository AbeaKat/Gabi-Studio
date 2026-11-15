export type ThemePaletteId = 'coral' | 'emerald' | 'sapphire' | 'violet' | 'amber' | 'rose';

export interface ThemePalette {
  id: ThemePaletteId;
  name: string;
  subtitle: string;
  primaryHex: string;
  secondaryHex: string;
  softHex: string;
  rgbVars: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
}

export const THEME_PALETTES: Record<ThemePaletteId, ThemePalette> = {
  coral: {
    id: 'coral',
    name: 'Coral Nacarado',
    subtitle: 'Cálido, moderno y acogedor',
    primaryHex: '#F26B5B',
    secondaryHex: '#E05343',
    softHex: '#FFF1EF',
    rgbVars: {
      50: '255 241 239',
      100: '255 225 220',
      200: '255 197 188',
      300: '255 164 150',
      400: '250 130 113',
      500: '242 107 91',
      600: '224 83 67',
      700: '194 62 48',
      800: '159 51 39',
      900: '131 45 36',
    },
  },
  emerald: {
    id: 'emerald',
    name: 'Esmeralda Imperial',
    subtitle: 'Fresco, financiero y natural',
    primaryHex: '#10B981',
    secondaryHex: '#059669',
    softHex: '#ECFDF5',
    rgbVars: {
      50: '236 253 245',
      100: '209 250 229',
      200: '167 243 208',
      300: '110 231 183',
      400: '52 211 153',
      500: '16 185 129',
      600: '5 150 105',
      700: '4 120 87',
      800: '6 95 70',
      900: '6 78 59',
    },
  },
  sapphire: {
    id: 'sapphire',
    name: 'Azul Zafiro',
    subtitle: 'Ejecutivo, tecnológico y confiable',
    primaryHex: '#2563EB',
    secondaryHex: '#1D4ED8',
    softHex: '#EFF6FF',
    rgbVars: {
      50: '239 246 255',
      100: '219 234 254',
      200: '191 219 254',
      300: '147 197 253',
      400: '96 165 250',
      500: '37 99 235',
      600: '29 78 216',
      700: '30 64 175',
      800: '30 58 138',
      900: '23 37 84',
    },
  },
  violet: {
    id: 'violet',
    name: 'Violeta Real',
    subtitle: 'Creativo, exclusivo y vanguardista',
    primaryHex: '#7C3AED',
    secondaryHex: '#6D28D9',
    softHex: '#F5F3FF',
    rgbVars: {
      50: '245 243 255',
      100: '237 233 254',
      200: '221 214 254',
      300: '196 181 253',
      400: '167 139 250',
      500: '124 58 237',
      600: '109 40 217',
      700: '91 33 182',
      800: '76 29 149',
      900: '59 7 100',
    },
  },
  amber: {
    id: 'amber',
    name: 'Ámbar Dorado',
    subtitle: 'Energético, comercial y luminoso',
    primaryHex: '#D97706',
    secondaryHex: '#B45309',
    softHex: '#FFFBEB',
    rgbVars: {
      50: '255 251 235',
      100: '254 243 199',
      200: '253 230 138',
      300: '252 211 77',
      400: '251 191 36',
      500: '217 119 6',
      600: '180 83 9',
      700: '146 64 14',
      800: '120 53 15',
      900: '69 26 3',
    },
  },
  rose: {
    id: 'rose',
    name: 'Rosa Boutique',
    subtitle: 'Elegante, delicado y distintivo',
    primaryHex: '#E11D48',
    secondaryHex: '#BE123C',
    softHex: '#FFF1F2',
    rgbVars: {
      50: '255 241 242',
      100: '255 228 230',
      200: '254 205 211',
      300: '253 164 175',
      400: '251 113 133',
      500: '225 29 72',
      600: '190 18 60',
      700: '159 18 57',
      800: '136 19 55',
      900: '76 5 25',
    },
  },
};

export const THEME_PALETTE_LIST: ThemePalette[] = Object.values(THEME_PALETTES);

export function applyThemePalette(themeId?: ThemePaletteId | string | null): void {
  if (typeof document === 'undefined') return;
  const key = (themeId && themeId in THEME_PALETTES ? themeId : 'coral') as ThemePaletteId;
  const palette = THEME_PALETTES[key];
  const root = document.documentElement;
  root.setAttribute('data-theme', key);
  Object.entries(palette.rgbVars).forEach(([shade, value]) => {
    root.style.setProperty(`--brand-${shade}`, value);
  });
}
