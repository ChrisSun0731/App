import Constants from 'expo-constants';

/**
 * Whether a native map can be shown (美食's map, the YouBike picker's nearby
 * map): iOS always has Apple Maps; Android draws Google Maps, which needs an
 * API key built into the app. Expo strips android.config from the public
 * manifest, so app.config.ts exposes the key's presence as a boolean in
 * extra. Web has no native map.
 */
export const MAP_AVAILABLE =
  process.env.EXPO_OS === 'ios' ||
  (process.env.EXPO_OS === 'android' && Constants.expoConfig?.extra?.googleMapsConfigured === true);
