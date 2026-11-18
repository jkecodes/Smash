import { useGameStore } from './store'
import { ALL_FIGHTER_IDS, type Btn, type FighterId } from './types'

type Map_ = Record<'left' | 'right' | 'up' | 'down' | Btn, string[]>
const emptyKeyMap = (): Map_ => ({
  left: [], right: [], up: [], down: [],
  jump: [], attack: [], skill1: [], skill2: [], ult: [], shield: [],
})
const KEYMAP: Record<FighterId, Map_> = {
  p1: {
    left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
    jump: ['Space', 'KeyW'], attack: ['KeyJ'], skill1: ['KeyK'], skill2: ['KeyL'], ult: ['KeyI'], shield: ['ShiftLeft', 'KeyO'],
  },
  p2: {
    left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
    jump: ['Enter', 'ArrowUp'], attack: ['Period'], skill1: ['Slash'], skill2: ['Quote'], ult: ['Semicolon'], shield: ['ShiftRight', 'Comma'],
  },
  p3: emptyKeyMap(),
  p4: emptyKeyMap(),
  p5: emptyKeyMap(),
  p6: emptyKeyMap(),
  p7: emptyKeyMap(),
  p8: emptyKeyMap(),
}
const KEY_FALLBACK: Record<string, string> = {
  a: 'KeyA', d: 'KeyD', w: 'KeyW', s: 'KeyS',
  j: 'KeyJ', k: 'KeyK', l: 'KeyL', i: 'KeyI', o: 'KeyO',
  ' ': 'Space', enter: 'Enter',
  arrowleft: 'ArrowLeft', arrowright: 'ArrowRight', arrowup: 'ArrowUp', arrowdown: 'ArrowDown',
  '.': 'Period', '/': 'Slash', "'": 'Quote', ';': 'Semicolon', ',': 'Comma',
}
const BTNS: Btn[] = ['jump', 'attack', 'skill1', 'skill2', 'ult', 'shield']
// 手把（大亂鬥配置，W3C 標準映射：0=下 1=右 2=左 3=上）
//  A(右,1)=攻擊  B(下,0)=技能1  X/Y(3,2)=跳躍  左搖桿上推=跳躍
//  右搖桿(任一方向)=技能2（按住蓄力）  L3/R3(10,11)=大招  LB/RB/LT/RT(4,5,6,7)=防禦
const PAD_BTN: Record<Btn, number[]> = { jump: [2, 3], attack: [1], skill1: [0], skill2: [], ult: [10, 11], shield: [4, 5, 6, 7] }
const DEADZONE = 0.22

const keys = new Set<string>()
const justPressedKeys = new Set<string>()
export const debugKeys = { toggle: false, giveUlt: false, pause: false }
if (typeof window !== 'undefined') {
  const prevent = new Set(Object.values(KEYMAP).flatMap((m) => Object.values(m).flat()))
  const resolveCode = (e: KeyboardEvent): string => {
    if (e.code) return e.code
    if (e.key === 'Shift') return e.location === 2 ? 'ShiftRight' : 'ShiftLeft'
    return KEY_FALLBACK[(e.key ?? '').toLowerCase()] ?? ''
  }
  window.addEventListener('keydown', (e) => {
    const code = resolveCode(e)
    if (prevent.has(code) || e.key === 'Shift') e.preventDefault()
    if ((code === 'Escape' || code === 'KeyP') && !e.repeat) debugKeys.pause = true
    if (code === 'KeyH' && !e.repeat) debugKeys.toggle = true
    if (code === 'KeyU' && !e.repeat) debugKeys.giveUlt = true // 測試用：雙方立即獲得大招
    if (code) {
      keys.add(code)
      if (!e.repeat) justPressedKeys.add(code)
    }
    if (e.key === 'Shift') {
      const sCode = e.location === 2 ? 'ShiftRight' : 'ShiftLeft'
      keys.add(sCode)
      if (!e.repeat) justPressedKeys.add(sCode)
    }
  })
  window.addEventListener('keyup', (e) => {
    const code = resolveCode(e)
    if (code) keys.delete(code)
    if (e.key === 'Shift') {
      keys.delete('ShiftLeft')
      keys.delete('ShiftRight')
    }
  })
  window.addEventListener('blur', () => { keys.clear(); justPressedKeys.clear() })
}

