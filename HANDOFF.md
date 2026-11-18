# smash!!! 專案交接文件

> 給接手的 AI／開發者。這是一款 Smash Bros 風格的 **2.5D 競技場對戰遊戲**。
> 使用者慣用繁體中文溝通。

## 1. 技術與啟動
- React 18 + TypeScript + Vite + Tailwind + React Three Fiber 8 + @react-three/rapier 1.5 + Zustand
- 啟動：雙擊 `開始遊戲.bat`（會檢查 node、必要時 npm install、再 `npm run dev -- --open`），或 `npm run dev`
- 型別檢查：`npx tsc --noEmit`（目前無錯誤）
- 注意：Bash 工具使用 heredoc 寫大檔案曾失敗，建議用編輯器／檔案寫入工具。

## 2. 架構總覽（2.5D）
3D 渲染，但物理只用 X/Y，Z 軸鎖死（`enabledTranslations([true,true,false])`），側面自動取景攝影機。

| 檔案 | 職責 |
|---|---|
| `src/game/constants.ts` | 重力、場地尺寸、爆區、速度、跳躍次數、冷卻倍率（0.5）、抓邊參數、3 個單向平台 |
| `src/game/types.ts` | FSM 狀態、FighterState、SkillDef、Projectile、CharacterDef 等型別 |
| `src/game/store.ts` | Zustand：phase、選角、`cpu`（p1/p2 等級 0–3）、paused、`fighters`（每幀可變狀態）、約 12Hz 的 `ui` 快照 |
| `src/game/runtime.ts` | 剛體、投射物、力場、特效、大招球、debug 球；有版本計數 |
| `src/game/input.ts` | 鍵盤＋手把（Xbox/PS/Joy-Con）、死區、震動、自訂按鍵、`readMenuPad`、`pollPause` |
| `src/game/sim.ts` | **主模擬**：`stepSimulation`、FSM、技能生命週期、命中結算、平台、抓邊、閃避、大招球、投射物、力場 |
| `src/game/ai.ts` | 電腦玩家（產生與人類相同的 `InputFrame`） |
| `src/game/audio.ts` | Web Audio 即時合成音效（無音檔）；`sfx(name, intensity)`；M 鍵靜音 |
| `src/game/characters.ts` | 7 名角色與 loadout |
| `src/game/stages.ts` | 4 個對戰場地定義（尺寸、爆區、層板佈局、視覺主題配色、環境光與霧氣） |
| `src/game/skills/` | `registry.ts`、`baseSkills.ts`、`novaSkills.ts`、`kenneySkills.ts`、`directionalSkills.ts`（tilt／方向特招／蓄力重擊） |
| `src/components/World.tsx` | 場景、平台、SimLoop、FighterView（方塊後備＋GLB、護盾、光環、頭上標記）、CameraRig |
| `src/components/ModelAvatar.tsx` | GLB 載入、自動縮放、動畫 clip 對應、程序化姿勢後備 |
| `src/components/Effects.tsx` | 斬擊、環、爆發、光束、投射物、力場、大招球、判定框除錯 |
| `src/components/HUD.tsx` | 傷害％、殘機、能量、護盾、選單、CPU 選擇、手把設定、暫停、結算 |
| `public/models/` | Kenney Mini Characters 的 GLB（knight/robot/alien/soldier/zombie）＋ `Textures/colormap.png` |

### 關鍵設計
- **資料驅動技能**：`SkillDef` 含 startup/active/recovery、hitbox、knockback、投射物、hooks（onStart/onActive/onTick/onHit/onEnd）。hook 透過 `SkillContext`（setVelocity、teleport、spawnZone、spawnProjectile、fx、shake、endActive…）操作，不直接碰模擬內部。
- **loadout 鍵**：`attack`、`skill1`、`skill2`、`ult`、`smash`，加方向後綴 `:side` / `:up` / `:down`（左右共用 side）。沒有該方向就退回原地版本。
- **受擊與擊退**：傷害 0–999％，擊退速度 = `(base + scaling × damage/100) × kbMult`。
- **同幀命中佇列**：`queueHit` → `resolveHits`，雙方互打時傷害差 ≥ 9％ 強者壓過（clash）。
- **碰撞群組**：場地 group 0、角色 group 1、平台 groups 2/3/4（`interactionGroups`）；地面偵測用 `castRay` 搭配每個角色當前的碰撞遮罩。平台穿透用 hysteresis 避免高速穿過。
- **FSM**：IDLE/RUN/JUMP/SHIELD/DODGE/LEDGE/ATTACK_STARTUP/ATTACK_ACTIVE/ATTACK_RECOVERY/HITSTUN 等，由 `setFsm` 切換。
- **暫停**：`stepSimulation` 在 paused 時提早 return，且 `<Physics paused>`。

