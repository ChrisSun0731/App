# Contributing Guide

**Language / 語言:** [中文](CONTRIBUTING.md)｜English (this page)

Read the [README](README.en.md) for the React Native architecture, configuration, and current release limitations.

## Local development

Use Node.js 22+ and Yarn Classic. From the repository root:

```bash
yarn install --frozen-lockfile
cp .env.example .env.local
yarn android
# On macOS, yarn ios is also available
```

After changing native dependencies or configuration, regenerate with `npx expo prebuild --clean`. Do not commit `ios/` or `android/`. Persist native changes in `app.config.ts` or config plugins.

## Feature changes

1. Keep screens, hooks, and pure behavior in `src/features/<feature>/`. Build screens from the native UI kit in `src/ui` (see below); header buttons and menus use `src/components/header-actions`.
2. Put routes in `src/app/`. Register destinations in `src/features/registry.ts` and screen mappings in `src/features/screens.tsx`.
3. Toolbar features need `src/app/(tabs)/<feature>/` routes. At most four features accompany Home. Unselected features open through `/feature/[id]`.
4. Use Zustand actions in `src/store/` with `src/lib/storage.ts` for persistence. Do not directly mutate arrays in screens.
5. Use the kit's SwiftUI / Material 3 components for all interaction, supporting dark mode, readable text, and accessibility labels.

## Building screens with the native UI kit

The design spec is [docs/design/native-ui.md](docs/design/native-ui.md); the kit's contract is `src/ui/types.ts`.

- Screens import components from `@/ui` only and are written once: a `ListScreen` contains only `Section`s, and a `Section` contains rows (`Row`, `CheckRow`, `ToggleRow`, `PickerRow`, `TextFieldRow`, `DateRow`, `ButtonRow`, `TextBlock`, `EmptyState`, `Notice`, `Loading`, `FilterChips`, `TileGrid`, `MonthCalendar`, `Embedded`). `MetricPills` and `CrowdBar` only go in `Row.footer`.
- Never mix raw React Native or `@expo/ui` views into a kit tree; React Native content such as maps and images goes inside `Embedded`. Add a missing component to `types.ts` and implement it in all three kits: `kit.ios.tsx` (`src/ui/ios/`, SwiftUI), `kit.android.tsx` (`src/ui/android/`, Compose Material 3) and `kit.tsx` (the React Native version Jest and TypeScript use); each is checked with `satisfies Kit`.
- Kit files hold no feature logic; shared logic goes in pure, tested modules under `src/features/*`.
- Header actions use `HeaderActions`; modals use `formHeader` / `doneHeader` from `src/navigation/modal-header.ts`; search uses `src/navigation/use-header-search.ts`; retries use `src/hooks/use-refresh.ts`.
- iOS keeps row actions in swipe actions and the long-press menu only, so a screen that relies on them adds an iOS-only hint to that Section's footer.
- Copy: titles end without 。, messages with it; the action after a failure is 重試; shared phrases live in `src/lib/copy.ts`.
- Every `@expo/ui` prop used must exist in `node_modules/@expo/ui/build/**/*.d.ts`.

Calendar keys are local `YYYY-MM-DD`, handled through `src/lib/dates.ts`. Do not generate calendar dates or menu Mondays with `toISOString()`. Remote data needs validation, failure states, and a cache policy. Pause polling when it is unnecessary.

## Data changes

| Data | Location |
| --- | --- |
| Class timetables | Data repo `schedules/gaoyi_schedules.json`, `gaoer_schedules.json`, `gaosan_schedules.json` |
| Restaurants | Data repo `restaurantData.json`: names, coordinates, and opening hours |
| School calendar | Data repo `calendar/<term>.json`, currently `calendar/115-1.json`; source/schema are in `src/features/todo/school-calendar.ts` |
| Cafeteria menus | Data repo `menus/<Monday-date>_<1-to-5>.png` |
| Static Metro stations/lines | `src/features/transport/metro-lines.ts` |

The source is [CKApp-Dev/Data](https://github.com/CKApp-Dev/Data). Check the feature validators before changing payloads. Historical scripts in `tools/` may not produce the current schema; inspect their output before using it.

## Validation and pull requests

Work on a branch and open a PR. Before submitting:

```bash
yarn typecheck
yarn test --runInBand
yarn lint
```

Cover changes to dates, parsing, or state rules with meaningful regression tests. Place pure tests near their feature as `*.test.ts` and import `@jest/globals`. The current Jest suite does not require native UI startup.

Also check that the Hermes bundles build with `npx expo export --platform ios` and `npx expo export --platform android` (with the output folder outside the repo).

Verify affected flows on Android and iOS, including native inputs, sheets/dialogs, toolbar navigation, maps, offline behavior, and persistence after restart. Describe the problem, resulting behavior, validation, and untested limitations in the PR.

## Versions and releases

Local versions come from `package.json`. `app.config.ts` accepts `APP_VERSION` and `BUILD_NUMBER`. Do not edit generated Gradle/Xcode version values by hand.

Both a `vX.Y.Z` tag and a manually dispatched build workflow build, sign, and upload to Google Play internal / TestFlight. Tags require numeric `major.minor.patch`; manual runs use the package version. The workflow run number becomes the build number. Ordinary branch pushes and `[deploy]` commit prefixes do not trigger releases.

Keep signing credentials in GitHub Secrets and local API configuration in `.env.local`. Never commit private keys, provisioning profiles, or real API credentials.

**Legacy Capacitor WebView localStorage is imported on first launch by `src/features/legacy-import`.** When you change a store's shape or defaults, update that folder's transform/merge logic and tests too. Before release, validate the import by upgrading from a real previous build on Android and iOS.

## Contact

ckappofficial@gmail.com｜[Instagram](https://www.instagram.com/ckappofficial/)｜[website](https://ckapp-tw.web.app/)
