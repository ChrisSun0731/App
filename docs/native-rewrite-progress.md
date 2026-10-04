# Native rewrite checkpoint

Updated 2026-10-04 (Asia/Taipei). Work is on `feat/native-apps`; changes are uncommitted.

## Implemented

The Quasar/Capacitor app has been replaced with Expo SDK 57 and React Native.
Shared feature logic uses `@expo/ui` controls backed by SwiftUI on iOS and
Jetpack Compose / Material on Android. Expo Router provides native tabs and
stacks. The original app identity is preserved.

Home, settings, about, timetable editing, calendar and task editing, category
management, restaurant map/list/favorites, school RSS and pins, weekly menus,
YouBike and Metro, partner links, souvenir store, and random-choice helper are
implemented. Hidden toolbar features open through a stack route; toolbar
configuration stays within the native five-tab limit.

CI and contributor documentation now use Expo prebuild, native Gradle/Xcode
builds, and lint/type/test checks. No release was published.

## Verification

- TypeScript and lint pass.
- 37 domain and HTTP regression tests pass across nine suites.
- Expo Doctor passes 21/21 checks with CocoaPods available on PATH.
- Android and iOS Hermes production bundles export successfully.
- Android debug APK builds; a separate `.codexverify` application was installed
  so the emulator's existing app and personal data remain untouched.
- iOS simulator build passes with scene lifecycle enabled. The rebuilt app
  launches on iOS 27 and renders its native home screen.
- Runtime screen and editing checks are in progress. Android checks identified
  and fixed selected-segment contrast and native text-entry synchronization.
- HTTP deadlines and caller cancellation now cover response-body reading;
  stalled-download and cancellation regression tests pass.

## Continue here

1. Finish Android editing/persistence and iOS screen checks; fix runtime issues.
2. Final lint, typecheck, all 37 tests, and both production bundle exports pass
   after shared-field/HTTP changes. Rerun affected checks if runtime fixes follow.
3. Update this checkpoint with final verification evidence and remaining items.

Generated `ios/` and `android/` folders are ignored. Install dependencies before
running `pod install` and compiling; Yarn can remove Expo SQLite's generated
headers. A fresh DerivedData directory resolved a stale SQLite compiler module
that had imported the system header while Expo's generated header was absent.

Temporary native logs/screenshots and bundles are under `/private/tmp`.
The local Metro server is on port 8081. Android's verification build connects
through `adb reverse` and its own `debug_http_host=localhost:8081` preference.

## Before a store release

Legacy user-data import is not implemented. React Native's SQLite storage is
separate from the previous app's WebView storage; keeping the bundle ID does not
migrate that data. Validate migration against an actual previous release before
shipping an update. The emulator's older installed app is NativeScript and was
kept intact.

Android maps require `GOOGLE_MAPS_API_KEY`; without it the food list remains
usable and the map picker explains the limitation. Live Metro requires the
existing `METRO_API_USER` / `METRO_API_PASS` configuration. Store signing and
uploads require the documented CI credentials and have not been exercised here.

Codex usage-limit resets are managed by the host. This checkpoint preserves
progress but does not itself schedule an automatic restart.
