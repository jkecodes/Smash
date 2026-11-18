export type StageId = 'battlefield' | 'destination' | 'cyberpunk' | 'skyruins'

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
  battlefield: {
    id: 'battlefield',
    half: { x: 9, y: 0.5, z: 2.5 },
    blast: { x: 24, minY: -14, maxY: 26 },
    ledgeX: 9,
    spawnX: { p1: -4, p2: 4 },
    platforms: [
      { x: -4.8, y: 2.3, w: 3.6 },
      { x: 4.8, y: 2.3, w: 3.6 },
      { x: 0, y: 4.6, w: 3.6 },
    ],
    theme: {
      name: '浮空戰場',
      subtitle: 'Battlefield',
      tag: '經典 3 層板',
      desc: '左右對稱三層板，考驗立體走位與制空權的經典競技場。',
      bg: '#0b1020',
      fog: '#0b1020',
      ambientColor: '#8ca0d0',
      ambientIntensity: 0.7,
      dirLightColor: '#ffffff',
      dirLightIntensity: 1.6,
      dirLightPos: [8, 20, 14],
      mainColor: '#2b3350',
      surfaceColor: '#3a4570',
      edgeColor: '#ffe066',
      gridColor1: '#243055',
      gridColor2: '#1a2140',
      platColor: '#3a4a7e',
      platEdgeColor: '#8fc0ff',
      accentColor: '#4d94ff',
    },
  },
  destination: {
    id: 'destination',
    half: { x: 10.5, y: 0.6, z: 2.5 },
    blast: { x: 26, minY: -14, maxY: 26 },
    ledgeX: 10.5,
    spawnX: { p1: -5, p2: 5 },
    platforms: [],
    theme: {
      name: '終點星雲',
      subtitle: 'Final Destination',
      tag: '純平面無層板',
      desc: '沒有任何穿透層板！講究純粹立回、地面攻防與絕對實力對決。',
      bg: '#12081d',
      fog: '#12081d',
      ambientColor: '#b084cc',
      ambientIntensity: 0.8,
      dirLightColor: '#ffe6f7',
      dirLightIntensity: 1.7,
      dirLightPos: [0, 22, 12],
      mainColor: '#221430',
      surfaceColor: '#3d1f56',
      edgeColor: '#ff4d94',
      gridColor1: '#4a154b',
      gridColor2: '#200726',
      platColor: '#4f2468',
      platEdgeColor: '#e066ff',
      accentColor: '#ff2a85',
    },
  },
  cyberpunk: {
    id: 'cyberpunk',
    half: { x: 8, y: 0.5, z: 2.5 },
    blast: { x: 22, minY: -13, maxY: 25 },
    ledgeX: 8,
    spawnX: { p1: -3.5, p2: 3.5 },
    platforms: [
      { x: 0, y: 3.3, w: 5.0, color: '#16333c', edgeColor: '#00ffee', move: { ampX: 2.2, speed: 1.1 } },
      { x: -5.8, y: 2.1, w: 2.6, color: '#381630', edgeColor: '#ff00aa', move: { ampY: 0.65, speed: 1.6, phase: 0 } },
      { x: 5.8, y: 2.1, w: 2.6, color: '#381630', edgeColor: '#ff00aa', move: { ampY: 0.65, speed: 1.6, phase: Math.PI } },
    ],
    theme: {
      name: '賽博天台',
      subtitle: 'Cyber Rooftop',
      tag: '動態巡弋浮板',
      desc: '中央高台左右巡弋、兩側懸空浮板上下升降，充滿立體動感。',
      bg: '#050f14',
      fog: '#050f14',
      ambientColor: '#4da6aa',
      ambientIntensity: 0.75,
      dirLightColor: '#aafff4',
      dirLightIntensity: 1.8,
      dirLightPos: [10, 18, 12],
      mainColor: '#101d24',
      surfaceColor: '#18303b',
      edgeColor: '#00ffee',
      gridColor1: '#0d3d47',
      gridColor2: '#051b20',
      platColor: '#193945',
      platEdgeColor: '#00ffee',
      accentColor: '#ff0080',
    },
  },
  skyruins: {
    id: 'skyruins',
    half: { x: 8.5, y: 0.5, z: 2.5 },
    blast: { x: 24, minY: -14, maxY: 26 },
    ledgeX: 8.5,
    spawnX: { p1: -4, p2: 4 },
    platforms: [
      { x: -4.2, y: 2.0, w: 4.0, color: '#443c33', edgeColor: '#ffd76a' },
      { x: 3.8, y: 3.8, w: 4.2, color: '#443c33', edgeColor: '#ffd76a' },
    ],
    theme: {
      name: '天空聖域',
      subtitle: 'Floating Shrine',
      tag: '非對稱雙階梯',
      desc: '打破左右對稱的雙層錯落平台，具備豐富的高低差立體戰術。',
      bg: '#141720',
      fog: '#141720',
      ambientColor: '#d6c8aa',
      ambientIntensity: 0.85,
      dirLightColor: '#fff1d6',
      dirLightIntensity: 1.8,
      dirLightPos: [12, 22, 10],
      mainColor: '#36312a',
      surfaceColor: '#4f483c',
      edgeColor: '#ffbb33',
      gridColor1: '#4a4030',
      gridColor2: '#1e1a14',
      platColor: '#3d362c',
      platEdgeColor: '#ffd76a',
      accentColor: '#ffcc00',
    },
  },
}

export const STAGE_IDS = Object.keys(STAGES) as StageId[]
