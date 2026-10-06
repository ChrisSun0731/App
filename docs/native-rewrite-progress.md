# Native rewrite checkpoint

Updated 2026-10-06 (Asia/Taipei). Work is on `claude/happy-edison-lpxz3d`.
The native UI redesign is the commits after `3cbebd1` (`git diff 3cbebd1 --
src` shows all of it); the integration fixes from its final review are on top
of `fc9914f`.

## Implemented

The Quasar/Capacitor app has been replaced with Expo SDK 57 and React Native.
Expo Router provides native tabs and stacks. The original app identity is
preserved.

Home, settings, about, timetable editing, calendar and task editing, category
management, restaurant map/list/favorites, school RSS and pins, weekly menus,
YouBike and Metro, partner links, souvenir store, and random-choice helper are
implemented. Hidden toolbar features open through a stack route; toolbar
configuration stays within the native five-tab limit. The previous app's user
data is imported once on the first launch after the update (see below).

CI and contributor documentation now use Expo prebuild, native Gradle/Xcode
builds, and lint/type/test checks. No release was published.

## Native UI redesign

Every screen was rebuilt from React Native cards and full-width buttons into
the platform's own components, following `docs/design/native-ui.md`:
SwiftUI inset-grouped lists, swipe actions, context menus and navigation-bar
buttons on iOS; Material 3 section cards, list items, overflow menus, FABs and
the CK navy seeded palette on Android. All features and (apart from the copy
conventions listed in the spec) all copy are kept.

### What was rebuilt

- Tab screens: 首頁, 課表, 行事曆, 交通, 熱食部, 美食, 校網, 建北特約, 紀念品, 小幫手.
- Pushed screens: 設定, 關於, `/feature/[id]`.
- Modal routes: `/schedule-editor`, `/todo-editor`, `/event-editor`, the new
  `/categories`, `/youbike-picker`, `/metro-picker`, `/youbike-rename` and the
  new `/restaurant` detail.
- Each screen then had a per-screen review and repair, a round of kit changes
  (header submenus, disabled rows that keep their actions, calendar indicator
  limit, Android header disabled colours) and a final integration review.

### Kit architecture

- `src/ui/types.ts` is the contract; screens import only from `@/ui`.
  `kit.ios.tsx` (+ `ios/`) implements it with `@expo/ui/swift-ui`,
  `kit.android.tsx` (+ `android/`) with `@expo/ui/jetpack-compose`, and
  `kit.tsx` with plain React Native views for Jest and TypeScript. All three
  are checked with `satisfies Kit`.
- `src/components/header-actions.*.tsx`: header icons, text buttons, menus
  and one level of submenus (`Stack.Toolbar` on iOS, Compose icon buttons and
  dropdowns in the top app bar on Android).
- Shared screen plumbing: `src/navigation/modal-header.ts` (modal chrome),
  `src/navigation/use-header-search.ts` (header search), `src/hooks/use-now.ts`
  (minute clock), `src/hooks/use-refresh.ts` (重試 progress),
  `src/lib/open-link.ts` (in-app vs external links), `src/lib/copy.ts`
  (shared phrases), `src/features/schedule/use-change-class.ts`.
- Pre-redesign UI code (`src/components/ui/page.tsx`, the Expo template
  components, `useConfirmedPicker`) has been removed.

### Verified here (no simulator or device)

- `yarn typecheck`, `yarn lint` and `yarn test --runInBand` (30 suites, 218
  tests) pass.
- Hermes bundles export for iOS and Android (`npx expo export --platform ios`
  / `--platform android`).
- Every `@expo/ui`, `Stack.Toolbar` and react-native-screens prop used was
  checked against `node_modules` (types, Swift and Kotlin sources).

### On-device checks still needed

iOS:

- 課表 header 選擇班級: the submenu opens, the current class is checked, the
  ~80 classes scroll, and declining the Alert leaves the check where it was.
  The 班級 pickers on 課表 and 設定 snap back after a declined change.
