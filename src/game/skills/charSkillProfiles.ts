import type { SkillContext, Vec3 } from '../types'

export interface CharSkillProfile {
  /** 普攻啟動／收招速度倍率（<1 更快，>1 更重） */
  speed?: number
  /** 普攻判定距離與半徑微調 */
  reach?: number
  radius?: number
  /** 普攻微位移（正值前踏、負值拉打後撤） */
  lunge?: number
  /** a2 上挑浮空比例 */
  upPop?: number
  /** 普攻命中專屬特效／機制 */
  jabTrait?: 'heal' | 'spark' | 'explode' | 'frost' | 'ink' | 'kite'
  /** 左右+特招速度與殘影顏色 */
  sideSpeed?: number
  sideColor?: string
  /** 上特招垂直升空與水平推進 */
  upRise?: number
  upVx?: number
  /** 下特招是否為向下隕石扣殺 */
  downMeteor?: boolean
  downRadius?: number
  /** 技能2 範圍／威力倍率 */
  s2Scale?: number
}

/**
 * 50 位動漫／手遊／搭檔角色一對一個別設計參數表。
 * 每位角色皆依原作定位單獨調整出招節奏、進退位移、判定、回場與特效。
 */
export const CHAR_PROFILES: Record<string, CharSkillProfile> = {
  // === 跳躍系 / 漫畫主角與宿敵 ===
  chihiro: { speed: 0.85, reach: 1.15, lunge: 3.2, jabTrait: 'ink', sideSpeed: 28, sideColor: '#ef4444', upRise: 19, downRadius: 2.4 },
  hakuri: { speed: 0.92, reach: 1.05, lunge: 2.2, jabTrait: 'spark', sideSpeed: 24, sideColor: '#38bdf8', upRise: 18.5, s2Scale: 1.2 },
  ichi: { speed: 0.95, reach: 1.0, lunge: 1.5, jabTrait: 'spark', sideSpeed: 24, sideColor: '#facc15', upRise: 19, s2Scale: 1.15 },
  desscaras: { speed: 0.9, reach: 1.15, lunge: 2.0, jabTrait: 'ink', sideSpeed: 26, sideColor: '#eab308', upRise: 19.5, downMeteor: true },
  ruri: { speed: 1.02, reach: 1.05, lunge: 1.0, jabTrait: 'spark', sideSpeed: 22, sideColor: '#34d399', upRise: 18.5, s2Scale: 1.2 },
  umi: { speed: 1.05, reach: 0.95, lunge: 1.2, jabTrait: 'heal', sideSpeed: 21, sideColor: '#fbbf24', upRise: 17.5, downRadius: 2.4 },
  nona: { speed: 0.92, reach: 1.1, lunge: -1.8, upPop: 0.58, jabTrait: 'kite', sideSpeed: 23, sideColor: '#e879f9', upRise: 19.5 },
  miramira: { speed: 0.96, reach: 1.08, lunge: -1.4, upPop: 0.55, jabTrait: 'kite', sideSpeed: 22, sideColor: '#14b8a6', upRise: 18.5, downMeteor: true },
  gojo: { speed: 0.88, reach: 1.1, lunge: 2.8, upPop: 0.52, jabTrait: 'spark', sideSpeed: 27, sideColor: '#818cf8', upRise: 20, s2Scale: 1.3 },
  sukuna: { speed: 1.04, reach: 1.25, lunge: 2.6, jabTrait: 'ink', sideSpeed: 26, sideColor: '#ef4444', upRise: 19.5, s2Scale: 1.25 },
  deku: { speed: 0.94, reach: 1.05, lunge: 3.6, upPop: 0.48, jabTrait: 'spark', sideSpeed: 28, sideColor: '#4ade80', upRise: 20.5 },
  bakugo: { speed: 0.9, reach: 1.05, lunge: 3.4, jabTrait: 'explode', sideSpeed: 29, sideColor: '#f97316', upRise: 21.5, downRadius: 2.6 },
  yodaka: { speed: 0.82, reach: 1.1, lunge: 3.8, upPop: 0.45, sideSpeed: 30, sideColor: '#38bdf8', upRise: 20 },
  hibari: { speed: 0.8, reach: 1.02, lunge: 4.0, upPop: 0.48, sideSpeed: 31, sideColor: '#94a3b8', upRise: 20.5 },
  kaoruko: { speed: 0.98, reach: 0.95, lunge: 1.0, jabTrait: 'heal', sideSpeed: 22, sideColor: '#f9a8d4', upRise: 18 },
  rintaro: { speed: 1.08, reach: 1.15, lunge: 2.5, upPop: 0.4, sideSpeed: 24, sideColor: '#fda4af', upRise: 17.5, downRadius: 2.3 },
  akira: { speed: 0.95, reach: 1.0, lunge: -1.5, upPop: 0.55, jabTrait: 'kite', sideSpeed: 23, sideColor: '#f472b6', upRise: 18.5 },
  hajime: { speed: 0.9, reach: 1.08, lunge: 3.5, upPop: 0.42, sideSpeed: 28, sideColor: '#fde047', upRise: 19.5, downMeteor: true },

  // === 偶像 / 賽馬娘 ===
  saki: { speed: 0.86, reach: 1.0, lunge: 3.0, upPop: 0.52, sideSpeed: 28, sideColor: '#fb7185', upRise: 19.5 },
  kotone: { speed: 0.88, reach: 1.0, lunge: 2.2, upPop: 0.56, sideSpeed: 27, sideColor: '#facc15', upRise: 19.5 },
  spe: { speed: 0.88, reach: 1.05, lunge: 3.4, upPop: 0.46, sideSpeed: 29, sideColor: '#c084fc', upRise: 19.5 },
  suzuka: { speed: 0.78, reach: 1.02, lunge: 4.4, upPop: 0.42, sideSpeed: 33, sideColor: '#22c55e', upRise: 20 },

  // === 米哈遊 / 庫洛 / NIKKE / SV ===
  stelle: { speed: 1.08, reach: 1.28, lunge: 2.6, upPop: 0.45, jabTrait: 'explode', sideSpeed: 24, sideColor: '#facc15', upRise: 18.5 },
  firefly: { speed: 0.96, reach: 1.22, lunge: 3.5, jabTrait: 'explode', sideSpeed: 29, sideColor: '#4ade80', upRise: 21, upVx: 6 },
  lumine: { speed: 0.9, reach: 1.08, lunge: 2.2, upPop: 0.55, jabTrait: 'spark', sideSpeed: 25, sideColor: '#5eead4', upRise: 20.5 },
  miyabi: { speed: 0.76, reach: 1.22, lunge: 3.8, jabTrait: 'frost', sideSpeed: 31, sideColor: '#22d3ee', upRise: 20 },
  ellen: { speed: 0.92, reach: 1.32, lunge: 3.0, jabTrait: 'frost', sideSpeed: 28, sideColor: '#ef4444', upRise: 19, downMeteor: true },
  rover: { speed: 0.86, reach: 1.12, lunge: 3.0, jabTrait: 'spark', sideSpeed: 27, sideColor: '#fde047', upRise: 19.5 },
  jinhsi: { speed: 0.94, reach: 1.15, lunge: 1.5, upPop: 0.6, jabTrait: 'spark', sideSpeed: 25, sideColor: '#fde047', upRise: 21, s2Scale: 1.2 },
  rapi: { speed: 0.92, reach: 1.05, lunge: -2.0, jabTrait: 'explode', sideSpeed: 23, sideColor: '#ef4444', upRise: 18.5 },
  anis: { speed: 1.0, reach: 1.08, lunge: -1.6, jabTrait: 'explode', sideSpeed: 22, sideColor: '#fb923c', upRise: 18, downRadius: 2.5 },
  hutao: { speed: 0.88, reach: 1.24, lunge: 2.8, jabTrait: 'heal', sideSpeed: 26, sideColor: '#ef4444', upRise: 19.5 },
  erika: { speed: 0.82, reach: 1.12, lunge: 3.8, upPop: 0.45, sideSpeed: 30, sideColor: '#818cf8', upRise: 19.5 },

  // === 東方 Project ===
  seija: { speed: 0.86, reach: 1.05, lunge: 2.4, upPop: 0.52, sideSpeed: 26, sideColor: '#f43f5e', upRise: 19.5 },
  youmu: { speed: 0.75, reach: 1.2, lunge: 4.0, jabTrait: 'ink', sideSpeed: 32, sideColor: '#34d399', upRise: 20.5 },

  // === 經典街機 / 任天堂 / 獨立遊戲本家與搭檔 ===
  luigi: { speed: 0.94, reach: 0.98, lunge: 2.0, upPop: 0.62, sideSpeed: 26, sideColor: '#22c55e', upRise: 22 },
  blinky: { speed: 0.88, reach: 1.05, lunge: 2.6, sideSpeed: 27, sideColor: '#ef4444', upRise: 20 },
  diddy: { speed: 0.84, reach: 1.02, lunge: 3.4, upPop: 0.5, sideSpeed: 28, sideColor: '#facc15', upRise: 21.5 },
  creeper: { speed: 1.02, reach: 1.05, lunge: 2.0, jabTrait: 'explode', sideSpeed: 25, sideColor: '#4ade80', upRise: 19, downRadius: 3.3 },
  chuck: { speed: 0.74, reach: 1.0, lunge: 4.8, upPop: 0.45, sideSpeed: 34, sideColor: '#fde047', upRise: 20.5 },
  vaus: { speed: 0.92, reach: 1.15, lunge: -1.8, sideSpeed: 25, sideColor: '#38bdf8', upRise: 19.5 },
  mino: { speed: 0.98, reach: 1.12, lunge: 2.2, jabTrait: 'spark', sideSpeed: 24, sideColor: '#a855f7', upRise: 19, downMeteor: true },
  ufo: { speed: 0.96, reach: 1.15, lunge: -1.5, jabTrait: 'spark', sideSpeed: 25, sideColor: '#4ade80', upRise: 20.5, s2Scale: 1.25 },
  blackbomber: { speed: 0.95, reach: 1.05, lunge: 2.2, jabTrait: 'explode', sideSpeed: 24, sideColor: '#ec4899', upRise: 18.5, downRadius: 2.8 },
  viper: { speed: 0.86, reach: 1.22, lunge: 3.2, jabTrait: 'ink', sideSpeed: 28, sideColor: '#84cc16', upRise: 19, s2Scale: 1.2 },
  ladyfrog: { speed: 0.84, reach: 1.38, lunge: 2.8, upPop: 0.58, sideSpeed: 27, sideColor: '#f472b6', upRise: 22.5 },
  paddle: { speed: 0.95, reach: 1.2, lunge: -1.5, sideSpeed: 25, sideColor: '#38bdf8', upRise: 19 },
  omnelle: { speed: 0.88, reach: 1.34, lunge: 2.4, jabTrait: 'heal', sideSpeed: 25, sideColor: '#f472b6', upRise: 20 },
  ducky: { speed: 0.82, reach: 1.0, lunge: 3.6, upPop: 0.54, sideSpeed: 29, sideColor: '#fde047', upRise: 21.5 },
  doh: { speed: 1.18, reach: 1.35, lunge: 1.4, jabTrait: 'explode', sideSpeed: 20, sideColor: '#a855f7', upRise: 17, downMeteor: true, downRadius: 2.8, s2Scale: 1.3 },
}

export function applyJabTraitFx(c: SkillContext, trait: CharSkillProfile['jabTrait'], pos: Vec3, color: string) {
  if (trait === 'heal') {
    c.caster.damage = Math.max(0, c.caster.damage - 1.5)
    c.fx({ kind: 'ring', pos, color: '#4ade80', ttl: 200, radius: 1.1 })
  } else if (trait === 'explode') {
    c.fx({ kind: 'burst', pos, color: '#f97316', ttl: 200, count: 10, speed: 5.5, size: 0.15 })
  } else if (trait === 'frost') {
    c.fx({ kind: 'burst', pos, color: '#bae6fd', ttl: 220, count: 10, speed: 5, size: 0.14 })
  } else if (trait === 'spark') {
    c.fx({ kind: 'burst', pos, color, ttl: 180, count: 8, speed: 5, size: 0.13 })
  } else if (trait === 'ink') {
    c.fx({ kind: 'slash', pos, yaw: Math.atan2(c.forward[0], c.forward[2]), plane: 'vertical', tilt: 0.4, color, ttl: 190, radius: 1.65 })
  }
}
