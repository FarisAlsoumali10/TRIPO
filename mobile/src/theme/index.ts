import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    error: '#EF4444',
    background: '#FFFFFF',
    surface: '#F9FAFB',
    surfaceVariant: '#F3F4F6',
    onSurface: '#111827',
    onSurfaceVariant: '#6B7280',
  },
  roundness: 8,
};

export type AppTheme = typeof theme;
