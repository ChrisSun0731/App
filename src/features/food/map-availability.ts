import Constants from 'expo-constants';

/**
 * Whether 美食 can show its map: iOS always has Apple Maps; Android needs the
 * Google Maps key built in. Expo strips android.config from the public
 * manifest, so app.config.ts exposes the key's presence as a boolean in extra.
 * Web has no native map.
 */
export const MAP_AVAILABLE =
  process.env.EXPO_OS === 'ios' ||
  (process.env.EXPO_OS === 'android' && Constants.expoConfig?.extra?.googleMapsConfigured === true);