## 3. 目前已完成的功能
- 7 角色：cube、nova（原創）、knight、robot、alien、soldier、zombie；每人皆有 普攻／特招／技能2 的 上、下、左右方向版本，以及蓄力重擊、大招。
- 蓄力重擊：普攻＋特招同按（僅近戰）。持有大招資格時按「特招」直接放大招。
- 大招球（Smash Ball）：打破後取得大招資格。
- 抓邊（ledge grab）、一次空中跳躍、空中上＋特招每次滯空只能用一次。
- 3 個單向平台，可跳穿，搖桿往下推可穿下。
- 防禦／完美防禦（剛按下 140ms 內）／翻滾／原地閃避／空中閃避。
- CPU 對手 Lv1–3，選單可為 P1/P2 分別設定。
- 技能冷卻減半（`COOLDOWN_SCALE`）。
- 手把支援：A(下)=特招、B(右)=普攻、X/Y 跳、右搖桿=技能2、RT/R3 大招、LB/RB/LT 防禦、Start 暫停。
- 玩家頭上標記（P1 紅／P2 藍，CPU 會加註 "CPU"）。
- 4 個獨特對戰場地（選單即時預覽切換，無倒數計時限制）：
  - **浮空戰場（Battlefield）**：經典左右對稱 3 層板對稱競技場。
  - **終點星雲（Final Destination）**：零層板純平面死鬥場，純立回走位，深紫星雲黑曜石主題。
  - **賽博天台（Cyber Rooftop）**：中央高台水平巡弋＋兩側浮板垂直升降，站在動態層板上角色會同步跟隨位移。
  - **天空聖域（Floating Shrine）**：非對稱雙階梯神殿，古代浮石、大理石與暖陽主題。
- 物理與 AI 自動適應各場地：層板穿透碰撞組動態裝卸、場地邊緣抓邊（Ledge Grab）座標自適應、大招球巡弋邊界自適應、AI 回場邊界自適應。
- **戰鬥打擊感與特效強化**：
  - 重擊命中頓幀震顫（Hitstop Jitter）與高擊退震波環。
  - 高速擊飛煙塵尾跡（Knockback Trail）。
  - 出界擊墜爆發光柱（KO Blast Pillar & Shockwave）。
  - 即時連段提示（`🔥 N HIT COMBO!`）與結算畫面「對戰統計戰報」（擊墜數、輸出傷害、最高連段、完美防禦）。
- **音效、程序化 BGM 與音量**：全部 Web Audio 合成（音效＋大廳 Synthwave BGM＋對戰熱血 BGM，大招/殘機危急時自動升階）；畫面右上角常駐 BGM 開關（`B` 鍵）、總靜音開關（`M` 鍵）與音量滑桿。
- **大廳選單簡潔化**：移除原先堆疊於大廳下方的多段文字，改以緊湊膠囊按鈕「📖 操作指南 & 按鍵說明」彈窗整合雙人鍵盤、手把按鍵、進階戰鬥技巧與快捷鍵。
- GLB 模型匯入：選單可拖放自己的 .glb（使用者之後打算用 Tripo AI 生成角色）。
- 最近調整（尚未實機確認手感）：
  - 大招球更難打：hp 7、半徑 0.6、移動更快、被打後 450ms 無敵、存在 20 秒（`sim.ts` 的 `updateBall`／`hitBallIfOverlap`）。
  - 角色**視覺**放大 1.4 倍（`World.tsx` 的 `CHAR_SCALE`），**碰撞體仍是 1×1×1**，招式射程、平台高度都沿用舊數值。

## 4. 操作
- P1：WASD 移動、Space/W 跳、J 普攻、K 特招(skill1)、L 技能2、I 大招、LShift 防禦
- P2：方向鍵、Enter/↑ 跳、`.` 普攻、`/` 特招、`'` 技能2、`;` 大招、RShift 防禦
- 通用：Esc/P 暫停、H 判定框除錯、U 給予大招資格、M 靜音

## 5. 驗證方式（無瀏覽器時）
曾用無頭測試：寫暫時的 `_t.mjs`，以 `npx tsx` 執行；使用 `rapier3d-compat`、`globalThis.window = new EventTarget()`、假的 localStorage，以帶有 `.code` 的 `Event` 模擬按鍵，測完刪除。曾以此驗證各方向技能、CPU 對 CPU 整場、平台、閃避、暫停、跳躍與上特招限制。
**視覺與手感沒有自動化驗證，一律需使用者在瀏覽器確認。**

## 6. 已知議題／注意事項
- 角色視覺放大但碰撞體未放大：可能有輕微穿牆感。若使用者要求，需一併放大碰撞體並重調招式射程、平台間距、抓邊位置。
- 方塊後備（cube fallback）曾出現「角色偶爾變方塊」的問題，已用 `readyUrl` ref 比對修正，但使用者尚未回報是否解決。
- 數值（傷害、擊退、冷卻、AI 強度、音量）皆憑手感調整，使用者可能繼續要求微調。
- Kenney GLB 內部引用外部 `Textures/colormap.png`，移動模型檔時必須一併帶走該貼圖。
- （已解決）land/zone/charge/warp 音效已接上；HUD 音量滑桿與靜音已加上；Git 已初始化；4 場地已實作完成。

## 7. 可能的下一步
1. 等使用者回報各場地遊玩手感、大招球難度、角色大小是否合適。
2. 視需求把碰撞體與角色視覺比例統一。
3. 使用者的 Tripo AI 自製角色：以 GLB 放入 `public/models/` 或拖放匯入，並在 `characters.ts` 新增角色與 `clips` 對應；技能可沿用 `registry.ts` 註冊流程。
4. 加入 Web Audio 背景音樂（BGM）。
5. 更多角色或機制擴充。
