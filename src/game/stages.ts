import type { CharacterId } from './types'

export type StageId = CharacterId

export interface PlatformDef {
  x: number
  y: number
  w: number
  color?: string
  edgeColor?: string
  /** 動態移動層板設定：水平/垂直擺幅與角速度 */
  move?: { ampX?: number; ampY?: number; speed: number; phase?: number }
}

/** 計算層板在指定時間點的座標與瞬時速度 */
export function getPlatformPos(p: PlatformDef, tSec: number): { x: number; y: number; vx: number; vy: number } {
  if (!p.move) return { x: p.x, y: p.y, vx: 0, vy: 0 }
  const { ampX = 0, ampY = 0, speed, phase = 0 } = p.move
  const angle = tSec * speed + phase
  const s = Math.sin(angle)
  const c = Math.cos(angle)
  return {
    x: p.x + ampX * s,
    y: p.y + ampY * s,
    vx: ampX * speed * c,
    vy: ampY * speed * c,
  }
}

export interface StageTheme {
  name: string
  subtitle: string
  tag: string
  desc: string
  bg: string
  fog: string
  ambientColor: string
  ambientIntensity: number
  dirLightColor: string
  dirLightIntensity: number
  dirLightPos: [number, number, number]
  mainColor: string
  surfaceColor: string
  edgeColor: string
  gridColor1: string
  gridColor2: string
  platColor: string
  platEdgeColor: string
  accentColor: string
}

export interface StageDef {
  id: StageId
  half: { x: number; y: number; z: number }
  blast: { x: number; minY: number; maxY: number }
  ledgeX: number
  spawnX: { p1: number; p2: number }
  platforms: PlatformDef[]
  theme: StageTheme
}

