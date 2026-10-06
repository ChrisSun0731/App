# CK APP 校園行動應用程式

**語言 / Language：** 中文（本頁）｜[English](README.en.md)

CK APP 是建中第 77 屆學生彭可翰和楊晨諺於 2024 年開發的校園應用程式，協助學生查看課表、安排待辦、查詢交通與探索附近美食。

目前程式已改為 **React Native + TypeScript + Expo SDK 57**。每個畫面以原生 UI 元件組成：iOS 使用 SwiftUI（inset-grouped 列表、滑動動作、長按選單、導覽列按鈕），Android 使用 Material 3 / Jetpack Compose（區塊卡片、ListItem、溢位選單、FAB）。畫面只寫一次，透過 `src/ui` 的元件庫在兩個平台各自呈現；資料、狀態與畫面邏輯共用 TypeScript。`package.json` 的版本目前是 **4.0.0**，正式版本與建置編號由 `app.config.ts` 決定。

## 功能

| 功能         | 內容                                            |
| ------------ | ----------------------------------------------- |
| 首頁         | 目前課程、今日待辦、釘選校網消息與功能入口      |
| 課表         | 班級課表、每天課程、自訂科目／顏色／備註與還原  |
| 行事曆       | 校方行事曆、個人活動、待辦、分類與標籤          |
| 交通         | 台北／新北 YouBike 站點、地圖選站與北捷到站資訊 |
| 熱食部       | 週／日菜單切換、圖片重試與重新整理              |
| 美食         | 原生地圖與列表、搜尋、營業狀態、最愛與隨機選店  |
| 校網         | RSS 公告、搜尋、釘選、已讀／恢復與外部連結      |
| 特約／紀念品 | 特約店家入口與紀念品網頁                        |
| 小幫手／設定 | 隨機選擇、首頁資訊與工具列自訂、本機資料管理    |

## 架構與資料

| 路徑                            | 用途                                             |
| ------------------------------- | ------------------------------------------------ |
| `src/app/`                      | Expo Router 路由、原生 Stack 與功能分頁          |
| `src/features/`                 | 每項功能的畫面、資料轉換與 hooks                 |
| `src/features/registry.ts`      | 首頁入口與可加入工具列的功能                     |
| `src/ui/`                       | 原生 UI 元件庫：`types.ts` 為介面，iOS 以 SwiftUI、Android 以 Compose Material 3 實作（規格見 [docs/design/native-ui.md](docs/design/native-ui.md)） |
| `src/components/`               | 導覽列按鈕與選單（`header-actions`）、圖示對照表 |
| `src/theme/`、`src/navigation/` | 平台色彩、深色模式、原生導覽、modal 標題列與搜尋欄 |
| `src/hooks/`                    | 共用 hooks：分鐘時鐘、重試進度                   |
| `src/store/`                    | Zustand 狀態，透過 Expo SQLite 儲存              |
| `src/lib/`                      | HTTP timeout、遠端資料驗證／快取、日期、儲存、連結開啟與共用文案 |
| `assets/`                       | App 圖示、啟動畫面與其他靜態圖檔                 |
| `app.config.ts`                 | App 身分、版本、原生設定與環境變數               |
| `.github/workflows/`            | Android／iOS 建置、簽署與測試通路上傳            |
| `tools/`、`docs/`               | 資料處理工具、設計規格（`docs/design/`）、進度與歷史決策紀錄 |