export interface InputFrame {
  moveX: number
  moveY: number // 向下為負：用於快速下墜
  held: Record<Btn, boolean>
  pressed: Record<Btn, boolean>
}
const emptyBtns = (): Record<Btn, boolean> => ({ jump: false, attack: false, skill1: false, skill2: false, ult: false, shield: false })
const prev = Object.fromEntries(ALL_FIGHTER_IDS.map((id) => [id, emptyBtns()])) as Record<FighterId, Record<Btn, boolean>>
/** 圓形死區，並重新縮放讓類比輸出平滑 */
function radial(x: number, y: number): [number, number] {
  const m = Math.hypot(x, y)
  if (m < DEADZONE) return [0, 0]
  const k = Math.min(1, (m - DEADZONE) / (1 - DEADZONE)) / m
  return [x * k, y * k]
}
/** P1..P8 對應第 1..8 支手把 */
function padFor(id: FighterId): Gamepad | null {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null
  const pads = [...navigator.getGamepads()].filter((p): p is Gamepad => !!p && p.connected)
  return pads[ALL_FIGHTER_IDS.indexOf(id)] ?? null
}
export function connectedPadCount(): number {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return 0
  return [...navigator.getGamepads()].filter((p) => p && p.connected).length
}
/** 手把震動（受擊回饋） */
export function rumble(id: FighterId, strength: number, ms = 120) {
  const pad: any = padFor(id)
  const act = pad?.vibrationActuator
  if (!act?.playEffect) return
  const m = Math.min(1, strength)
  act.playEffect('dual-rumble', { duration: ms, strongMagnitude: m, weakMagnitude: m * 0.7 }).catch?.(() => {})
}
/** 選單用：回傳該玩家手把的「邊緣觸發」操作（左右 dx、上下 dy：上為 -1） */
const menuPrev = Object.fromEntries(ALL_FIGHTER_IDS.map((id) => [id, { dx: 0, dy: 0, ok: false }])) as Record<FighterId, { dx: number; dy: number; ok: boolean }>
export function readMenuPad(id: FighterId): { dx: number; dy: number; confirm: boolean } {
  const pad = padFor(id)
  if (!pad) return { dx: 0, dy: 0, confirm: false }
  const [ax, ay] = radial(pad.axes[0] ?? 0, pad.axes[1] ?? 0)
  let dx = ax > 0.6 ? 1 : ax < -0.6 ? -1 : 0
  let dy = ay > 0.6 ? 1 : ay < -0.6 ? -1 : 0
  if (Math.abs(ax) > Math.abs(ay)) dy = 0
  else dx = 0
  if (pad.buttons[14]?.pressed) dx = -1
  if (pad.buttons[15]?.pressed) dx = 1
  if (pad.buttons[12]?.pressed) dy = -1
  if (pad.buttons[13]?.pressed) dy = 1
  const ok = !!(pad.buttons[1]?.pressed || pad.buttons[0]?.pressed || pad.buttons[9]?.pressed)
  const p = menuPrev[id]
  const out = { dx: dx !== p.dx ? dx : 0, dy: dy !== p.dy ? dy : 0, confirm: ok && !p.ok }
  menuPrev[id] = { dx, dy, ok }
  return out
}
const anyKey = (list: string[]) => list.some((c) => keys.has(c))

