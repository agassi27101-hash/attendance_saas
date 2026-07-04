import { StyleSheet, Text, type TextProps } from 'react-native';
import { Fonts, Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'defaultMedium'
    | 'defaultSemiBold'
    | 'defaultBold'
    | 'title'
    | 'subtitle'
    | 'small'
    | 'smallMedium'
    | 'smallBold'
    | 'code'
    | 'mono'
    | 'monoMedium'
    | 'monoSemiBold';
  colorType?: 'text' | 'textSecondary' | 'teal' | 'coral' | 'amber' | 'white';
};

export function ThemedText({ style, type = 'default', colorType = 'text', ...rest }: ThemedTextProps) {
  const scheme = useColorScheme();
  const currentColors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  // Resolve color
  let textColor: string = currentColors.text;
  if (colorType === 'textSecondary') {
    textColor = currentColors.textSecondary;
  } else if (colorType === 'teal') {
    textColor = Colors.teal;
  } else if (colorType === 'coral') {
    textColor = Colors.coral;
  } else if (colorType === 'amber') {
    textColor = Colors.amber;
  } else if (colorType === 'white') {
    textColor = '#FFFFFF';
  }

  return (
    <Text
      style={[
        { color: textColor },
        styles[type],
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  defaultMedium: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 24,
  },
  defaultBold: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 32,
    lineHeight: 38,
  },
  subtitle: {
    fontFamily: Fonts.headingMedium,
    fontSize: 20,
    lineHeight: 26,
  },
  small: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  smallMedium: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    lineHeight: 20,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    backgroundColor: 'rgba(68, 80, 100, 0.05)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mono: {
    fontFamily: Fonts.mono,
    fontSize: 14,
  },
  monoMedium: {
    fontFamily: Fonts.monoMedium,
    fontSize: 14,
  },
  monoSemiBold: {
    fontFamily: Fonts.monoSemiBold,
    fontSize: 14,
  },
});