課表、餐廳、校方行事曆與菜單來自 [Data repo](https://github.com/CKApp-Dev/Data)。JSON 資料經過格式驗證後儲存快取，更新失敗時可先顯示上次內容。菜單圖片檔名使用當地日期的週一加上星期序號，例如 `menus/2026-10-05_4.png`。

遠端請求直接由原生 App 發出。校網每 2 分鐘更新；校網與交通輪詢會依畫面焦點／前景狀態暫停。功能分頁採原生 tab bar，首頁之外最多加入 4 個功能；其他功能仍可由首頁開啟。

設定中的資料重設會還原個人 store 與設定，並清空記憶體查詢資料。遠端 JSON 快取、菜單圖片磁碟快取與紀念品網站資料不會一併刪除。

`ios/` 與 `android/` 是 Expo 生成且不提交的專案。持久的原生設定應修改 `app.config.ts` 或 config plugin，再重新生成。參考 [Expo 原生專案生成說明](https://docs.expo.dev/workflow/continuous-native-generation/)。

`expo-build-properties` 已啟用 `ios.enableSceneSupport`，讓生成專案採用 iOS scene lifecycle，支援 Xcode 27／iOS 27。變更後須重新生成與編譯，參考 [Expo scene lifecycle 說明](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md)。

## 開發

需要 Node.js 22+ 與 Yarn Classic。Android 需要 Android Studio／SDK 與 Java 21；iOS 需要 macOS、Xcode 與 CocoaPods。SDK 57 目前原生預設為 Android API 24+、iOS 16.4+。

```bash
git clone https://github.com/CK-APP-Org/CK_app.git
cd CK_app
yarn install --frozen-lockfile
cp .env.example .env.local
```

依 `.env.example` 設定後，從 repo 根目錄執行：

```bash
yarn android       # 生成／編譯並啟動 Android
yarn ios           # 生成／編譯並啟動 iOS
yarn start         # 啟動 Metro，供已安裝的開發版本使用
```

原生依賴或 App 設定改動後，可執行 `npx expo prebuild --clean` 重新生成；這會覆寫生成資料夾中的手動變更。地圖與原生控制項須在原生 App 驗證。

| 環境變數                           | 用途                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `METRO_API_USER`、`METRO_API_PASS` | 北捷 API 帳密，向維護者索取                                               |
| `GOOGLE_MAPS_API_KEY`              | Android Maps SDK 金鑰；未設定時顯示提示，仍可使用餐廳／站點列表，iOS 使用 Apple Maps |
| `APP_VERSION`                      | 選填；覆寫 `package.json` 版本，CI 由 tag／套件版本設定                   |
| `BUILD_NUMBER`                     | 選填；本機預設 `1`，CI 使用 workflow run number                           |

`.env.local` 不提交。北捷帳密與 Maps 金鑰會隨 App 打包，不能視為伺服器端秘密；若需保護帳密，必須另建後端。

## 驗證

```bash
yarn typecheck
yarn test --runInBand
yarn lint
```

Jest 檢查日期、課表、行事曆、營業時間、RSS 與交通資料等純邏輯，以及 UI 元件庫的純函式。發布前也要以 `npx expo export --platform ios` 與 `--platform android` 確認 Hermes bundle 可建置。測試不取代原生操作驗證：請確認雙平台的輸入、分頁、sheet、地圖、離線快取與 App 重啟後的資料保存；原生 UI 改版尚待實機確認的項目列在 [docs/native-rewrite-progress.md](docs/native-rewrite-progress.md)。

## 發版與簽署

[Android workflow](.github/workflows/build_android.yml) 與 [iOS workflow](.github/workflows/build_ios.yml) 在推送 `vX.Y.Z` tag 或手動執行時，會先跑 lint／型別／測試，再生成原生專案並建置。**兩種方式都會上傳到 Google Play internal 或 TestFlight**；tag 另會附加檔案到 GitHub Release。一般分支 push 與 `[deploy]` commit 前綴不會觸發這兩個 workflow。

Tag 版本必須是數字型 `major.minor.patch`；手動執行採 `package.json` 版本。`BUILD_NUMBER` 使用各 workflow 的 run number，維護者須確認高於既有商店 build。App 身分維持 `org.capacitor.quasar.ckapp`。

Android 由 Gradle 使用既有 `PLAY_SIGNING_KEY`、`PLAY_SIGNING_KEY_ALIAS`、`PLAY_SIGNING_KEY_STORE_PASSWORD`、`PLAY_SIGNING_KEY_PASSWORD` 簽署 APK／AAB；`SERVICE_ACCOUNT_JSON` 負責 Play 上傳。iOS 使用 `BUILD_CERTIFICATE_BASE64`、`P12_PASSWORD`、`BUILD_PROVISION_PROFILE_BASE64`、`KEYCHAIN_PASSWORD`，保留 `Github Actions` profile 與 team `FJX3SGU9AL`。TestFlight 使用既有 `APPSTORE_API_PRIVATE_KEY` secret、`APPSTORE_ISSUER_ID` 與 `APPSTORE_API_KEY_ID` variables。建置也需要前述 API 設定。原生簽署流程可參考 [Expo release build 文件](https://docs.expo.dev/guides/local-app-production/)。

## 發布更新前必須完成的項目

**舊版資料匯入需要實機驗證。** 新版 Zustand 使用 Expo SQLite，與舊版 Capacitor WebView 的 localStorage 分開。`src/features/legacy-import` 會在首次啟動時以隱藏 WebView 讀取舊版的待辦、活動、課表修改、班級、最愛、釘選、追蹤車站與設定，轉換後合併到新版（不覆蓋新版已建立的資料），詳見 [docs/native-rewrite-progress.md](docs/native-rewrite-progress.md)。正式提供既有使用者更新前，必須在 Android 與 iOS 上以實際的舊版（例如 3.4.0）安裝、建立資料後升級，確認資料完整匯入。

網路來源首次讀取失敗且沒有快取時，功能會顯示錯誤／空白狀態。商店簽署、舊版資料匯入與雙平台實機操作仍需要完整發布驗證。

## 貢獻與聯絡

請先閱讀 [貢獻指南](CONTRIBUTING.md)。官方 Gmail：ckappofficial@gmail.com；[Instagram](https://www.instagram.com/ckappofficial/)；[官方網站](https://ckapp-tw.web.app/)。
