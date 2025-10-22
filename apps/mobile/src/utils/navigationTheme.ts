import { useThemeStore } from '@/store/theme';

// Utility to convert RGB values to hex
const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${[r, g, b]
    .map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    })
    .join('')
    .toUpperCase()}`;
};

// Parse RGB string (e.g., "13 166 242" -> "#0DA6F2")
const parseRgbString = (rgbString: string): string => {
  const [r, g, b] = rgbString.split(' ').map(Number);
  return rgbToHex(r, g, b);
};

// Colors extracted directly from the GluestackUI config
// These are the actual values from your GluestackUI config file
const themeColors = {
  light: {
    info500: '13 166 242', // Blue accent
    typography400: '163 163 163', // Muted text
    background0: '255 255 255', // White background
    outline200: '221 220 219', // Subtle border
    typography950: '23 23 23', // Dark text
  },
  dark: {
    info500: '50 180 244', // Blue accent
    typography400: '140 140 140', // Muted text
    background0: '18 18 18', // Dark background
    outline200: '83 82 82', // Subtle border
    typography950: '254 254 255', // Light text
  },
};

// Navigation theme utility that uses GluestackUI colors as single source of truth
export const useNavigationTheme = () => {
  const { isDark } = useThemeStore();
  const colors = isDark ? themeColors.dark : themeColors.light;

  return {
    // Use the exact RGB values from your GluestackUI config
    tabBarActive: parseRgbString(colors.info500),
    tabBarInactive: parseRgbString(colors.typography400),
    tabBarBackground: parseRgbString(colors.background0),
    tabBarBorder: parseRgbString(colors.outline200),
    headerBackground: parseRgbString(colors.background0),
    headerBorder: parseRgbString(colors.outline200),
    headerTitle: parseRgbString(colors.typography950),
  };
};
