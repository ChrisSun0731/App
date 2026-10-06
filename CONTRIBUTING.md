# 貢獻指南

**語言 / Language：** 中文（本頁）｜[English](CONTRIBUTING.en.md)

先閱讀 [README](README.md) 了解 React Native 架構、設定與目前發布限制。

## 本機開發

使用 Node.js 22+ 與 Yarn Classic，從 repo 根目錄執行：

```bash
yarn install --frozen-lockfile
cp .env.example .env.local
yarn android
# 在 macOS 上也可執行 yarn ios
```

修改依賴或 App 原生設定後，以 `npx expo prebuild --clean` 重新生成原生專案。`ios/` 與 `android/` 不提交；需要長期保留的變更應寫入 `app.config.ts` 或 config plugin。

## 修改功能

1. 在 `src/features/<feature>/` 維護畫面、hooks 與純邏輯；共用 UI 放在 `src/components/`。
2. 路由放在 `src/app/`。功能入口由 `src/features/registry.ts` 登記，畫面對應由 `src/features/screens.tsx` 管理。
3. 需要工具列分頁的功能須提供 `src/app/(tabs)/<feature>/` 路由。首頁以外的分頁最多 4 個；未加入的功能仍從 `/feature/[id]` 開啟。
4. 持久狀態使用 `src/store/` 的 Zustand store 與 `src/lib/storage.ts`。不要在畫面中直接改動陣列；使用 store action。
5. Android／iOS 互動使用既有 Material 3／SwiftUI 控制項，並維持深色模式、可讀文字與無障礙標籤。

日期鍵使用當地 `YYYY-MM-DD`，透過 `src/lib/dates.ts` 處理；不要以 `toISOString()` 產生日曆日期或菜單週一。遠端資料應有驗證器、錯誤狀態與快取策略；輪詢須在不需要時暫停。

## 修改資料

| 資料 | 修改位置 |
| --- | --- |
| 班級課表 | Data repo 的 `schedules/gaoyi_schedules.json`、`gaoer_schedules.json`、`gaosan_schedules.json` |
| 餐廳 | Data repo 的 `restaurantData.json`，含名稱、座標與營業時間 |
| 校方行事曆 | Data repo 的 `calendar/<學期>.json`，目前為 `calendar/115-1.json`；來源與格式以 `src/features/todo/school-calendar.ts` 為準 |
| 菜單 | Data repo 的 `menus/<週一日期>_<1至5>.png` |
| 北捷靜態站點／路線 | `src/features/transport/metro-lines.ts` |

資料來源是 [CKApp-Dev/Data](https://github.com/CKApp-Dev/Data)。更新資料時先對照功能內的驗證器；`tools/` 的歷史轉檔工具不保證符合目前格式，使用前須檢查輸出。

## 檢查與 PR

在新分支開發並發 PR。提交前執行：

```bash
yarn typecheck
yarn test --runInBand
yarn lint
```

與日期、資料解析或狀態規則有關的變更，應以有意義的回歸測試覆蓋。純邏輯測試放在對應功能附近的 `*.test.ts`；使用 `@jest/globals`，目前 Jest 不需要啟動原生 UI。

在 Android 與 iOS 驗證受影響流程，特別是原生輸入、sheet／dialog、工具列、地圖、離線與重啟後持久資料。PR 描述請寫清楚問題、結果、驗證方式及尚未測試的限制。

## 版本與發布

本機版本來自 `package.json`。`app.config.ts` 接受 `APP_VERSION` 與 `BUILD_NUMBER`；不要手動改生成的 Gradle 或 Xcode 版本。

`vX.Y.Z` tag 與手動執行 build workflow 都會建置、簽署並上傳至 Google Play internal／TestFlight。Tag 必須是數字型 `major.minor.patch`；手動版本來自套件版本，build number 是 workflow run number。一般分支 push 或 `[deploy]` commit 前綴不會觸發發布。

簽署帳密／金鑰存放 GitHub Secrets；本機 API 設定放 `.env.local`。不要提交私鑰、provisioning profile 或真正的 API 帳密。

**舊版 Capacitor WebView localStorage 由 `src/features/legacy-import` 在首次啟動時匯入。** 修改 store 結構或預設值時，請一併更新該資料夾的轉換／合併邏輯與測試。發布前必須在 Android 與 iOS 上以實際舊版升級驗證匯入結果。

## 聯絡

ckappofficial@gmail.com｜[Instagram](https://www.instagram.com/ckappofficial/)｜[官方網站](https://ckapp-tw.web.app/)
