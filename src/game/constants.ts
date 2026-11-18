// ---- 2.5D：所有戰鬥發生在 X(水平) / Y(垂直) 平面，Z 軸鎖定為 0 ----
export const GRAVITY = -34
export const STAGE_HALF = { x: 9, y: 0.5, z: 2.5 } // 平台頂面 y=0
export const BLAST = { x: 24, minY: -14, maxY: 26 }
export const RUN_SPEED = 8.5
export const AIR_SPEED = 7.5
export const GROUND_ACCEL = 70
export const AIR_ACCEL = 28
export const JUMP_VEL = 14.5
export const MAX_JUMPS = 2
export const MAX_DAMAGE = 999
export const START_STOCKS = 3
/** 全部招式冷卻的倍率（0.38 = 冷卻大幅縮短；招式資料裡的 cooldownMs 維持原值） */
export const COOLDOWN_SCALE = 0.38
export const ENERGY_MAX = 100
export const ENERGY_REGEN = 6 // /sec
export const SHIELD_MAX = 100
export const HALF = 0.5 // 方塊角色半邊長
/** 穿透式層板：頂面高度 y、中心 x、寬度 w。可從下方跳穿，站在上面，向下推可穿下去。 */
export const PLATFORMS = [
  { x: -4.8, y: 2.3, w: 3.6 },
  { x: 4.8, y: 2.3, w: 3.6 },
  { x: 0, y: 4.6, w: 3.6 },
] as const
export const PLATFORM_THICKNESS = 0.25
export const DROP_THROUGH_MS = 300
// 抓邊
export const LEDGE_X = STAGE_HALF.x
export const LEDGE_HANG_MS = 4000
export const LEDGE_REGRAB_MS = 800
export const SPAWN_X = { p1: -4, p2: 4 } as const