- 設定 at the 4-tab limit: long-pressing a greyed feature row still opens
  上移/下移 (SwiftUI's `.disabled` should not reach the menu around it).
- 交通: the header refresh button turns into a spinner while a refresh runs
  and comes back after; pulling still shows the list's own spinner.
- 校網: the footer hint shows; a right swipe pins, the long-press menu has
  釘選/取消釘選, 開啟公告 and 分享; 已讀所有訊息 / 恢復已讀訊息 are greyed when they
  have nothing to do.
- 行事曆: the one-row (three indicator) calendar cell layout; with the screen
  open across midnight, the 今天 ring, the day title and 已過期 move on.
- 美食: in portrait and landscape (iPhone and iPad) the map leaves the 「n
  間餐廳」 header and a row in view; while searching, the list title names the
  filters in use.
- Links: announcements open in the in-app browser from 校網 and 首頁;
  在瀏覽器開啟 (熱食部, 紀念品) opens Safari; 在地圖開啟位置 opens Maps.
- Disabled rows: a full swipe on a disabled row with actions only reveals the
  buttons (no screen disables such a row yet, so this needs a test screen).

Android:

- 課表 header 選擇班級: tapping it swaps the dropdown to the classes under a
  返回 item, the list scrolls, labels line up, and the menu returns to the
  top level after closing. TalkBack reads 已選取 and 返回.
- Header colours on Android 8–11 and on 12+ with a non-blue wallpaper: 儲存
  (form modals), 熱食部's 本週 and the dropdown menus use the CK navy palette.
  Greyed header icons: 美食's shuffle with no results, 交通's refresh while it
  runs; 校網's disabled menu items (text and icon).
- 交通's header refresh shows the pull-to-refresh indicator.
- Tabs with 3-button and with gesture navigation: 行事曆's FAB (and 交通's,
  when pinned) sits 16dp above the bottom navigation bar and the list ends
  without dead space; on pushed screens (`/feature/[id]`) and in modals the
  FAB and the list still clear the navigation bar.
- Keyboard: the header search on 美食 and 校網 pinned as tabs leaves the list
  ending at the keyboard's top; modal editors still lift a focused field
  above the keyboard as it animates.
- Rows: the overflow button on a disabled row is not faded; TalkBack reads
  「<title>」的更多選項, and a disabled `ButtonRow` (類別管理's 新增類別 with an
  empty name, 課表's 重新匯入課表 before the timetables load) with 已停用.
- 美食 in a tab: the map leaves the list header and a row in view (Android's
  estimate counts the tab bar as visible, so the map is ~40dp taller than on
  iOS); without `GOOGLE_MAPS_API_KEY` the screen opens in list mode.

Both platforms:

- Offline, tap 重試 on 行事曆's school-calendar notice, 首頁's timetable
  notice, 美食's notice and empty state, 設定's class list, the YouBike
  picker and `/restaurant`: a loading row replaces the notice until the
  fetch ends, and repeated taps do not restart it.
- The todo and event editors' not-found states offer 返回 / 返回行事曆;
  `/youbike-rename` for a removed station shows only 完成 / the close icon.
- iOS multiline `TextFieldRow` always draws its label as a caption, so a
  multiline field should not also sit under a section titled the same (the
  課表 editor's 備註 section has no title for that reason).
- Not fixed, known: a refused iOS `ToggleRow` change does not snap back (no
  screen refuses one now).

## Verification (before the redesign)

- Expo Doctor passed 21/21 checks with CocoaPods available on PATH.
- Android debug APK built; a separate `.codexverify` application was installed
  so the emulator's existing app and personal data remain untouched.
- iOS simulator build passed with scene lifecycle enabled. The rebuilt app
  launched on iOS 27 and rendered its native home screen.
- HTTP deadlines and caller cancellation cover response-body reading;
  stalled-download and cancellation regression tests pass.
- Legacy import: transform, merge, status and multi-launch session tests pass
  under Jest (real stores over in-memory storage). Not yet run on a device.

## Continue here

1. Run the on-device checks above on both platforms; fix runtime issues.
2. Validate the legacy import on devices (see "Before a store release").
3. Rerun lint, typecheck, tests and both Hermes exports after any fix, and
   update this checkpoint.

Generated `ios/` and `android/` folders are ignored. Install dependencies before
running `pod install` and compiling; Yarn can remove Expo SQLite's generated
headers. A fresh DerivedData directory resolved a stale SQLite compiler module
that had imported the system header while Expo's generated header was absent.

Earlier sessions kept temporary native logs, screenshots and bundles under
`/private/tmp`, ran Metro on port 8081, and connected Android's verification
build through `adb reverse` and its own `debug_http_host=localhost:8081`
preference.

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
