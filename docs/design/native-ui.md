# Native UI redesign: SwiftUI on iOS, Material 3 on Android

Status: design spec for the 2026-10 redesign of CK APP's React Native screens.

## Why

The first React Native build stacked React Native cards full of full-width
buttons ("編輯待辦", "上移 課表", "移除站點" …) on both platforms. It looked the
same everywhere and felt native nowhere. The redesign keeps every feature and
all copy but renders each screen with the platform's own components:

- **iOS**: SwiftUI through `@expo/ui/swift-ui`: inset-grouped `List`s,
  `Section` headers and footers, `LabeledContent`, menu and segmented
  `Picker`s, `Toggle`s, compact `DatePicker`s, swipe actions, context menus,
  `refreshable`, SF Symbols, and navigation-bar buttons instead of in-content
  buttons.
- **Android**: Jetpack Compose Material 3 through `@expo/ui/jetpack-compose`:
  `LazyColumn` of section cards with `ListItem`s, `PullToRefreshBox`,
  extended FAB for the primary action, filter chips, segmented buttons,
  outlined text fields, exposed dropdown menus, the Material date picker
  dialog, overflow menus, Material Symbols, and the CK navy seed palette.

## Architecture

```
src/ui/
  types.ts                 the kit contract (shared by both platforms)
  index.ts                 re-exports `./kit` (platform-resolved) and types
  kit.ios.tsx              SwiftUI implementation
  kit.android.tsx          Compose Material 3 implementation
  kit.tsx                  fallback (web/tests) — plain React Native views
  use-synced-text.ts       shared helper: native text state <-> React state
  use-reverting-choice.ts  shared helper: native pickers always show `value`
```

Screens are written **once** against the kit (`import { ListScreen, Section,
Row, … } from '@/ui'`). Each kit component renders real native views on each
platform, with the platform idioms built in (e.g. `Row.actions` become swipe
actions + a context menu on iOS and an overflow menu on Android). A screen may
still add `screen.ios.tsx` / `screen.android.tsx` when the platforms need a
genuinely different layout, but sharing is the default.

Rules for kit children: a `ListScreen` contains only `Section`s. A `Section`
contains rows (`Row`,
`CheckRow`, `ToggleRow`, `PickerRow`, `TextFieldRow`, `DateRow`, `ButtonRow`,
`TextBlock`, `TileGrid`, `MonthCalendar`, `Embedded`, `FilterChips`, …).
A lone segmented picker (view switcher), filter chips and full empty states go
in a `plain` Section ("Section (no title)" below means a plain section).
Inline elements (`MetricPills`, `CrowdBar`) only go in `Row.footer`. Never mix
raw `@expo/ui` or React Native views into kit trees — add a kit component.

Shared logic stays in hooks/pure modules under `src/features/*` (already
unit-tested). Platform kit files must not contain feature logic.

### Navigation chrome

