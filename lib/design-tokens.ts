/** Nothing design system token values for programmatic use (e.g. Chart.js, canvas). */
export const tokens = {
  light: {
    bg: '#F5F5F5',
    surface: '#FFFFFF',
    borderVisible: '#CCCCCC',
    borderSubtle: '#E8E8E8',
    textDisplay: '#000000',
    textPrimary: '#1A1A1A',
    textSecondary: '#666666',
    textDisabled: '#999999',
    accent: '#D71921',
    blue: '#007AFF',
  },
  dark: {
    bg: '#000000',
    surface: '#111111',
    borderVisible: '#333333',
    borderSubtle: '#222222',
    textDisplay: '#FFFFFF',
    textPrimary: '#E8E8E8',
    textSecondary: '#999999',
    textDisabled: '#666666',
    accent: '#D71921',
    blue: '#5B9BF6',
  },
} as const

export const fonts = {
  display: '"Doto", monospace',
  body: '"Space Grotesk", sans-serif',
  label: '"Space Mono", monospace',
} as const