export function readInput(id: FighterId): InputFrame {
  const m = KEYMAP[id]
  let moveX = (anyKey(m.right) ? 1 : 0) - (anyKey(m.left) ? 1 : 0)
  let moveY = (anyKey(m.up) ? 1 : 0) - (anyKey(m.down) ? 1 : 0)
  const held = {} as Record<Btn, boolean>
  for (const b of BTNS) held[b] = anyKey(m[b])
  // 若另一位玩家是電腦，左右 Shift 皆可作為本機玩家的防禦／閃避鍵
  const cpu = useGameStore.getState().cpu
  if (id === 'p1' && cpu.p2 > 0 && keys.has('ShiftRight')) held.shield = true
  if (id === 'p2' && cpu.p1 > 0 && keys.has('ShiftLeft')) held.shield = true
  const pad = padFor(id)
  if (pad) {
    const map = loadMap(pad)
    const std = pad.mapping === 'standard'
    let sx = pad.axes[0] ?? 0, sy = pad.axes[1] ?? 0 // sy：向下為正
    if (map.ax) sx = -(pad.axes[map.ax.i] ?? 0) * map.ax.s
    if (map.ay) sy = -(pad.axes[map.ay.i] ?? 0) * map.ay.s
    const [ax, ay] = radial(sx, sy)
    if (ax !== 0) moveX = ax
    if (ay < -0.7) moveY = 1 // 搖桿上推 = 跳（大亂鬥 tap jump）
    if (ay > 0.5) moveY = -ay
    if (pad.buttons[14]?.pressed) moveX = -1
    if (pad.buttons[15]?.pressed) moveX = 1
    if (pad.buttons[12]?.pressed) moveY = 1
    if (pad.buttons[13]?.pressed) moveY = -1
    if (!std && !map.ax) { // 非標準手把（如單支 Joy-Con）：方向鍵常以 axes[9] 的 hat 值回報
      const h = hatDir(pad)
      if (h >= 0) {
        if ([1, 2, 3].includes(h)) moveX = 1
        if ([5, 6, 7].includes(h)) moveX = -1
        if ([7, 0, 1].includes(h)) moveY = 1
        if ([3, 4, 5].includes(h)) moveY = -1
      }
    }
    for (const b of BTNS) {
      const custom = map.btn?.[b]
      const idxs = custom !== undefined ? [custom] : PAD_BTN[b]
      if (idxs.some((i) => pad.buttons[i]?.pressed || (pad.buttons[i]?.value ?? 0) > 0.25)) held[b] = true
    }
    // 無論是否自訂按鍵，手把 Left Trigger (6) 與 Right Trigger (7) 皆可觸發防禦
    if (pad.buttons[6]?.pressed || (pad.buttons[6]?.value ?? 0) > 0.25 || pad.buttons[7]?.pressed || (pad.buttons[7]?.value ?? 0) > 0.25) {
      held.shield = true
    }
    if (map.btn?.skill2 === undefined && std && Math.hypot(pad.axes[2] ?? 0, pad.axes[3] ?? 0) > 0.6) held.skill2 = true
    if (moveY > 0.7) held.jump = true
  }
  const pressed = {} as Record<Btn, boolean>
  for (const b of BTNS) {
    const tapped = m[b].some((c) => justPressedKeys.has(c))
    pressed[b] = (held[b] && !prev[id][b]) || tapped
    prev[id][b] = held[b]
    for (const c of m[b]) justPressedKeys.delete(c)
  }
  return { moveX: Math.max(-1, Math.min(1, moveX)), moveY, held, pressed }
}

