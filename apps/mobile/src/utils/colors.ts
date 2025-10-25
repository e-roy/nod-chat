/**
 * Theme-aware color utilities for Expo Go compatibility
 * Uses gluestack-ui's color tokens which work reliably across all platforms
 */

export const colors = {
  light: {
    // Backgrounds
    bg: {
      primary: '#FFFFFF', // --color-background-0
      secondary: '#F6F6F6', // --color-background-50
      muted: '#F7F8F7', // --color-background-muted
    },
    // Text
    text: {
      primary: '#262627', // --color-typography-900
      secondary: '#8C8C8C', // --color-typography-500
      muted: '#737373', // --color-typography-600
      inverse: '#FEFEFF', // --color-typography-0
    },
    // Borders
    border: {
      default: '#DDDCDB', // --color-outline-200
      muted: '#F3F3F3', // --color-outline-50
    },
    // Semantic colors
    error: '#DC2626', // --color-error-600
    success: '#348552', // --color-success-500
    warning: '#E77828', // --color-warning-500
    info: '#0DA6F2', // --color-info-500
  },
  dark: {
    // Backgrounds
    bg: {
      primary: '#121212', // --color-background-0
      secondary: '#272625', // --color-background-50
      muted: '#333333', // --color-background-muted
    },
    // Text
    text: {
      primary: '#F5F5F5', // --color-typography-900
      secondary: '#A3A3A3', // --color-typography-500
      muted: '#D4D4D4', // --color-typography-600
      inverse: '#171717', // --color-typography-0
    },
    // Borders
    border: {
      default: '#535252', // --color-outline-200
      muted: '#272624', // --color-outline-50
    },
    // Semantic colors
    error: '#F96160', // --color-error-600
    success: '#66B584', // --color-success-600
    warning: '#FDAD74', // --color-warning-600
    info: '#57C2F6', // --color-info-600
  },
};

export type ColorTheme = typeof colors.light;

/**
 * Get theme-aware colors
 */
export function getColors(isDark: boolean): ColorTheme {
  return isDark ? colors.dark : colors.light;
}
