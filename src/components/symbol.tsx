import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

interface SymbolProps {
  /** SF Symbol shown on iOS. */
  ios: SFSymbol;
  /** Material Symbol shown on Android. */
  android: AndroidSymbol;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
}

/**
 * A platform-native icon for React Native views: an SF Symbol on iOS and a
 * Material Symbol on Android. Inside @expo/ui trees, use that tree's own
 * Image (SwiftUI) or Icon (Compose) instead.
 */
export function Symbol({ ios, android, size = 24, color, style }: SymbolProps) {
  return (
    <SymbolView
      name={{ ios, android }}
      size={size}
      tintColor={color}
      style={[{ width: size, height: size }, style]}
      resizeMode="scaleAspectFit"
    />
  );
}
