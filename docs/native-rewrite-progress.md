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
configuration stays within the native five-tab limit. The previous app's user
data is imported once on the first launch after the update (see below).

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
- Legacy import: transform, merge, status and multi-launch session tests pass
  under Jest (real stores over in-memory storage). Not yet run on a device.

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

## Legacy user-data import

The previous app kept everything in its WebView's localStorage: the whole Vuex
state as JSON under `store`, and the class again under `userClass`. That
storage belongs to its origin, `capacitor://localhost` on iOS and
`https://localhost` on Android (`http://localhost` for Capacitor 5 and earlier,
read only when the https origin is empty). This app's stores use SQLite, so
keeping the bundle ID alone does not carry the data over.
`src/features/legacy-import/` copies it once:

- `_layout.tsx` calls `startLegacyImport()` before the first render. Until
  the import has finished, each launch counts an attempt before it starts (at
  most three, so a crash cannot loop) and mounts a hidden react-native-webview
  per origin. The splash screen stays up with no screen mounted for at most
  4.5 s, so neither the user nor the automatic timetable load can write to the
  stores first. If no answer has come by then, the app shows and the reader
  keeps going unseen for up to 30 s in total. A late answer is merged the same
  way, so a slow device (Chromium starting for the first time) still imports
  on that launch.
- Each WebView loads a tiny page with `source={{ html, baseUrl: origin }}`
  (WKWebView `loadHTMLString:baseURL:` / Android `loadDataWithBaseURL`) in the
  default persistent web storage, and posts back `self.origin`, `store` and
  `userClass`. The native behaviour this relies on is documented in
  `legacy-importer.tsx`.
- `transform.ts` maps the Vuex state to each store, defensively: UTC-serialised
  event/todo dates become local `YYYY-MM-DD`, numeric ids become strings,
  timetable cells keep notes, colours (label, Quasar option object or fill),
  單/雙週 rotations and overrides, toolbar links/labels map to tab features
  through `normalizeToolbar`, and junk or duplicates are dropped. The news
  cache is not carried over.
- `merge.ts` applies it without losing anything made in this app: values and
  lists still at their defaults are replaced, other lists are combined by
  id/name/title, and the timetable is replaced only if the user has not edited
  it here (edits are tracked in the status record while the import is owed).
  The old app's 恢復已讀訊息 marker (2010-01-01) counts as nothing read.
- The status lives under `ck.legacy-import`, outside the stores, so
  Settings' 重設個人資料與設定 does not trigger another import. While the
  import is still owed, that reset (every store back to its initial state in
  one task) ends it as `reset`, so the old data does not come back after the
  user cleared everything. `abandonLegacyImport()` does the same if called
  directly. Outcomes: `imported`, `empty` (nothing saved, as on a fresh
  install), `gave-up` or `reset`. `imported` and `empty` also record
  `reader: 1`. A timeout or unreadable origin leaves the import pending for
  the next launch.

## Before a store release

Legacy user-data import is implemented but **not yet validated on a device**.
Install a real previous store release (a Capacitor 7 build, e.g. 3.4.0) on
Android and on iOS, add data in every area (edited and 單/雙週 cells with notes
and colours, a changed class, events and todos, custom categories, pins,
favourites, YouBike and Metro stations, toolbar order and home widgets), then
install this build over it and check that everything arrives. The emulator's older installed app
is NativeScript and was kept intact, so it cannot serve for this.

The iOS path is the main risk: it depends on WebKit giving a page loaded with
`baseURL` `capacitor://localhost` that tuple origin (and so the previous app's
localStorage) without a registered `capacitor` scheme handler. The reader can
only catch two kinds of failure: an opaque origin (`self.origin` is `"null"`)
or an exception. These are retried on two more launches and then recorded as
`gave-up`. If WebKit gives the page the right origin but a different, empty
storage (another data store or partition), the read looks exactly like a
fresh install and is recorded as `empty` on the first launch. A fallback
(such as reading WebKit's storage files directly) would then be needed before
release. It can use the recorded `reader` version to re-run the `empty`
outcomes that version 1 produced.

Android maps require `GOOGLE_MAPS_API_KEY`; without it the food list remains
usable and the map picker explains the limitation. Live Metro requires the
existing `METRO_API_USER` / `METRO_API_PASS` configuration. Store signing and
uploads require the documented CI credentials and have not been exercised here.

Codex usage-limit resets are managed by the host. This checkpoint preserves
progress but does not itself schedule an automatic restart.
