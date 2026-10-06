# CK APP

**Language / 語言:** [中文](README.md)｜English (this page)

CK APP was created in 2024 by CK students Kimi and Diego to help students manage schedules and tasks, check transport, and find nearby food.

The app now uses **React Native, TypeScript, and Expo SDK 57**. Android interactive controls use Material 3 / Jetpack Compose; iOS uses SwiftUI controls and native navigation. Screen logic and layout are shared through React Native. The current package version is **4.0.0**; `app.config.ts` resolves the app version and build number.

## Features

| Feature               | Behavior                                                                     |
| --------------------- | ---------------------------------------------------------------------------- |
| Home                  | Current class, today's tasks, pinned announcements, and feature links        |
| Timetable             | Class selection, daily lessons, custom subjects/colors/notes, and restore    |
| Calendar              | School events, personal events, tasks, categories, and labels                |
| Transport             | Taipei/New Taipei YouBike stations, map selection, and Metro arrivals        |
| Cafeteria             | Week/day menu navigation, refresh, and image retry                           |
| Food                  | Native map/list, search, opening status, favorites, and random selection     |
| School news           | RSS, search, pins, read/restore controls, and external links                 |
| Discounts / souvenirs | Partner-store links and the souvenir website                                 |
| Helper / settings     | Random choices, home widgets, toolbar customization, and local data controls |

## Architecture and data

| Path                            | Purpose                                                              |
| ------------------------------- | -------------------------------------------------------------------- |
| `src/app/`                      | Expo Router routes, native stacks, and feature tabs                  |
| `src/features/`                 | Feature screens, data transforms, and hooks                          |
| `src/features/registry.ts`      | Home destinations and available toolbar features                     |
| `src/components/ui/`            | Shared Material 3 / SwiftUI interactive controls                     |
| `src/theme/`, `src/navigation/` | Platform colors, dark mode, and native navigation                    |
| `src/store/`                    | Zustand state persisted through Expo SQLite                          |
| `src/lib/`                      | HTTP timeouts, validated remote data/cache, date and storage helpers |
| `assets/`                       | App icons, splash images, and other static assets                    |
| `app.config.ts`                 | App identity, versions, native configuration, and environment inputs |
| `.github/workflows/`            | Native builds, signing, and testing-track uploads                    |
| `tools/`, `docs/`               | Data utilities and historical decision records                       |

Timetables, restaurants, the school calendar, and cafeteria menus come from the [Data repository](https://github.com/CKApp-Dev/Data). JSON is validated before caching; failed refreshes keep the last saved content. Menu filenames use the local Monday and weekday, such as `menus/2026-10-05_4.png`.

Native apps request upstream services directly. School news refreshes every two minutes; news and transport polling pause according to screen focus / app foreground state. Native tabs include Home and up to four selected features. Other features remain reachable from Home.

The settings reset restores personal stores/settings and clears in-memory query data. It retains remote JSON caches, cached menu images, and souvenir website data.

`ios/` and `android/` are generated, ignored directories. Make persistent native changes in `app.config.ts` or a config plugin, then regenerate. See [Expo Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/).

`expo-build-properties` enables `ios.enableSceneSupport` so generated projects adopt the scene lifecycle for Xcode 27 / iOS 27. Regenerate and rebuild after changing it; see [Expo's scene lifecycle guidance](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md).

## Development

Install Node.js 22+ and Yarn Classic. Android needs Android Studio / SDK and Java 21. iOS needs macOS, Xcode, and CocoaPods. Current SDK 57 native defaults are Android API 24+ and iOS 16.4+.

```bash
git clone https://github.com/CK-APP-Org/CK_app.git
cd CK_app
yarn install --frozen-lockfile
cp .env.example .env.local
```

Fill in `.env.local`, then run from the repository root:

```bash
yarn android       # Generate, build, and launch Android
yarn ios           # Generate, build, and launch iOS
yarn start         # Start Metro for an installed development build
```

After changing native dependencies or app configuration, regenerate with `npx expo prebuild --clean`. This overwrites manual changes inside generated native directories. Verify maps and native controls in the native app.

| Environment variable               | Purpose                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `METRO_API_USER`, `METRO_API_PASS` | Taipei Metro API credentials; ask a maintainer                                      |
| `GOOGLE_MAPS_API_KEY`              | Maps SDK for Android key; without it the app shows a notice while restaurant/station lists remain available. iOS uses Apple Maps |
| `APP_VERSION`                      | Optional override of the package version; CI derives it from the tag/package        |
| `BUILD_NUMBER`                     | Optional local override, default `1`; CI uses the workflow run number               |

Do not commit `.env.local`. Metro credentials and the Maps key are bundled into the app and are not server-side secrets. Protecting credentials requires a backend.

## Validation

```bash
yarn typecheck
yarn test --runInBand
yarn lint
```

Jest covers pure date, timetable, calendar, restaurant-hours, RSS, and transport behavior. Also verify input, tab navigation, sheets, maps, offline caching, and persistence after restarting on both platforms.

## Releases and signing

The [Android workflow](.github/workflows/build_android.yml) and [iOS workflow](.github/workflows/build_ios.yml) run on `vX.Y.Z` tags or manual dispatch. They check lint/types/tests, generate native projects, build, and sign. **Both triggers upload to Google Play internal or TestFlight.** Tags additionally attach artifacts to a GitHub Release. Ordinary branch pushes and a `[deploy]` commit prefix do not trigger these workflows.

Tag versions must be numeric `major.minor.patch`. Manual runs use `package.json`. Each workflow's run number becomes `BUILD_NUMBER`; maintainers must ensure it exceeds the existing store build. The app identity remains `org.capacitor.quasar.ckapp`.

Gradle signs APK/AAB files with the existing `PLAY_SIGNING_KEY`, `PLAY_SIGNING_KEY_ALIAS`, `PLAY_SIGNING_KEY_STORE_PASSWORD`, and `PLAY_SIGNING_KEY_PASSWORD` secrets. `SERVICE_ACCOUNT_JSON` uploads to Play. iOS uses `BUILD_CERTIFICATE_BASE64`, `P12_PASSWORD`, `BUILD_PROVISION_PROFILE_BASE64`, and `KEYCHAIN_PASSWORD`, retaining profile `Github Actions` and team `FJX3SGU9AL`. TestFlight retains secret `APPSTORE_API_PRIVATE_KEY` and variables `APPSTORE_ISSUER_ID` / `APPSTORE_API_KEY_ID`. Builds also require the API configuration above. See [Expo release builds](https://docs.expo.dev/guides/local-app-production/) for native signing guidance.

## Required before shipping updates

**The legacy data import needs on-device validation.** New Zustand state uses Expo SQLite, separate from the previous Capacitor WebView's localStorage. On first launch, `src/features/legacy-import` reads the previous app's tasks, events, timetable edits, class, favorites, pins, followed stations, and settings through a hidden WebView, converts them, and merges them in without overwriting data created in the new app (see [docs/native-rewrite-progress.md](docs/native-rewrite-progress.md)). Before shipping to existing users, install a real previous release (for example 3.4.0) on Android and iOS, create data, upgrade, and confirm everything arrives.

First-time requests without connectivity or a saved cache show an error/empty state. Store signing, the legacy data import, and native device behavior still require full release validation.

## Contributing and contact

Read the [Contributing Guide](CONTRIBUTING.en.md). Official email: ckappofficial@gmail.com; [Instagram](https://www.instagram.com/ckappofficial/); [website](https://ckapp-tw.web.app/).
