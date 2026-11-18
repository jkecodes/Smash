# smash!!! 專案交接文件

> 給接手的 AI／開發者。這是一款 Smash Bros 風格的 **2.5D 競技場對戰遊戲**。
> 使用者慣用繁體中文溝通。

## 1. 技術與啟動
- React 18 + TypeScript + Vite + Tailwind + React Three Fiber 8 + @react-three/rapier 1.5 + Zustand
- 啟動：雙擊 `開始遊戲.bat`（會檢查 node、必要時 npm install、再 `npm run dev -- --open`），或 `npm run dev`
- 型別檢查與建置：`npm run build`（`tsc --noEmit && vite build`）

## 2. 架構總覽（2.5D）
3D 渲染，但物理只用 X/Y，Z 軸鎖死（`enabledTranslations([true,true,false])`），側面自動取景攝影機。

| 檔案 | 職責 |
|---|---|
| `src/game/constants.ts` | 重力、場地尺寸、爆區、速度、跳躍次數、冷卻倍率（0.5）、抓邊參數、平台碰撞厚度 |
| `src/game/types.ts` | 8 人 `FighterId` (`p1`–`p8`)、`PLAYER_COLORS`、11 名角色 `CharacterId`、FSM 狀態、`CharacterDef`（含 `guide`）與 `FighterState`（含 `lastHitBy`/`jumpBufferMs`/`coyoteMs`） |
| `src/game/store.ts` | Zustand：phase、`playerCount`（預設 2、支援 2–8 人 `setPlayerCount`）、選角、`stageId`（預設 `reimu`）、`cpu`（`p1`–`p8` 等級 0–3）、`fighters` 與 `ui` |
| `src/game/runtime.ts` | 8 人剛體、投射物、力場、特效、大招球、debug 球；有版本計數 |
| `src/game/input.ts` | 鍵盤（`justPressedKeys` 瞬時消耗修復跑步跳漏幀）＋手把（Xbox/PS/Joy-Con；LT/RT 與 LB/RB 皆觸發防禦；類比扳機支援）、`readMenuPad`、`pollPause` |
| `src/game/sim.ts` | **主模擬**：`stepSimulation`、3 射線地面判定、土狼時間（110ms）、跳躍緩衝（150ms）、僅限地面施放且蓄滿按住待放重擊、5 下打破大招球、2–8 人均勻出生與擊墜判斷 |
| `src/game/ai.ts` | 支援 2–8 人最近活躍對手鎖定與地形回場 AI |
| `src/game/audio.ts` | Web Audio 即時合成音效＋大廳 Synthwave／對戰熱血 BGM（危機自動升階）；`M` 總靜音、`B` 切換 BGM |
| `src/game/characters.ts` | 11 名角色（保留 `tetro`、8 位經典街機角色與東方 Project 博麗靈夢／霧雨魔理沙；已移除 `cube`–`zombie`），含 `trait`、`guide` 教學步驟與完整 loadout |
| `src/game/stages.ts` | 11 個角色專屬主題場地（每位角色皆有對應主場與特色地形層板） |
| `src/game/skills/` | `registry.ts`、`tetroSkills.ts`（8 人份俄羅斯方塊矩陣與消行轟炸）、`retroSkills.ts`（10 名新角色完整技能套件）、`directionalSkills.ts` |
| `src/components/World.tsx` | 場景、平台、SimLoop、2–8 人 `Fighters`／`CameraRig`／`PlayerMarker`、`RetroAvatar` 與 `TetroAvatar` |
| `src/components/RetroAvatar.tsx` | 10 名街機與東方角色專屬 3D 程序化動畫模型 |
| `src/components/StageArt.tsx` | 11 場地專屬 Canvas 頂面紋理、環境粒子與 3D 遠景建築演出 |
| `src/components/ModelAvatar.tsx` | GLB 載入、自動縮放、動畫 clip 對應、程序化姿勢後備 |
| `src/components/Effects.tsx` | 斬擊、環、爆發、光束、投射物、力場、大招球、判定框除錯 |
| `src/components/HUD.tsx` | 2–8 人底部 HUD 與賽後戰報、6×2 大亂鬥選角盤、人數 `－`/`＋` 切換、11 場地選擇器、`🎓 角色遊玩教學` 彈窗、暫停與手把精靈 |
| `src/components/CharacterPortrait.tsx` | 11 名角色＋隨機（`?`）專屬 SVG 頭像與 `SHORT_NAMES` |

## 3. 目前已完成的功能
- **11 名可玩角色（已移除 Tetris 之前所有初始角色 `cube`/`nova`/`knight`/`robot`/`alien`/`soldier`/`zombie`，保留 `tetro`）**：
  - `tetro`（**TETRO 方塊使**）：出招自動在背後 4×6 矩陣左側 3 欄疊塊，按特招(K)硬降觸發 1~4 行消行雷射轟炸，技能2(L)全數化為彈跳炸彈。
  - 8 位經典傳統遊戲角色：`pacman`（吃豆人）、`mario`（水管工）、`invader`（太空侵略者）、`bomber`（炸彈超人）、`snake`（貪食蛇）、`frogger`（青蛙過河）、`kong`（大金剛）、`pong`（打磚塊）。
  - 東方 Project 雙主角：`reimu`（博麗靈夢：亞空穴瞬移、夢符封印、夢想天生）與 `marisa`（霧雨魔理沙：掃帚星衝、星塵射彈、究極火花魔砲 Master Spark）。
- **11 個角色專屬地圖**：每位角色皆有專屬主題舞台（`博麗神社`、`魔法森林`、`俄羅斯矩陣`、`霓虹迷宮`、`蘑菇王國 1-1`、`太空防線`、`爆風競技場`、`貪食蛇螢幕`、`湍流大河`、`25m 鋼樑工地`、`雅達利球場`）。切換 P1 角色時會自動預覽該角色主場，亦可自由點選任何場地。
- **2–8 人大亂鬥對戰（預設 2 人）**：選單頂部可用 `－` / `＋` 按鈕即時增減參戰人數（2~8 人）；模擬、AI、攝影機、場地出生點與 HUD 戰報全面支援 8 人混戰。
- **每位角色遊玩教學彈窗（`🎓 角色遊玩教學`）**：可由選單角色卡、選單底部或暫停畫面開啟，含概述、實戰 3 步驟、推薦連段與完整招式列表。
- **大招球 5 下擊破**：場上浮動大招球改為累計命中 **5 下**（`hp: 5`）擊破取得大招資格。
- **手把與戰鬥操作優化**：
  - 手把 **Left Trigger (LT) 或 Right Trigger (RT)**（含類比軸值 > 0.25）皆可觸發防禦（LB/RB 亦可，L3/R3 或持有大招按特招可放大招）。
  - **蓄力重擊（普攻+特招同按）**：限定站在地面時才可施放；蓄滿後若持續按住不放，會維持滿蓄力待機直到玩家放開按鍵才正式揮出！
  - **修復跑步跳無反應**：`justPressedKeys` 瞬時緩衝、3 射線地面判定、110ms 土狼時間與 150ms 跳躍輸入緩衝。

## 4. 驗證方式（無瀏覽器時）
- `npm run build` 確認 TypeScript 與 Vite 打包完全通過。
- 使用暫時 `_t.mjs` 搭配 `@dimforge/rapier3d-compat` 與 `npx tsx` 驗證模擬、物理跳躍、重擊地面限制與蓄滿待放、LT/RT 防禦、大招球 5 下與 8 人戰鬥結算，測畢刪除。