- Tab roots and pushed screens keep expo-router's native stack header and
  native tabs. Titles stay inline (no large titles: SwiftUI lists inside a
  `Host` do not drive UIKit's large-title collapse reliably).
- Screen-level actions go in the header via `HeaderActions` (iOS
  `Stack.Toolbar` buttons/menus; Android top-app-bar icon buttons and an
  overflow `DropdownMenu`). Primary "add" actions additionally show as an
  Android extended FAB (`ListScreen.fab`); iOS ignores `fab`.
- Search uses the native header search bar (`Stack.SearchBar`), not an
  in-content text field.
- Editors (`/todo-editor`, `/event-editor`, `/schedule-editor`, new
  `/categories`, `/youbike-picker`, `/metro-picker`, `/youbike-rename`,
  `/restaurant`) are modal routes: iOS page sheet with 取消 (left) and a
  prominent 儲存/完成 (right) in the navigation bar; Android full-screen modal
  with a close icon (left) and a 儲存 text button (right). Destructive actions
  are a `ButtonRow role="destructive"` in the last section.
- Confirmations keep `Alert.alert` (native UIAlertController / Material
  dialog).

### Theme

- Brand: CK navy `#03328d` (`BRAND`). iOS hosts get `seedColor` = tint (lifted
  `#8EAEFF` in dark mode, as in `use-palette.ios.ts`); Android hosts get
  `seedColor={BRAND}` so Compose builds a SchemeTonalSpot palette that matches
  `usePalette()`.
- Status colours (open/closing/opening/closed, YouBike availability, Metro
  crowding, timetable cell colours, event category colours) are data and stay
  as they are; dark-mode variants come from the existing helpers.
- Dynamic Type / font scaling: use text styles (SwiftUI `font({ textStyle })`,
  Compose `typography`) instead of fixed sizes.

### Accessibility

Every icon-only control has a label; rows read as one element with title,
subtitle and state; selected/checked states are exposed; colour is never the
only signal (status text accompanies dots; crowding has a text summary).

## Kit components (see `src/ui/types.ts` for the exact props)

| Component | iOS (SwiftUI) | Android (Compose M3) |
|---|---|---|
| `ListScreen` | `Host{flex:1}` › `List` + `listStyle('insetGrouped')` + `refreshable` | `Host{flex:1}` › `PullToRefreshBox` › `LazyColumn` (16dp gutters, 16dp spacing, safe-area bottom padding) + optional `ExtendedFloatingActionButton` overlay |
| `Section` | `Section title footer`; `plain` → clear row backgrounds | header `Text` (titleSmall, primary) + `Card` (surfaceContainerLow) of rows with dividers + footer `Text` (bodySmall); `plain` → rows without the card |
| `Row` | `Button` (plain) / static `HStack`: leading SF Symbol or dot, title/subtitle `VStack`, trailing detail/badge/accessory; `SwipeActions` + `ContextMenu` for `actions`; leading swipe for `toggle`; `listRowBackground` for `background` | `ListItem` with Headline/Supporting/Overline/Leading/Trailing slots, `clickable`, `containerColor` for `background`; trailing `IconButton` for `toggle`, overflow `DropdownMenu` for `actions` |
| `CheckRow` | Reminders-style circle / `checkmark.circle.fill` button + title; tap row body to edit | `ListItem` with leading `Checkbox` |
| `ToggleRow` | `Toggle` | `ListItem` + trailing `Switch` |
| `PickerRow` (menu) | `Picker` + `pickerStyle('menu')` | `ExposedDropdownMenuBox` + read-only `OutlinedTextField` |
| `PickerRow` (segmented) | `Picker` + `pickerStyle('segmented')`, labels hidden | `SingleChoiceSegmentedButtonRow` |
| `TextFieldRow` | `TextField` (vertical axis when multiline) | `OutlinedTextField` with label |
| `DateRow` | `DatePicker displayedComponents={['date']}` (compact) | `ListItem` showing the date › `DatePickerDialog` |
| `ButtonRow` | `Button` (role, systemImage); `prominent` → `borderedProminent` | `ListItem` clickable in primary/error colour; `prominent` → filled `Button` |
| `TextBlock` | `Text` | `Text` bodyMedium |
| `EmptyState` | `ContentUnavailableView` on iOS 17+, `VStack` fallback on 16.x | centred `Column`: 48dp icon, titleMedium, bodyMedium, `TextButton` |
| `Notice` | `Label` with warning/info symbol + text, optional button | tonal `Card` (errorContainer / secondaryContainer) |
| `Loading` | `ProgressView` + label | `LinearProgressIndicator`/`CircularProgressIndicator` + label |
| `FilterChips` | horizontal `ScrollView` of capsule `Button`s (bordered / borderedProminent) | `FlowRow` of `FilterChip`s |
| `TileGrid` | `Grid` of tiles (`Image` + `Text`) | rows of clickable `Card` tiles (`Icon` + `Text`) |
| `MonthCalendar` | `Grid` 7×6 day cells with dots, weekday header | `Column` of `Row`s, `Box` cells (`weight(1f)`), dots |
| `MetricPills` | `HStack` of `Label`s with coloured symbols | `Row` of `AssistChip`-like pills |
| `CrowdBar` | `HStack` of `Capsule`s | `Row` of rounded `Box`es |
| `Embedded` | `RNHostView` in a row (fixed height or aspect ratio) | `RNHostView` with `height` modifier |

## Screens

All copy stays as today unless noted. Pull-to-refresh where the screen loads
remote data.

### 首頁 (Home)
- Header: 設定 and 關於 icons (unchanged).
- Section "今天" — `Row` with today's date as title and `{class} 班` subtitle,
  plus the current/next period: title = subject (or 目前沒有上課), overline
  `第N節 08:10–09:00`, badge 目前 when in session, note as subtitle; tap opens
  課表.
- Section "功能" — `TileGrid` of all nine features (SF Symbol / Material
  Symbol + title).
- Section "今日待辦事項" (widget toggle) — `CheckRow`s, empty →
  `TextBlock secondary` 今天沒有待辦事項; `ButtonRow` 查看行事曆.
- Section "釘選校網內容" (widget toggle) — `Row` per pin (title, date
  subtitle, external accessory) opening the link; `ButtonRow` 查看校網.

### 課表 (Schedule)
- Header: menu with 選擇班級 (class picker) and 重新匯入課表.
- Section (no title) — segmented `PickerRow` 一 二 三 四 五 (defaults to today).
- Section titled `星期X` with footer `{academicYear} · 第N週 · 單/雙週`
  — one `Row` per period: overline `第一節 · 08:10`, title = subject or 空堂,
  subtitle = `單週：A　雙週：B` and/or note, `background` = cell colour,
  `emphasized` + badge 目前 for the period in session, chevron → editor.
- Section "班級" — menu `PickerRow` (keeps the confirm-on-change Alert and
  the phase-1 revert behaviour) + `ButtonRow` 重新匯入課表.
- Footer hint 點選課程可修改科目、備註與顏色。
- Loading/error: `Loading` / `Notice` blocks.

### 編輯課程 (/schedule-editor, modal)
- Header 取消 / 儲存.
- Section "科目": either `TextFieldRow` 科目, or (rotation on) 單週科目 /
  雙週科目; `ToggleRow` 單雙週輪替 (from phase 1 model).
- Section "備註": multiline `TextFieldRow`.
- Section "顏色": menu `PickerRow` with the eight colours (label + swatch
  where possible).

### 行事曆 (Todo)
- Header: `+` menu (新增待辦 / 新增活動); Android FAB 新增待辦.
- Section (no title): segmented 月曆 / 待辦.
- Calendar view: a Section containing the kit `MonthCalendar`, which draws its
  own header (month title `2026年10月`, previous / 今天 / next controls) and a
  weekday row. Footer `{term} · 圓點為活動，方點為待辦。`. Then a Section titled with the selected
  day (`10月4日 星期日`): events as `Row`s (dot colour, title, category ·
  date range subtitle; school events show department/暫定/約略 and have no
  chevron; user events open the editor; actions 編輯/刪除) and todos as
  `CheckRow`s. Empty → `TextBlock secondary` 這一天沒有活動或待辦。
- Todo list view: Section with menu `PickerRow` 顯示類別 (counts) and
  `ButtonRow` 管理待辦類別 (→ `/categories?kind=todo`); then one Section per
  date group (title = date + weekday; overdue groups get footer 已過期);
  `CheckRow` per todo (subtitle category; tap edits; actions 刪除). Footer
  勾選待辦即完成並移除。

### 待辦 / 活動 editors (modal)
- Header 取消 / 儲存 (disabled until valid).
- 待辦: Section `TextFieldRow` 待辦標題; Section `ToggleRow` 指定日期 +
  `DateRow` 日期; Section menu `PickerRow` 待辦類別 + `ButtonRow`
  管理待辦類別 (→ `/categories?kind=todo`); Section destructive 刪除待辦.
- 活動: Section 活動標題; Section `DateRow` 起始日期 / 結束日期 (min =
  start; error `Notice` 結束日期不能早於起始日期。); Section 活動類別 picker
  + 管理活動類別 (→ `/categories?kind=event`); Section destructive 刪除活動.
  School events: read-only rows + footer 學校活動僅供查看，無法修改。

### 類別管理 (/categories?kind=todo|event, modal, new)
- Header 完成.
- Section "活動類別"/"待辦類別": `Row` per category (event: colour dot),
  actions 刪除 (with the same Alert copy; events keep ≥1 category).
- Section "新增類別": `TextFieldRow` 新類別名稱, (event) colour `PickerRow`
  + `TextFieldRow` 自訂色碼 (#RRGGBB), `ButtonRow` 新增類別. Footers keep the
  existing hints.

### 交通 (Transport)
- Header: refresh icon; `+` menu (YouBike 站點 / 捷運車站); Android FAB 新增站點
  opens the same choice (menu on the header is enough; FAB → YouBike picker).
- Section "YouBike 站點" (footer: 約每 10 秒更新 · 站點更新 HH:MM:SS): one
  `Row` per followed station: title nickname, subtitle `城市 · 站名`,
  footer `MetricPills` 可借 N / 可還 N with availability colours, status
  text when loading/error/no data; actions 修改暱稱 (→ `/youbike-rename`) and
  移除站點 (destructive). Empty → `EmptyState` 尚未加入站點… with action.
- Section "捷運車站" (footer: crowding legend + 到站資訊更新 time): per station
  a `Row` header (title station, subtitle line names with line-colour dots)
  followed by one `Row` per train: title `往 X`, detail countdown, leading
  line-colour dot, footer `CrowdBar` (accessibility summary); actions 移除車站.
  Not configured → `Notice` 捷運即時到站資訊暫未啟用。你仍可管理常用車站。
- `/youbike-picker` (modal): Header 完成. Segmented 搜尋站點 / 附近九站;
  search mode: segmented 城市 + `Stack.SearchBar` (搜尋站名或行政區); result
  `Row`s (title, area subtitle, `MetricPills`, trailing 加入 / 已加入 via
  `toggle` or checkmark accessory, tap adds). Nearby mode: `Embedded` map
  (existing `StationMap`) + numbered result rows with distance.
- `/metro-picker` (modal): Header 完成. Segmented line picker (BL/BR/R/G/O/Y…
  as today) + `Stack.SearchBar`; station `Row`s with checkmark when added;
  tap toggles add (removal stays on the main screen).
- `/youbike-rename?city&sna` (modal): `TextFieldRow` 暱稱, Header 取消/儲存.

### 美食 (Food)
- Header: map/list toggle icon, 隨機選擇 (shuffle) icon, filter menu with
  toggles 正在營業 / 我的最愛 (iOS menu with checkmarks; Android same menu
  with checks). `Stack.SearchBar` 搜尋餐廳.
- Android also shows `FilterChips` (正在營業, 我的最愛) at the top; iOS shows
  them in the header menu only.
- Map mode: Section with `Embedded` `RestaurantMap` (≈ 60% screen height),
  footer legend; then the list section below.
- List: Section `{n} 間餐廳`: `Row` per restaurant — leading status dot,
  title name, subtitle `正在營業 · 今日 06:00-14:00、16:30-19:30`, `toggle`
  favourite (heart / heart.fill), chevron → `/restaurant?name=`.
- `/restaurant?name=` (modal): Section header block (name, status), Section
  actions (加入/移除最愛, 在地圖開啟位置, 餐廳網站), Section "營業時間": `Row`
  per day (title 星期一, detail hours; today emphasized with badge 今天).
  Random choice opens this route for the chosen restaurant.

### 校網 (News)
- Header: menu 已讀所有訊息 / 恢復已讀訊息 / 重新整理. `Stack.SearchBar`
  搜尋消息.
- Section (no title): segmented 未讀 / 已釘選 / 已讀 / 全部.
- Section `{n} 則消息` (footer 最後更新：…): `Row` per item: title (3 lines),
  subtitle timestamp, overline 已釘選 when pinned, `toggle` pin, tap opens the
  article (external accessory), actions 開啟公告 / 分享 (iOS `ShareLink` not
  needed — use `Share.share`) / 釘選.
- "顯示更多" `ButtonRow`. Errors → `Notice` with 重試.

### 熱食部 (Menu)
- Header: previous week / next week icons and a 本週 text button.
- Section: segmented 一 二 三 四 五. Section titled with date + weekday:
  `Embedded` menu image (aspect ratio from the image), `Loading`, failure
  `EmptyState` 這一天的菜單尚未公布… with 重新讀取菜單 action. Section
  `ButtonRow` 在瀏覽器開啟菜單.

### 建北特約 (Promo), 選擇障礙小幫手 (Help), 關於 (About), 設定 (Settings)
- Promo: Section "建北特約" `TextBlock`s; Section "尋找特約店家" link `Row`s with
  `storefront`/`mappin` symbols and external accessory.
- Help: Section `TextFieldRow` multiline 選項 + footer hint; `ButtonRow
  prominent` 幫我選 / 再選一次; result Section "就選這個" with a large
  `TextBlock`.
- About: Section app identity (`Row` CK APP / 你的校園助理, detail 版本 x.y.z);
  Section "關於這個 APP" `TextBlock`s; Section "聯絡我們" link rows (mail,
  Instagram, web symbols, external accessory).
- Settings: Section "我的班級" menu `PickerRow` (confirm Alert + revert);
  Section "首頁顯示項目" three `ToggleRow`s; Section "自訂工具列" footer 最多
  顯示 4 個… — `ToggleRow` per feature with `actions` 上移/下移 (iOS: in edit
  mode via `List.ForEach onMove` is preferred if feasible inside the kit as
  `ReorderableSection`; otherwise context-menu/overflow 上移/下移); Section
  "個人資料" destructive `ButtonRow` 重設個人資料與設定 + footer.

### 紀念品 (Souvenir)
- Keeps the WebView (it is a website). Failure → kit `EmptyState` 目前無法載入
  紀念品商店。 with 重試 and 在瀏覽器開啟 actions; header button 在瀏覽器開啟.

## Verification

No simulator is available in CI-less development here, so every change must
pass `yarn typecheck`, `yarn lint`, `yarn test --runInBand`, and
`npx expo export --platform ios` / `--platform android` (Hermes bundles), and
every `@expo/ui` prop used must exist in `node_modules/@expo/ui/build/**.d.ts`.
On-device checks for both platforms remain required before release
(`docs/native-rewrite-progress.md`).