export const STAGES: Record<StageId, StageDef> = {
  reimu: {
    id: 'reimu',
    half: { x: 9.5, y: 0.5, z: 2.5 },
    blast: { x: 25, minY: -14, maxY: 26 },
    ledgeX: 9.5,
    spawnX: { p1: -4.2, p2: 4.2 },
    platforms: [
      { x: -4.8, y: 2.3, w: 3.6, color: '#991b1b', edgeColor: '#ffd76a' },
      { x: 4.8, y: 2.3, w: 3.6, color: '#991b1b', edgeColor: '#ffd76a' },
      { x: 0, y: 4.5, w: 3.8, color: '#7f1d1d', edgeColor: '#fef3c7' },
    ],
    theme: {
      name: '博麗神社',
      subtitle: 'Hakurei Shrine',
      tag: '靈夢主場・3層鳥居',
      desc: '櫻花飛舞的幻想鄉博麗神社境內！朱紅鳥居雙側層板搭配御神籤高台，攻守平衡。',
      bg: '#1c0f1d',
      fog: '#1c0f1d',
      ambientColor: '#f5b8c8',
      ambientIntensity: 0.85,
      dirLightColor: '#fff1e6',
      dirLightIntensity: 1.75,
      dirLightPos: [10, 22, 12],
      mainColor: '#4a3538',
      surfaceColor: '#63484c',
      edgeColor: '#ef4444',
      gridColor1: '#5e2334',
      gridColor2: '#24101a',
      platColor: '#991b1b',
      platEdgeColor: '#ffd76a',
      accentColor: '#fda4af',
    },
  },
  marisa: {
    id: 'marisa',
    half: { x: 9.2, y: 0.5, z: 2.5 },
    blast: { x: 25, minY: -14, maxY: 26 },
    ledgeX: 9.2,
    spawnX: { p1: -4, p2: 4 },
    platforms: [
      { x: -5.2, y: 2.1, w: 3.4, color: '#4c1d95', edgeColor: '#facc15' },
      { x: 5.0, y: 3.1, w: 3.2, color: '#5b21b6', edgeColor: '#38bdf8' },
      { x: 0, y: 4.6, w: 3.2, color: '#1e1b4b', edgeColor: '#fde047', move: { ampX: 2.2, speed: 1.0 } },
    ],
    theme: {
      name: '魔法森林',
      subtitle: 'Forest of Magic',
      tag: '魔理沙主場・魔導書浮板',
      desc: '霧雨魔法店前的夜星森林！非對稱發光蘑菇台與左右巡弋的浮空魔導書。',
      bg: '#0c0f24',
      fog: '#0c0f24',
      ambientColor: '#9385d8',
      ambientIntensity: 0.8,
      dirLightColor: '#fef9c3',
      dirLightIntensity: 1.75,
      dirLightPos: [-10, 20, 14],
      mainColor: '#1e1b38',
      surfaceColor: '#2e2954',
      edgeColor: '#facc15',
      gridColor1: '#3b2d7a',
      gridColor2: '#13122b',
      platColor: '#4c1d95',
      platEdgeColor: '#fde047',
      accentColor: '#a855f7',
    },
  },
  tetro: {
    id: 'tetro',
    half: { x: 9.0, y: 0.5, z: 2.5 },
    blast: { x: 24, minY: -14, maxY: 26 },
    ledgeX: 9.0,
    spawnX: { p1: -4, p2: 4 },
    platforms: [
      { x: -4.8, y: 2.0, w: 3.2, color: '#0f766e', edgeColor: '#00f0f0' },
      { x: 4.8, y: 2.0, w: 3.2, color: '#b45309', edgeColor: '#ffaa00' },
      { x: 0, y: 4.1, w: 4.2, color: '#581c87', edgeColor: '#e879f9', move: { ampY: 0.75, speed: 1.35 } },
    ],
    theme: {
      name: '俄羅斯矩陣',
      subtitle: 'Tetris Matrix',
      tag: '方塊使主場・升降 I 型塊',
      desc: '七彩方塊不斷從天而降的電子矩陣！中央紫色 I 型長條層板會隨節奏上下升降。',
      bg: '#070b18',
      fog: '#070b18',
      ambientColor: '#67e8f9',
      ambientIntensity: 0.78,
      dirLightColor: '#ffffff',
      dirLightIntensity: 1.75,
      dirLightPos: [6, 20, 14],
      mainColor: '#111827',
      surfaceColor: '#1e293b',
      edgeColor: '#00f0f0',
      gridColor1: '#155e75',
      gridColor2: '#09192b',
      platColor: '#0f766e',
      platEdgeColor: '#00f0f0',
      accentColor: '#e879f9',
    },
  },
  pacman: {
    id: 'pacman',
    half: { x: 10.0, y: 0.5, z: 2.5 },
    blast: { x: 25, minY: -14, maxY: 26 },
    ledgeX: 10.0,
    spawnX: { p1: -4.5, p2: 4.5 },
    platforms: [
      { x: -5.4, y: 2.0, w: 3.6, color: '#0f172a', edgeColor: '#3b82f6' },
      { x: 5.4, y: 2.0, w: 3.6, color: '#0f172a', edgeColor: '#3b82f6' },
      { x: -3.0, y: 4.2, w: 2.8, color: '#172554', edgeColor: '#fde047' },
      { x: 3.0, y: 4.2, w: 2.8, color: '#172554', edgeColor: '#fde047' },
    ],
    theme: {
      name: '霓虹迷宮',
      subtitle: 'Pac-Maze',
      tag: '吃豆人主場・4層雙迴廊',
      desc: '致敬 1980 經典街機霓虹藍牆迷宮！雙層對稱能量豆走廊搭配背後潛行的幽靈軍團。',
      bg: '#030712',
      fog: '#030712',
      ambientColor: '#60a5fa',
      ambientIntensity: 0.75,
      dirLightColor: '#fef08a',
      dirLightIntensity: 1.7,
      dirLightPos: [0, 22, 12],
      mainColor: '#090f24',
      surfaceColor: '#0f1c3f',
      edgeColor: '#3b82f6',
      gridColor1: '#1d4ed8',
      gridColor2: '#091536',
      platColor: '#0f172a',
      platEdgeColor: '#3b82f6',
      accentColor: '#ffe01b',
    },
  },
  mario: {
    id: 'mario',
    half: { x: 9.5, y: 0.5, z: 2.5 },
    blast: { x: 25, minY: -14, maxY: 26 },
    ledgeX: 9.5,
    spawnX: { p1: -4.2, p2: 4.2 },
    platforms: [
      { x: -4.8, y: 2.2, w: 3.6, color: '#9a3412', edgeColor: '#fb923c' },
      { x: 4.8, y: 2.2, w: 3.6, color: '#9a3412', edgeColor: '#fb923c' },
      { x: 0, y: 4.3, w: 2.8, color: '#ca8a04', edgeColor: '#fef08a', move: { ampY: 0.32, speed: 2.2 } },
    ],
    theme: {
      name: '蘑菇王國 1-1',
      subtitle: 'World 1-1',
      tag: '水管工主場・問號浮磚',
      desc: '紅磚、問號方塊與綠色傳送水管的經典關卡！中央金黃問號磚塊會微微上下彈跳。',
      bg: '#102447',
      fog: '#102447',
      ambientColor: '#bae6fd',
      ambientIntensity: 0.9,
      dirLightColor: '#fffbeb',
      dirLightIntensity: 1.8,
      dirLightPos: [10, 22, 12],
      mainColor: '#7c2d12',
      surfaceColor: '#16a34a',
      edgeColor: '#facc15',
      gridColor1: '#1e3a8a',
      gridColor2: '#0f172a',
      platColor: '#9a3412',
      platEdgeColor: '#fb923c',
      accentColor: '#e62325',
    },
  },
  invader: {
    id: 'invader',
    half: { x: 9.5, y: 0.5, z: 2.5 },
    blast: { x: 24, minY: -14, maxY: 26 },
    ledgeX: 9.5,
    spawnX: { p1: -4.2, p2: 4.2 },
    platforms: [
      { x: -5.2, y: 1.8, w: 2.8, color: '#14532d', edgeColor: '#4ade80' },
      { x: 0, y: 1.8, w: 2.8, color: '#14532d', edgeColor: '#4ade80' },
      { x: 5.2, y: 1.8, w: 2.8, color: '#14532d', edgeColor: '#4ade80' },
      { x: 0, y: 4.8, w: 3.0, color: '#7f1d1d', edgeColor: '#ff3366', move: { ampX: 5.2, speed: 1.1 } },
    ],
    theme: {
      name: '太空防線',
      subtitle: 'Space Bunker',
      tag: '侵略者主場・3碉堡＋飛碟',
      desc: '下層三座綠色防空像素碉堡與高空高速橫越的神秘紅色 UFO 浮板！',
      bg: '#040a07',
      fog: '#040a07',
      ambientColor: '#4ade80',
      ambientIntensity: 0.72,
      dirLightColor: '#dcfce7',
      dirLightIntensity: 1.65,
      dirLightPos: [0, 22, 14],
      mainColor: '#0b2012',
      surfaceColor: '#133a1e',
      edgeColor: '#22c55e',
      gridColor1: '#14532d',
      gridColor2: '#061a0e',
      platColor: '#14532d',
      platEdgeColor: '#4ade80',
      accentColor: '#ff3366',
    },
  },
  bomber: {
    id: 'bomber',
    half: { x: 9.5, y: 0.5, z: 2.5 },
    blast: { x: 25, minY: -14, maxY: 26 },
    ledgeX: 9.5,
    spawnX: { p1: -4, p2: 4 },
    platforms: [
      { x: -5.0, y: 2.2, w: 3.0, color: '#475569', edgeColor: '#fb923c' },
      { x: 5.0, y: 2.2, w: 3.0, color: '#475569', edgeColor: '#fb923c' },
      { x: 0, y: 4.0, w: 3.6, color: '#334155', edgeColor: '#f97316' },
    ],
    theme: {
      name: '爆風競技場',
      subtitle: 'Bomber Grid',
      tag: '炸彈人主場・棋盤石陣',
      desc: '綠色草地棋盤配灰鋼防爆柱！爆風四散的標準戰鬥石台，適合轟炸派對亂鬥。',
      bg: '#141923',
      fog: '#141923',
      ambientColor: '#fed7aa',
      ambientIntensity: 0.85,
      dirLightColor: '#fff7ed',
      dirLightIntensity: 1.75,
      dirLightPos: [10, 20, 12],
      mainColor: '#334155',
      surfaceColor: '#15803d',
      edgeColor: '#fb923c',
      gridColor1: '#475569',
      gridColor2: '#1e293b',
      platColor: '#475569',
      platEdgeColor: '#fb923c',
      accentColor: '#ec4899',
    },
  },
  snake: {
    id: 'snake',
    half: { x: 10.0, y: 0.5, z: 2.5 },
    blast: { x: 25, minY: -14, maxY: 26 },
    ledgeX: 10.0,
    spawnX: { p1: -4.5, p2: 4.5 },
    platforms: [
      { x: -3.2, y: 2.3, w: 3.4, color: '#15803d', edgeColor: '#86efac', move: { ampX: 3.2, speed: 1.0, phase: 0 } },
      { x: 3.2, y: 4.2, w: 3.4, color: '#166534', edgeColor: '#4ade80', move: { ampX: 3.2, speed: 1.0, phase: Math.PI } },
    ],
    theme: {
      name: '貪食蛇螢幕',
      subtitle: 'Nokia LCD Grid',
      tag: '貪食蛇主場・雙巡弋蛇身',
      desc: '復古像素點陣螢幕！兩條交錯水平遊走的長條蛇身浮板讓戰局隨時大洗牌。',
      bg: '#0c1910',
      fog: '#0c1910',
      ambientColor: '#86efac',
      ambientIntensity: 0.82,
      dirLightColor: '#ecfccb',
      dirLightIntensity: 1.7,
      dirLightPos: [6, 22, 12],
      mainColor: '#14301d',
      surfaceColor: '#214d2f',
      edgeColor: '#4ade80',
      gridColor1: '#166534',
      gridColor2: '#091f11',
      platColor: '#15803d',
      platEdgeColor: '#86efac',
      accentColor: '#ef4444',
    },
  },
  frogger: {
    id: 'frogger',
    half: { x: 9.5, y: 0.5, z: 2.5 },
    blast: { x: 25, minY: -14, maxY: 26 },
    ledgeX: 9.5,
    spawnX: { p1: -4.2, p2: 4.2 },
    platforms: [
      { x: -3.8, y: 2.1, w: 3.6, color: '#78350f', edgeColor: '#fbbf24', move: { ampX: 3.0, speed: 1.25, phase: 0 } },
      { x: 3.8, y: 3.7, w: 3.4, color: '#991b1b', edgeColor: '#4ade80', move: { ampX: 3.2, speed: 1.15, phase: Math.PI } },
      { x: 0, y: 5.2, w: 2.8, color: '#713f12', edgeColor: '#fde047', move: { ampX: 2.5, speed: 0.9, phase: 1.4 } },
    ],
    theme: {
      name: '湍流大河',
      subtitle: 'Frogger River',
      tag: '青蛙主場・3列漂流浮木',
      desc: '車道為底、上空則有三層交錯漂流的河道浮木與紅殼烏龜，腳步要夠穩！',
      bg: '#071521',
      fog: '#071521',
      ambientColor: '#7dd3fc',
      ambientIntensity: 0.85,
      dirLightColor: '#f0f9ff',
      dirLightIntensity: 1.75,
      dirLightPos: [8, 22, 12],
      mainColor: '#1e293b',
      surfaceColor: '#334155',
      edgeColor: '#4ade80',
      gridColor1: '#0369a1',
      gridColor2: '#082f49',
      platColor: '#78350f',
      platEdgeColor: '#fbbf24',
      accentColor: '#38bdf8',
    },
  },
  kong: {
    id: 'kong',
    half: { x: 9.5, y: 0.5, z: 2.5 },
    blast: { x: 25, minY: -14, maxY: 26 },
    ledgeX: 9.5,
    spawnX: { p1: -4.2, p2: 4.2 },
    platforms: [
      { x: -4.4, y: 1.9, w: 4.6, color: '#9d174d', edgeColor: '#f472b6' },
      { x: 2.4, y: 3.5, w: 5.0, color: '#be185d', edgeColor: '#fb7185' },
      { x: -1.8, y: 5.1, w: 4.0, color: '#db2777', edgeColor: '#facc15' },
    ],
    theme: {
      name: '25m 鋼樑工地',
      subtitle: 'Construction 25m',
      tag: '大金剛主場・3層錯落鋼樑',
      desc: '經典桃紅鉚釘鋼樑與攀爬鐵梯工地！一路沿著交錯長鋼樑搶佔最高制高點。',
      bg: '#160812',
      fog: '#160812',
      ambientColor: '#f472b6',
      ambientIntensity: 0.8,
      dirLightColor: '#ffe4e6',
      dirLightIntensity: 1.75,
      dirLightPos: [-8, 20, 14],
      mainColor: '#701a3c',
      surfaceColor: '#9d174d',
      edgeColor: '#ec4899',
      gridColor1: '#831843',
      gridColor2: '#3b0724',
      platColor: '#9d174d',
      platEdgeColor: '#f472b6',
      accentColor: '#38bdf8',
    },
  },
  pong: {
    id: 'pong',
    half: { x: 10.5, y: 0.5, z: 2.5 },
    blast: { x: 26, minY: -14, maxY: 26 },
    ledgeX: 10.5,
    spawnX: { p1: -5, p2: 5 },
    platforms: [
      { x: -6.8, y: 2.8, w: 2.2, color: '#e2e8f0', edgeColor: '#38bdf8', move: { ampY: 1.5, speed: 1.7, phase: 0 } },
      { x: 6.8, y: 2.8, w: 2.2, color: '#e2e8f0', edgeColor: '#38bdf8', move: { ampY: 1.5, speed: 1.7, phase: Math.PI } },
    ],
    theme: {
      name: '雅達利球場',
      subtitle: 'Atari Pong Court',
      tag: '打磚塊主場・左右升降球拍',
      desc: '極簡黑白虛線對決場！中央寬闊無障礙，兩端各有一塊會幫你「救回場內」的升降球拍板。',
      bg: '#05080f',
      fog: '#05080f',
      ambientColor: '#94a3b8',
      ambientIntensity: 0.85,
      dirLightColor: '#f8fafc',
      dirLightIntensity: 1.8,
      dirLightPos: [0, 22, 12],
      mainColor: '#0f172a',
      surfaceColor: '#1e293b',
      edgeColor: '#f8fafc',
      gridColor1: '#334155',
      gridColor2: '#0f172a',
      platColor: '#e2e8f0',
      platEdgeColor: '#38bdf8',
      accentColor: '#38bdf8',
    },
  },
}

export const STAGE_IDS = Object.keys(STAGES) as StageId[]