// ------------------------------------------------------------ 手把辨識與自訂綁定
export type PadKind = 'xbox' | 'ps' | 'nintendo' | 'generic'
export function padKind(pad: Gamepad): PadKind {
  const id = pad.id.toLowerCase()
  if (/054c|dualsense|dualshock|playstation|wireless controller/.test(id)) return 'ps'
  if (/057e|nintendo|joy-?con|pro controller|switch/.test(id)) return 'nintendo'
  if (/xbox|xinput|045e/.test(id)) return 'xbox'
  return 'generic'
}
export interface PadMap {
  ax?: { i: number; s: number }
  ay?: { i: number; s: number }
  btn?: Partial<Record<Btn, number>>
}
const MAP_PREFIX = 'smash.padmap:'
export function loadMap(pad: Gamepad): PadMap {
  try { return JSON.parse(localStorage.getItem(MAP_PREFIX + pad.id) ?? '{}') as PadMap } catch { return {} }
}
export function saveMap(pad: Gamepad, m: PadMap) {
  try { localStorage.setItem(MAP_PREFIX + pad.id, JSON.stringify(m)) } catch { /* ignore */ }
}
export function clearMap(pad: Gamepad) {
  try { localStorage.removeItem(MAP_PREFIX + pad.id) } catch { /* ignore */ }
}
/** 非標準手把的 hat 方向：0=上 1=右上 2=右 3=右下 4=下 5=左下 6=左 7=左上，-1=無 */
function hatDir(pad: Gamepad): number {
  if (pad.axes.length < 10) return -1
  const h = pad.axes[9]
  if (h === undefined || h > 1.1) return -1
  return Math.round((h + 1) * 3.5)
}
export function getPad(id: FighterId): Gamepad | null { return padFor(id) }
export function describePad(id: FighterId): { name: string; kind: PadKind; standard: boolean; custom: boolean } | null {
  const p = padFor(id)
  if (!p) return null
  return { name: p.id.replace(/\s*\(.*$/, '').slice(0, 32) || 'Gamepad', kind: padKind(p), standard: p.mapping === 'standard', custom: !!loadMap(p).btn || !!loadMap(p).ax }
}

/** 綁定精靈用：偵測「下一個」新輸入（按鈕或搖桿軸） */
export interface CaptureBase { pressed: Set<number>; axes: number[] }
export function captureBase(id: FighterId): CaptureBase {
  const p = padFor(id)
  return { pressed: new Set((p?.buttons ?? []).flatMap((b, i) => (b.pressed ? [i] : []))), axes: [...(p?.axes ?? [])] }
}
export function captureButton(id: FighterId, base: CaptureBase): number | null {
  const p = padFor(id)
  if (!p) return null
  for (let i = 0; i < p.buttons.length; i++) {
    const on = p.buttons[i].pressed
    if (!on) base.pressed.delete(i)
    else if (!base.pressed.has(i)) return i
  }
  return null
}
export function captureAxis(id: FighterId, base: CaptureBase): { i: number; s: number } | null {
  const p = padFor(id)
  if (!p) return null
  const skipHat = p.mapping !== 'standard' && p.axes.length >= 10
  for (let i = 0; i < p.axes.length; i++) {
    if (skipHat && i === 9) continue
    const d = p.axes[i] - (base.axes[i] ?? 0)
    if (Math.abs(d) > 0.7) return { i, s: Math.sign(d) }
  }
  return null
}

/** 暫停：Esc / P / 任一手把 Start(+) 切換；暫停中按手把 A 或 B 也可繼續 */
const padPrev = new Map<number, { start: boolean; ok: boolean }>()
export function pollPause(): { toggle: boolean; confirm: boolean } {
  let toggle = debugKeys.pause
  debugKeys.pause = false
  let confirm = false
  if (typeof navigator !== 'undefined' && navigator.getGamepads) {
    for (const p of navigator.getGamepads()) {
      if (!p || !p.connected) continue
      const start = !!p.buttons[9]?.pressed
      const ok = !!(p.buttons[0]?.pressed || p.buttons[1]?.pressed)
      const prev = padPrev.get(p.index) ?? { start: false, ok: false }
      if (start && !prev.start) toggle = true
      if (ok && !prev.ok) confirm = true
      padPrev.set(p.index, { start, ok })
    }
  }
  return { toggle, confirm }
}
