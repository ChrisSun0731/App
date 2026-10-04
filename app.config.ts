import type { ConfigContext, ExpoConfig } from 'expo/config';

import pkg from './package.json';

// Values that differ per build come from the environment. Locally, Expo CLI
// loads them from `.env.local` (see `.env.example`); in CI they come from the
// workflow (see .github/workflows).
//
// APP_VERSION / BUILD_NUMBER: CI derives these from the release tag and the
// workflow run number, so store builds always increase. Local builds fall back
// to package.json and build 1.
const version = process.env.APP_VERSION || pkg.version;
const buildNumber = process.env.BUILD_NUMBER || '1';

// The store identity is inherited from the original Capacitor app. Changing it
// would publish a brand-new app instead of an update to the existing one.
const APP_ID = 'org.capacitor.quasar.ckapp';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'CK APP',
  slug: 'ck-app',
  version,
  platforms: ['ios', 'android'],
  scheme: 'ckapp',
  // The previous app allowed landscape on iPhone and every orientation on
  // iPad, and iPad multitasking requires all four.
  orientation: 'default',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: APP_ID,
    buildNumber,
    // The shipped app supports iPad (TARGETED_DEVICE_FAMILY 1,2). App Store
    // Connect rejects an update that drops a device family, so keep it.
    supportsTablet: true,
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: APP_ID,
    versionCode: Number(buildNumber),
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundColor: '#FFFFFF',
    },
    // Google Maps renders the food map and the YouBike station picker on
    // Android. Without a key the map stays blank (iOS uses Apple Maps and
    // needs nothing). Create one for "Maps SDK for Android" in Google Cloud.
    config: process.env.GOOGLE_MAPS_API_KEY
      ? { googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY } }
      : undefined,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
      },
    ],
    'expo-sqlite',
    // SDK 57 opts into scenes so builds made with Xcode 27 launch on iOS 27.
    ['expo-build-properties', { ios: { enableSceneSupport: true } }],
  ],
  extra: {
    googleMapsConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY),
    // Taipei Metro (api.metro.taipei) account for the 交通 page. A client-only
    // app ships whatever value is configured, exactly as the Quasar build did;
    // see docs/refactoring-plan.md (Phase 1-B) for why this is accepted.
    metroApi: {
      user: process.env.METRO_API_USER ?? '',
      pass: process.env.METRO_API_PASS ?? '',
    },
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
