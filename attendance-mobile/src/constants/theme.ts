import { Platform } from 'react-native';

export const Colors = {
  // Brand color palette (from design tokens)
  ink: '#1B2430',       // primary text, dark surfaces
  slate: '#445064',     // secondary text
  mist: '#F3F5F7',      // background (cool off-white)
  teal: '#0F6E56',      // primary action, in-zone/success
  amber: '#C97A2B',     // late/warning
  coral: '#B4432F',     // out-of-zone/error
  white: '#FFFFFF',
  border: 'rgba(68, 80, 100, 0.1)', // slate at low opacity
  
  // Adaptive themes
  light: {
    text: '#1B2430',
    background: '#F3F5F7',
    card: '#FFFFFF',
    textSecondary: '#445064',
    border: 'rgba(68, 80, 100, 0.1)',
  },
  dark: {
    text: '#FFFFFF',
    background: '#1B2430',
    card: '#222E3D',
    textSecondary: '#E0E4EC',
    border: 'rgba(255, 255, 255, 0.1)',
  }
} as const;

export const Fonts = {
  heading: 'SpaceGrotesk-Bold',
  headingMedium: 'SpaceGrotesk-Medium',
  body: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodySemiBold: 'Inter-SemiBold',
  bodyBold: 'Inter-Bold',
  mono: 'IBMPlexMono-Regular',
  monoMedium: 'IBMPlexMono-Medium',
  monoSemiBold: 'IBMPlexMono-SemiBold',
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 65 }) ?? 0;
export const MaxContentWidth = 800;
